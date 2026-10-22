<#
  Nixi offline speech worker.

  Runs Windows' built-in SAPI recogniser (System.Speech) so Nixi can hear you
  without sending a single byte of audio to the internet.

  Modes
    wake     listen for the wake phrase ("hey nixi"), then capture one command
    dictate  free dictation, every finished utterance is emitted
    once     recognise exactly one utterance and exit

  Protocol - one JSON object per line on stdout.
    {"type":"ready","mode":"wake"}
    {"type":"wake"}
    {"type":"text","text":"...","final":true}
    {"type":"error","message":"..."}
    {"type":"bye"}

  The host app controls the worker by writing a small JSON state file that the
  worker re-reads on every tick, so switching modes costs nothing.
#>
[CmdletBinding()]
param(
  [ValidateSet('wake', 'dictate', 'once')]
  [string]$Mode = 'wake',
  [string]$Culture = 'en-US',
  [string]$WakePhrase = 'hey nixi',
  [string]$StateFile = ''
)

$ErrorActionPreference = 'Stop'

$script:running = $true
$script:mode = $Mode
$script:wakePhrase = $WakePhrase
$script:listen = $true
$script:capturing = $false
$script:appActive = $false
$script:gen = -1
$script:buffer = ''
$script:lastSpeech = [DateTime]::UtcNow

function Send-Event {
  param([hashtable]$Data)
  try {
    $line = $Data | ConvertTo-Json -Compress -Depth 4
    [Console]::Out.WriteLine($line)
    [Console]::Out.Flush()
  } catch { }
}

function Write-Log {
  param([string]$Text)
  try { [Console]::Error.WriteLine($Text); [Console]::Error.Flush() } catch { }
}

function Normalize {
  param([string]$Text)
  if (-not $Text) { return '' }
  $t = $Text.ToLowerInvariant()
  $t = $t -replace '[^a-z0-9\s]', ' '
  $t = $t -replace '\s+', ' '
  return $t.Trim()
}

function Get-EditDistance {
  param([string]$A, [string]$B)
  if ($A -eq $B) { return 0 }
  if (-not $A) { return $B.Length }
  if (-not $B) { return $A.Length }
  $prev = 0..$B.Length
  for ($i = 1; $i -le $A.Length; $i++) {
    $cur = New-Object int[] ($B.Length + 1)
    $cur[0] = $i
    for ($j = 1; $j -le $B.Length; $j++) {
      $cost = if ($A[$i - 1] -eq $B[$j - 1]) { 0 } else { 1 }
      $m = $prev[$j] + 1
      $n = $cur[$j - 1] + 1
      $d = $prev[$j - 1] + $cost
      $cur[$j] = [Math]::Min([Math]::Min($m, $n), $d)
    }
    $prev = $cur
  }
  return $prev[$B.Length]
}

function Test-SameWord {
  param([string]$A, [string]$B)
  if ($A -eq $B) { return $true }
  if ($A.Length -lt 3 -or $B.Length -lt 3) { return $false }
  if ($A.Substring(0, 3) -eq $B.Substring(0, 3)) { return $true }
  return ((Get-EditDistance $A $B) -le 1)
}

# Finds the wake phrase inside a spoken sentence and returns the index of its
# first word, or -1. The match tolerates a misheard syllable ("hey nicki").
function Find-WakeIndex {
  param([string]$Text, [string]$Phrase)
  $n = Normalize $Text
  $w = Normalize $Phrase
  if (-not $n -or -not $w) { return -1 }
  $nt = $n.Split(' ')
  $wt = $w.Split(' ')
  if ($wt.Length -eq 0) { return -1 }
  for ($i = 0; $i -le $nt.Length - $wt.Length; $i++) {
    $ok = $true
    for ($j = 0; $j -lt $wt.Length; $j++) {
      if (-not (Test-SameWord $nt[$i + $j] $wt[$j])) { $ok = $false; break }
    }
    if ($ok) { return $i }
  }
  return -1
}

function Read-State {
  if (-not $StateFile) { return }
  try {
    if (-not (Test-Path -LiteralPath $StateFile)) { return }
    $raw = Get-Content -LiteralPath $StateFile -Raw -ErrorAction Stop
    if (-not $raw) { return }
    $st = $raw | ConvertFrom-Json
    if ($st.mode -and $st.mode -ne $script:mode) {
      $script:mode = [string]$st.mode
      $script:capturing = $false
      $script:buffer = ''
    }
    if ($st.wake -and $st.wake -ne $script:wakePhrase) { $script:wakePhrase = [string]$st.wake }
    if ($null -ne $st.listen) { $script:listen = [bool]$st.listen }

    # A new capture session (the app bumped "gen") always starts with an
    # empty buffer, but the buffer must NOT be wiped on every tick or the
    # utterance would never be completed.
    if ($null -ne $st.gen) {
      $g = [int]$st.gen
      if ($g -ne $script:gen) {
        $script:gen = $g
        $script:capturing = $false
        $script:buffer = ''
        $script:lastSpeech = [DateTime]::UtcNow
      }
    }

    if ($st.capturing -eq $true) {
      $script:appActive = $true
      if (-not $script:capturing) {
        $script:capturing = $true
        $script:buffer = ''
        $script:lastSpeech = [DateTime]::UtcNow
      }
    }
    elseif ($script:appActive) {
      # the key was released - flush whatever was said
      $script:appActive = $false
      if ($script:capturing) {
        if ($script:buffer.Trim()) {
          Send-Event @{ type = 'text'; text = $script:buffer.Trim(); final = $true }
        }
        $script:capturing = $false
        $script:buffer = ''
      }
    }
  } catch { }
}

