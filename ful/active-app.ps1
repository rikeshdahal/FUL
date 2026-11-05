$ErrorActionPreference = 'SilentlyContinue'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class WinFocus {
  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();

  [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

  [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
  public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

  [DllImport("user32.dll", SetLastError = true)]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

  [DllImport("user32.dll")]
  public static extern IntPtr GetWindow(IntPtr hWnd, uint uCmd);

  [DllImport("user32.dll")]
  public static extern IntPtr GetTopWindow(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern int GetWindowLong(IntPtr hWnd, int nIndex);

  [DllImport("user32.dll")]
  [return: MarshalAs(UnmanagedType.Bool)]
  public static extern bool IsWindowVisible(IntPtr hWnd);
}
'@

$res = [ordered]@{
  process = ""
  title = ""
  app = ""
  icon = "icons/explorer.png"
  exePath = ""
}

$myPid = [System.Diagnostics.Process]::GetCurrentProcess().Id
$skipProcs = '^(electron|powershell|pwsh|conhost|cmd|ful[-_. ]?companion|ful)$'
$skipClasses = @(
  'Shell_TrayWnd',
  'Shell_SecondaryTrayWnd',
  'Progman',
  'WorkerW',
  'Windows.UI.Core.CoreWindow',
  'ApplicationManager_DesktopShellWindow',
  'TaskListThumbnailWnd',
  'DV2ControlHost',
  'NotifyIconOverflowWindow',
  'TopLevelWindowForOverflowXamlIsland',
  'XamlExplorerHostIslandWindow'
)

function Get-AppWindow([IntPtr]$hwnd) {
  if (-not $hwnd -or $hwnd -eq [IntPtr]::Zero) { return $null }
  if (-not [WinFocus]::IsWindowVisible($hwnd)) { return $null }

  $exStyle = [WinFocus]::GetWindowLong($hwnd, -20)
  if (($exStyle -band 0x00000080) -ne 0) { return $null }
  if (($exStyle -band 0x08000000) -ne 0) { return $null }

  $titleBuilder = New-Object System.Text.StringBuilder 512
  [void][WinFocus]::GetWindowText($hwnd, $titleBuilder, 512)
  $title = $titleBuilder.ToString().Trim()
  if (-not $title) { return $null }
  if ($title -match '^(Program Manager|FUL)$') { return $null }

  $classBuilder = New-Object System.Text.StringBuilder 256
  [void][WinFocus]::GetClassName($hwnd, $classBuilder, 256)
  $className = $classBuilder.ToString()
  if ($skipClasses -contains $className) { return $null }

  $procId = 0
  [void][WinFocus]::GetWindowThreadProcessId($hwnd, [ref]$procId)
  if ($procId -le 0 -or $procId -eq $myPid) { return $null }

  $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
  if (-not $proc) { return $null }
  if ($proc.ProcessName -match $skipProcs) { return $null }
  if ($proc.MainWindowTitle -match '^(FUL)') { return $null }

  return [pscustomobject]@{
    Process = $proc
    Title = $title
    Class = $className
  }
}

$appWindow = Get-AppWindow ([WinFocus]::GetForegroundWindow())

# When FUL itself has focus, walk the window Z-order and take the most
# recently used app window sitting directly behind it.
if (-not $appWindow) {
  $hwnd = [WinFocus]::GetTopWindow([IntPtr]::Zero)
  for ($i = 0; $i -lt 250 -and $hwnd -ne [IntPtr]::Zero; $i++) {
    $candidate = Get-AppWindow $hwnd
    if ($candidate) {
      $appWindow = $candidate
      break
    }
    $hwnd = [WinFocus]::GetWindow($hwnd, 2)
  }
}

# Last resort: the most recently started process with a visible main window.
if (-not $appWindow) {
  $proc = Get-Process -ErrorAction SilentlyContinue |
    Where-Object {
      $_.MainWindowHandle -and
      $_.MainWindowHandle -ne 0 -and
      $_.ProcessName -notmatch $skipProcs
    } |
    Sort-Object StartTime -Descending |
    Select-Object -First 1

  if ($proc) {
    $appWindow = [pscustomobject]@{
      Process = $proc
      Title = $proc.MainWindowTitle
      Class = ""
    }
  }
}

if ($appWindow) {
  $proc = $appWindow.Process
  $res.process = $proc.ProcessName
  $res.title = $appWindow.Title
  $res.app = $proc.ProcessName
  $res.exePath = $proc.Path
  if (-not $res.exePath) { $res.exePath = $proc.MainModule.FileName }
}

$pLower = ($res.process + " " + $res.title).ToLower()
if ($pLower -match 'antigravity') {
  $res.app = 'Antigravity IDE'
  $res.icon = 'icons/antigravity.png'
} elseif ($pLower -match 'instagram') {
  $res.app = 'Instagram'
  $res.icon = 'icons/instagram.png'
} elseif ($pLower -match 'youtube') {
  $res.app = 'YouTube'
  $res.icon = 'icons/youtube.png'
} elseif ($pLower -match 'facebook') {
  $res.app = 'Facebook'
  $res.icon = 'icons/facebook.png'
} elseif ($pLower -match 'soundcloud') {
  $res.app = 'SoundCloud'
  $res.icon = 'icons/soundcloud.png'
} elseif ($pLower -match 'explorer|file explorer') {
  $res.app = 'File Explorer'
  $res.icon = 'icons/explorer.png'
} elseif ($pLower -match 'code|visual studio code') {
  $res.app = 'VS Code'
  $res.icon = 'icons/vscode.png'
} elseif ($pLower -match 'cursor') {
  $res.app = 'Cursor'
  $res.icon = 'icons/cursor.png'
} elseif ($pLower -match 'chrome') {
  $res.app = 'Chrome'
  $res.icon = 'icons/chrome.png'
} elseif ($pLower -match 'brave') {
  $res.app = 'Brave'
  $res.icon = 'icons/brave.png'
} elseif ($pLower -match 'msedge|edge') {
  $res.app = 'Edge'
  $res.icon = 'icons/edge.png'
} elseif ($pLower -match 'spotify') {
  $res.app = 'Spotify'
  $res.icon = 'icons/spotify.png'
} elseif ($pLower -match 'discord') {
  $res.app = 'Discord'
  $res.icon = 'icons/discord.png'
} elseif ($pLower -match 'excel') {
  $res.app = 'Excel'
  $res.icon = 'icons/excel.png'
} elseif ($pLower -match 'winword|word') {
  $res.app = 'Word'
  $res.icon = 'icons/word.png'
} elseif ($pLower -match 'powerpnt|powerpoint') {
  $res.app = 'PowerPoint'
  $res.icon = 'icons/powerpoint.png'
} elseif ($pLower -match 'obsidian') {
  $res.app = 'Obsidian'
  $res.icon = 'icons/obsidian.png'
} elseif ($pLower -match 'outlook') {
  $res.app = 'Outlook'
  $res.icon = 'icons/outlook.png'
} elseif ($pLower -match 'zoom') {
  $res.app = 'Zoom'
  $res.icon = 'icons/zoom.png'
} else {
  $res.app = if ($res.process) { $res.process } else { 'File Explorer' }
  $res.icon = 'icons/explorer.png'
}

$res | ConvertTo-Json -Compress
