<#
  Nixi global hotkey watcher.

  Electron's globalShortcut cannot tell the left and right modifier keys apart,
  so Nixi uses this tiny helper to watch the real keyboard state. It reports
  press/release edges for:

    rc     Right Ctrl          -> command mode (hold to talk)
    ra     Right Alt           -> dictation mode (hold to talk)
    cmd    Ctrl + Alt + Space  -> command mode
    dict   Ctrl + Alt + D      -> dictation mode
    write  Ctrl + Alt + W      -> write mode
    mute   Ctrl + Alt + M      -> toggle mute

  Output: one JSON object per line on stdout, e.g. {"id":"rc","down":true}
#>
$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class NixiKeys {
  [DllImport("user32.dll")]
  public static extern short GetAsyncKeyState(int vKey);
  public static bool Down(int vKey) {
    return (GetAsyncKeyState(vKey) & 0x8000) != 0;
  }
}
'@

$VK_LCONTROL = 0xA2
$VK_RCONTROL = 0xA3
$VK_LMENU    = 0xA4
$VK_RMENU    = 0xA5
$VK_CONTROL  = 0x11
$VK_MENU     = 0x12
$VK_SPACE    = 0x20
$VK_D        = 0x44
$VK_W        = 0x57
$VK_M        = 0x4D

function Ctrl { ([NixiKeys]::Down($VK_LCONTROL) -or [NixiKeys]::Down($VK_RCONTROL)) }
function Alt  { ([NixiKeys]::Down($VK_LMENU)    -or [NixiKeys]::Down($VK_RMENU)) }

$groups = [ordered]@{
  'rc'    = { [NixiKeys]::Down($VK_RCONTROL) }
  'ra'    = { [NixiKeys]::Down($VK_RMENU) }
  'cmd'   = { (Ctrl) -and (Alt) -and ([NixiKeys]::Down($VK_SPACE)) }
  'dict'  = { (Ctrl) -and (Alt) -and ([NixiKeys]::Down($VK_D)) }
  'write' = { (Ctrl) -and (Alt) -and ([NixiKeys]::Down($VK_W)) }
  'mute'  = { (Ctrl) -and (Alt) -and ([NixiKeys]::Down($VK_M)) }
}

$state = @{}
foreach ($k in $groups.Keys) { $state[$k] = $false }

function Emit {
  param([string]$Id, [bool]$Down)
  try {
    $line = @{ id = $Id; down = $Down } | ConvertTo-Json -Compress
    [Console]::Out.WriteLine($line)
    [Console]::Out.Flush()
  } catch { }
}

try {
  while ($true) {
    foreach ($k in $groups.Keys) {
      $now = [bool](& $groups[$k])
      if ($now -ne $state[$k]) {
        $state[$k] = $now
        Emit $k $now
      }
    }
    Start-Sleep -Milliseconds 20
  }
} catch {
  try { [Console]::Error.WriteLine('hotkey watcher stopped: ' + $_.Exception.Message); [Console]::Error.Flush() } catch { }
  try { Emit 'error' $false } catch { }
}