# ------------------------------------------------------------------- engine
Add-Type -AssemblyName System.Speech

$engine = $null
try {
  $engine = New-Object System.Speech.Recognition.SpeechRecognitionEngine
  $engine.SetInputToDefaultAudioDevice()
} catch {
  Send-Event @{ type = 'error'; message = 'No microphone available for offline speech recognition.' }
  Send-Event @{ type = 'bye' }
  exit 1
}

$engine.LoadGrammar((New-Object System.Speech.Recognition.DictationGrammar))

$wakeGrammar = $null
$wakeGramNorm = ''
try {
  $gb = New-Object System.Speech.Recognition.GrammarBuilder
  $gb.Culture = [System.Globalization.CultureInfo]::new($Culture)
  $gb.Append($WakePhrase)
  $wakeGrammar = New-Object System.Speech.Recognition.Grammar($gb)
  $engine.LoadGrammar($wakeGrammar)
  $wakeGramNorm = Normalize $WakePhrase
} catch {
  Write-Log ('wake grammar unavailable: ' + $_.Exception.Message)
}

Send-Event @{ type = 'ready'; mode = $script:mode }

# --------------------------------------------------------------- main loop
$silenceMs = 1300

try {
  while ($script:running) {
    Read-State

    $res = $null
    try { $res = $engine.Recognize([TimeSpan]::FromMilliseconds(500)) }
    catch {
      $inner = $_.Exception
      while ($inner -and $inner.InnerException) { $inner = $inner.InnerException }
      if ($inner -is [System.TimeoutException]) { $res = $null }
      else {
        Send-Event @{ type = 'error'; message = $_.Exception.Message }
        break
      }
    }

    if ($res) {
      $script:lastSpeech = [DateTime]::UtcNow
      $text = ($res.Text -replace '\s+', ' ').Trim()
      $norm = Normalize $text
      $wakeNorm = Normalize $script:wakePhrase

      $isWake = $false
      $wakeIdx = -1
      $wakeTokens = 0
      if ($wakeGrammar -and $res.Grammar -eq $wakeGrammar -and $wakeGramNorm -eq $wakeNorm) {
        $isWake = $true
      }
      elseif ($wakeNorm) {
        $wakeIdx = Find-WakeIndex $norm $wakeNorm
        if ($wakeIdx -ge 0) { $isWake = $true; $wakeTokens = $wakeNorm.Split(' ').Length }
      }

      if ($script:mode -eq 'wake') {
        if ($isWake -and $script:listen) {
          Send-Event @{ type = 'wake' }
          $rest = ''
          if ($wakeTokens -gt 0) {
            # cut the wake phrase off the front of the sentence
            $ms = [regex]::Matches($text, '\b\w+\b')
            $last = $wakeIdx + $wakeTokens - 1
            if ($last -lt 0) { $last = 0 }
            if ($ms.Count -gt $last) {
              $end = $ms[$last].Index + $ms[$last].Length
              $rest = $text.Substring($end).Trim()
            }
          }
          elseif ($wakeNorm -and $text.Length -gt $wakeNorm.Length) {
            $idx = $text.IndexOf($script:wakePhrase, [StringComparison]::OrdinalIgnoreCase)
            if ($idx -ge 0) { $rest = $text.Substring($idx + $script:wakePhrase.Length).Trim() }
            else { $rest = $text.Substring($wakeNorm.Length).Trim() }
          }
          if ($rest) {
            Send-Event @{ type = 'text'; text = $rest; final = $true }
          } else {
            $script:capturing = $true
            $script:buffer = ''
            # give the user a beat to start talking after the wake word
            $script:lastSpeech = [DateTime]::UtcNow.AddMilliseconds(2200)
          }
        }
        else {
          # push-to-talk: drop a leading wake phrase so the command is clean
          $clean = $text
          if (-not $script:listen -and $wakeNorm) {
            $idx2 = Find-WakeIndex (Normalize $text) $wakeNorm
            if ($idx2 -ge 0) {
              $ms2 = [regex]::Matches($text, '\b\w+\b')
              $last2 = $idx2 + $wakeNorm.Split(' ').Length - 1
              if ($ms2.Count -gt $last2) {
                $clean = $text.Substring($ms2[$last2].Index + $ms2[$last2].Length).Trim()
              }
            }
          }
          if ($script:capturing -and $clean) {
            $script:buffer = ($script:buffer + ' ' + $clean).Trim()
          }
        }
      }
      elseif ($script:mode -eq 'dictate') {
        Send-Event @{ type = 'text'; text = $text; final = $true }
      }
      elseif ($script:mode -eq 'once') {
        Send-Event @{ type = 'text'; text = $text; final = $true }
        break
      }
      continue
    }

    # no utterance this tick -> silence
    if ($script:capturing) {
      $idle = ([DateTime]::UtcNow - $script:lastSpeech).TotalMilliseconds
      if ($idle -ge $silenceMs) {
        if ($script:buffer.Trim()) {
          Send-Event @{ type = 'text'; text = $script:buffer.Trim(); final = $true }
        }
        $script:capturing = $false
        $script:buffer = ''
      }
    }
  }
} finally {
  try { $engine.Dispose() } catch { }
  Send-Event @{ type = 'bye' }
}
