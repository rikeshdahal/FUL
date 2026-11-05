<#
  FUL Video Inspector and Liker.
  Inspects the active window, detects the video platform (YouTube, TikTok, Instagram, Twitter/X, etc.),
  and executes the like action via UI Automation, native shortcuts, or coordinates.
#>
param(
  [int]$ClickX = -1,
  [int]$ClickY = -1,
  [string]$Platform = ''
)

$ErrorActionPreference = 'SilentlyContinue'

try {
  # 1) If explicit ClickX and ClickY are provided (e.g. from Vision locator), click directly
  if ($ClickX -gt 0 -and $ClickY -gt 0) {
    $mouseScript = Join-Path $PSScriptRoot '..\mouse.ps1'
    if (Test-Path $mouseScript) {
      & powershell -NoProfile -ExecutionPolicy Bypass -File $mouseScript -Action click -X $ClickX -Y $ClickY
      Write-Output "Liked video."
      exit 0
    }
  }

  $ws = New-Object -ComObject WScript.Shell

  # 2) Find and activate browser window (YouTube/TikTok/Instagram/Chrome/Edge/Brave/Firefox)
  $browserProc = Get-Process | Where-Object { 
    $_.MainWindowTitle -match 'YouTube|TikTok|Instagram|Chrome|Edge|Brave|Firefox' -or
    $_.ProcessName -match 'chrome|msedge|brave|firefox'
  } | Select-Object -First 1

  if ($browserProc -and $browserProc.MainWindowHandle -ne [IntPtr]::Zero) {
    try {
      $ws.AppActivate($browserProc.Id)
      Start-Sleep -Milliseconds 400
    } catch {}
  }

  # 3) Inspect active foreground window
  $activeScript = Join-Path $PSScriptRoot '..\active-app.ps1'
  $active = $null
  if (Test-Path $activeScript) {
    try {
      $jsonRaw = & powershell -NoProfile -ExecutionPolicy Bypass -File $activeScript
      $active = $jsonRaw | ConvertFrom-Json
    } catch {}
  }

  $title = if ($active -and $active.title) { $active.title } else { '' }
  $app = if ($active -and $active.app) { $active.app } else { '' }
  $comb = "$title $app $Platform".ToLower()

  # 4) Platform-specific shortcuts
  if ($comb -match 'tiktok') {
    # TikTok web has standard 'l' key to like active video
    $ws.SendKeys('l')
    Write-Output "Liked video on TikTok."
    exit 0
  }

  # 5) Try UI Automation to find like button in Chromium/browser window
  try {
    Add-Type -AssemblyName UIAutomationClient
    Add-Type -AssemblyName UIAutomationTypes
    Add-Type -AssemblyName System.Windows.Forms

    $cond = New-Object System.Windows.Automation.PropertyCondition(
      [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
      [System.Windows.Automation.ControlType]::Button
    )

    $focus = [System.Windows.Automation.AutomationElement]::FocusedElement
    if ($focus) {
      $allButtons = $focus.FindAll([System.Windows.Automation.TreeScope]::Descendants, $cond)
      $targetBtn = $null
      foreach ($b in $allButtons) {
        $n = $b.Current.Name
        $h = $b.Current.HelpText
        if ($n -match '(?i)\blike\b' -or $h -match '(?i)\blike\b') {
          $targetBtn = $b
          break
        }
      }

      if ($targetBtn) {
        $pattern = $null
        if ($targetBtn.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$pattern)) {
          $pattern.Invoke()
          Write-Output "Liked video."
          exit 0
        } else {
          $rect = $targetBtn.Current.BoundingRectangle
          if ($rect -and $rect.Width -gt 0) {
            $cx = [int]($rect.X + ($rect.Width / 2))
            $cy = [int]($rect.Y + ($rect.Height / 2))
            $mouseScript = Join-Path $PSScriptRoot '..\mouse.ps1'
            if (Test-Path $mouseScript) {
              & powershell -NoProfile -ExecutionPolicy Bypass -File $mouseScript -Action click -X $cx -Y $cy
              Write-Output "Liked video."
              exit 0
            }
          }
        }
      }
    }
  } catch {}

  # 6) If YouTube is active, try YouTube player like shortcut or focus
  if ($comb -match 'youtube') {
    Write-Output "Focused YouTube video: '$title'."
    exit 0
  }

  Write-Output "Could not find Like button on screen."
} catch {
  Write-Output "Could not find Like button on screen."
}
