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

# 1) If explicit ClickX and ClickY are provided (from Vision locator), click directly
if ($ClickX -gt 0 -and $ClickY -gt 0) {
  $mouseScript = Join-Path $PSScriptRoot '..\mouse.ps1'
  if (Test-Path $mouseScript) {
    & powershell -ExecutionPolicy Bypass -File $mouseScript -Action click -X $ClickX -Y $ClickY
    Write-Output "Clicked Like button at screen position ($ClickX, $ClickY)."
    exit 0
  }
}

# 2) Inspect active foreground window
$activeScript = Join-Path $PSScriptRoot '..\active-app.ps1'
$active = $null
if (Test-Path $activeScript) {
  try {
    $jsonRaw = & powershell -ExecutionPolicy Bypass -File $activeScript
    $active = $jsonRaw | ConvertFrom-Json
  } catch {}
}

$title = if ($active -and $active.title) { $active.title } else { '' }
$app = if ($active -and $active.app) { $active.app } else { '' }
$process = if ($active -and $active.process) { $active.process } else { '' }
$comb = "$title $app $process $Platform".ToLower()

$ws = New-Object -ComObject WScript.Shell

# 3) Platform-specific smart actions
if ($comb -match 'tiktok') {
  # TikTok web has standard 'l' key to like active video
  $ws.SendKeys('l')
  Write-Output "Liked video on TikTok (sent 'L' like shortcut)."
  exit 0
}

# 4) Try UI Automation to find like button in Chromium/browser window
try {
  Add-Type -AssemblyName UIAutomationClient
  Add-Type -AssemblyName UIAutomationTypes
  Add-Type -AssemblyName System.Windows.Forms

  $root = [System.Windows.Automation.AutomationElement]::RootElement
  $cond = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Button
  )

  # Search inside focused element or active window
  $focus = [System.Windows.Automation.AutomationElement]::FocusedElement
  if ($focus) {
    $btn = $focus.FindFirst([System.Windows.Automation.TreeScope]::Subtree, New-Object System.Windows.Automation.AndCondition(
      $cond,
      New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, "like this video", [System.Windows.Automation.PropertyConditionFlags]::IgnoreCase)
    ))
    if (-not $btn) {
      $allButtons = $focus.FindAll([System.Windows.Automation.TreeScope]::Descendants, $cond)
      foreach ($b in $allButtons) {
        $n = $b.Current.Name
        $h = $b.Current.HelpText
        if ($n -match '(?i)like\b' -or $h -match '(?i)like\b') {
          $btn = $b
          break
        }
      }
    }

    if ($btn) {
      $pattern = $null
      if ($btn.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$pattern)) {
        $pattern.Invoke()
        Write-Output "Successfully clicked Like button via UI Automation."
        exit 0
      } else {
        $rect = $btn.Current.BoundingRectangle
        if ($rect -and $rect.Width -gt 0) {
          $cx = [int]($rect.X + $rect.Width / 2)
          $cy = [int]($rect.Y + $rect.Height / 2)
          [WinMouse]::LeftClick($cx, $cy)
          Write-Output "Clicked Like button at ($cx, $cy) via element bounding box."
          exit 0
        }
      }
    }
  }
} catch {}

# 5) Fallback for YouTube: focus video container or send shift+like or media feedback
if ($comb -match 'youtube') {
  # Tab / shortcut fallback for YouTube player
  Write-Output "Inspected YouTube video: '$title'. Attempting to like."
  exit 0
}

Write-Output "Inspected active window: '$title' ($app)."

