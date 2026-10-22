<#
  Nixi "now playing" reader.

  Uses the Windows SMTC (GlobalSystemMediaTransportControlsSessionManager) API to
  read the title, artist, album, app and playback position of whatever music
  app is currently playing. Purely local - nothing leaves the PC.

  Usage:  powershell -File media.ps1
  Output: one JSON object on stdout.
#>
param(
  [string]$Action = 'get',
  [double]$Position = 0
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() |
  Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
  })[0]

function Await-Operation {
  param($Operation, $ResultType)
  $task = $asTaskGeneric.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
  return $task.GetAwaiter().GetResult()
}


$statusNames = @{ 0 = 'none'; 1 = 'changing'; 2 = 'stopped'; 3 = 'playing'; 4 = 'paused' }

$result = [ordered]@{
  playing = $false
  title   = ''
  artist  = ''
  album   = ''
  app     = ''
  status  = 'none'
  position = 0
  duration = 0
  source  = 'none'
}

try {
  $managerType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
  $manager = Await-Operation ($managerType::RequestAsync()) $managerType
  $session = $manager.GetCurrentSession()

  if ($session) {
    if ($Action -and $Action.ToLower() -ne 'get') {
      try {
        switch ($Action.ToLower()) {
          'playpause' { $op = $session.TryTogglePlayPauseAsync(); Await-Operation $op ([bool]) | Out-Null }
          'play'      { $op = $session.TryPlayAsync(); Await-Operation $op ([bool]) | Out-Null }
          'pause'     { $op = $session.TryPauseAsync(); Await-Operation $op ([bool]) | Out-Null }
          'next'      { $op = $session.TrySkipNextAsync(); Await-Operation $op ([bool]) | Out-Null }
          'prev'      { $op = $session.TrySkipPreviousAsync(); Await-Operation $op ([bool]) | Out-Null }
          'seek'      {
            $ticks = [long]($Position * 10000000)
            $op = $session.TryChangePlaybackPositionAsync($ticks)
            Await-Operation $op ([bool]) | Out-Null
          }
        }
      } catch { }
      Start-Sleep -Milliseconds 120
    }

    $timeline = $session.GetTimelineProperties()
    $playback = $session.GetPlaybackInfo()

    try {
      $mediaPropType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType = WindowsRuntime]
      $mediaProps = Await-Operation ($session.TryGetMediaPropertiesAsync()) $mediaPropType
      if ($mediaProps) {
        $result.title = [string]$mediaProps.Title
        $result.artist = [string]$mediaProps.Artist
        $result.album = [string]$mediaProps.AlbumTitle
      }
    } catch { }

    $result.source = 'smtc'

    try {
      $appId = [string]$session.SourceAppUserModelId
      if ($appId -match 'Brave') { $result.app = 'Brave' }
      elseif ($appId -match 'Spotify') { $result.app = 'Spotify' }
      elseif ($appId -match 'Chrome') { $result.app = 'Chrome' }
      elseif ($appId -match 'Edge') { $result.app = 'Edge' }
      elseif ($appId -match 'Discord') { $result.app = 'Discord' }
      elseif ($appId) { $result.app = $appId.Split('!')[-1] }
    } catch { }

    $status = [int]$playback.PlaybackStatus
    $result.status = if ($statusNames.ContainsKey($status)) { $statusNames[$status] } else { 'none' }

    $pos = $timeline.Position
    try {
      $result.position = [double]$pos.TotalSeconds
      if ($timeline.MaxSeekTime -and $timeline.MaxSeekTime.TotalSeconds -gt 0) {
        $result.duration = [double]$timeline.MaxSeekTime.TotalSeconds
      }
    } catch { }

    $result.playing = ($result.status -eq 'playing' -and [bool]($result.title -and $result.title.Trim()))
  }
} catch {
  # SMTC unavailable - fall back to reading media window titles below.
}

if (-not $result.playing -and -not $result.title) {
  # Fallback: media apps that put the song name in the window title.
  $map = @{
    'Spotify' = 'Spotify'
    'Spotify.exe' = 'Spotify'
    'chrome' = 'Chrome'
    'msedge' = 'Edge'
    'firefox' = 'Firefox'
    'vlc' = 'VLC'
    'MediaPlayer' = 'Media Player'
    'foobar2000' = 'foobar2000'
    'AIMP' = 'AIMP'
    'wmplayer' = 'Media Player'
  }
  foreach ($proc in (Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle })) {
    $title = $proc.MainWindowTitle
    if (-not $title) { continue }
    $app = $map[$proc.ProcessName]
    if (-not $app) {
      if ($proc.ProcessName -notmatch 'chrome|msedge|firefox|brave|zen|Spotify') { continue }
      if ($proc.ProcessName -match 'chrome|msedge|firefox|brave|zen' -and $title -notmatch 'YouTube|SoundCloud|Bandcamp|Spotify|Music|Audio|Podcast|Devdas|Video') { continue }
      $app = $proc.ProcessName
    }
    $song = $title -replace '^(Spotify\s*-\s*|Now Playing\s*[:\-]?\s*|YouTube\s*-\s*|Playing\s*[:\-]?\s*)', ''
    $parts = $song -split '\s+-\s+'
    if ($parts.Count -ge 2) {
      $result.title = $parts[0].Trim()
      $result.artist = $parts[1].Trim()
    } else {
      $result.title = $song.Trim()
      $result.artist = ''
    }
    $result.app = $app
    $result.status = 'playing'
    $result.playing = $true
    $result.source = 'window'
    break
  }
}

$result | ConvertTo-Json -Compress
