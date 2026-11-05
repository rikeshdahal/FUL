<#
  FUL window management utility.
  Controls application windows on Windows (minimize, maximize, restore, close, snap left/right, switch focus).
#>
param(
  [string]$Action = 'minimize',
  [string]$Target = ''
)

$ErrorActionPreference = 'SilentlyContinue'

if (-not ('WinManager' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class WinManager {
  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();

  [DllImport("user32.dll")]
  [return: MarshalAs(UnmanagedType.Bool)]
  public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);

  [DllImport("user32.dll")]
  [return: MarshalAs(UnmanagedType.Bool)]
  public static extern bool SetForegroundWindow(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern IntPtr PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

  public const int SW_HIDE = 0;
  public const int SW_NORMAL = 1;
  public const int SW_MINIMIZE = 6;
  public const int SW_MAXIMIZE = 3;
  public const int SW_RESTORE = 9;
  public const uint WM_CLOSE = 0x0010;
}
'@
}

$act = $Action.ToLower()
$hwnd = [IntPtr]::Zero

if ($Target) {
  $p = Get-Process | Where-Object { ($_.ProcessName -match $Target -or $_.MainWindowTitle -match $Target) -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1
  if ($p) { $hwnd = $p.MainWindowHandle }
}

if ($hwnd -eq [IntPtr]::Zero) {
  $hwnd = [WinManager]::GetForegroundWindow()
}

if ($hwnd -eq [IntPtr]::Zero) {
  Write-Output "No target window found."
  exit 0
}

if ($act -eq 'minimize') {
  [void][WinManager]::ShowWindowAsync($hwnd, [WinManager]::SW_MINIMIZE)
  Write-Output "Minimized window."
} elseif ($act -eq 'maximize') {
  [void][WinManager]::ShowWindowAsync($hwnd, [WinManager]::SW_MAXIMIZE)
  Write-Output "Maximized window."
} elseif ($act -eq 'restore' -or $act -eq 'normal') {
  [void][WinManager]::ShowWindowAsync($hwnd, [WinManager]::SW_RESTORE)
  Write-Output "Restored window."
} elseif ($act -eq 'close') {
  [void][WinManager]::PostMessage($hwnd, [WinManager]::WM_CLOSE, [IntPtr]::Zero, [IntPtr]::Zero)
  Write-Output "Closed window."
} elseif ($act -eq 'switch' -or $act -eq 'focus') {
  [void][WinManager]::SetForegroundWindow($hwnd)
  Write-Output "Switched to window."
} elseif ($act -eq 'snap_left' -or $act -eq 'snap-left') {
  [void][WinManager]::SetForegroundWindow($hwnd)
  $ws = New-Object -ComObject WScript.Shell
  $ws.SendKeys("#{LEFT}")
  Write-Output "Snapped window left."
} elseif ($act -eq 'snap_right' -or $act -eq 'snap-right') {
  [void][WinManager]::SetForegroundWindow($hwnd)
  $ws = New-Object -ComObject WScript.Shell
  $ws.SendKeys("#{RIGHT}")
  Write-Output "Snapped window right."
} else {
  Write-Output "Unknown window action: $Action"
}

