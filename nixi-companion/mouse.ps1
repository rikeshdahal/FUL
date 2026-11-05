<#
  FUL mouse control utility.
  Allows FUL to click, double-click, right-click, move, and scroll anywhere on screen.
#>
param(
  [string]$Action = 'click',
  [int]$X = -1,
  [int]$Y = -1,
  [int]$Amount = 0
)

$ErrorActionPreference = 'SilentlyContinue'

if (-not ('WinMouse' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class WinMouse {
  [DllImport("user32.dll")]
  public static extern void mouse_event(uint dwFlags, uint dx, uint dy, int dwData, UIntPtr dwExtraInfo);

  [DllImport("user32.dll")]
  public static extern bool SetCursorPos(int X, int Y);

  [DllImport("user32.dll")]
  public static extern bool GetCursorPos(out POINT lpPoint);

  public struct POINT { public int X; public int Y; }

  public const uint MOUSEEVENTF_MOVE = 0x0001;
  public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
  public const uint MOUSEEVENTF_LEFTUP = 0x0004;
  public const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
  public const uint MOUSEEVENTF_RIGHTUP = 0x0010;
  public const uint MOUSEEVENTF_MIDDLEDOWN = 0x0020;
  public const uint MOUSEEVENTF_MIDDLEUP = 0x0040;
  public const uint MOUSEEVENTF_WHEEL = 0x0800;

  public static void LeftClick(int x, int y) {
    if (x >= 0 && y >= 0) SetCursorPos(x, y);
    mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
    System.Threading.Thread.Sleep(45);
    mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
  }

  public static void DoubleClick(int x, int y) {
    LeftClick(x, y);
    System.Threading.Thread.Sleep(90);
    LeftClick(x, y);
  }

  public static void RightClick(int x, int y) {
    if (x >= 0 && y >= 0) SetCursorPos(x, y);
    mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, UIntPtr.Zero);
    System.Threading.Thread.Sleep(45);
    mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, UIntPtr.Zero);
  }

  public static void Scroll(int amount) {
    mouse_event(MOUSEEVENTF_WHEEL, 0, 0, amount, UIntPtr.Zero);
  }
}
'@
}

Add-Type -AssemblyName System.Windows.Forms

$act = $Action.ToLower()
if ($act -eq 'click') {
  [WinMouse]::LeftClick($X, $Y)
  Write-Output "Clicked at ($X, $Y)"
} elseif ($act -eq 'doubleclick') {
  [WinMouse]::DoubleClick($X, $Y)
  Write-Output "Double-clicked at ($X, $Y)"
} elseif ($act -eq 'rightclick') {
  [WinMouse]::RightClick($X, $Y)
  Write-Output "Right-clicked at ($X, $Y)"
} elseif ($act -eq 'move') {
  [void][WinMouse]::SetCursorPos($X, $Y)
  Write-Output "Moved cursor to ($X, $Y)"
} elseif ($act -eq 'scroll') {
  $amt = if ($Amount -ne 0) { $Amount } else { -240 }
  [WinMouse]::Scroll($amt)
  Write-Output "Scrolled $amt"
} else {
  Write-Output "Unknown mouse action: $Action"
}
