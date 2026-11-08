const { spawn } = require('child_process');

class MediaController {
  constructor() {
    this.ps = null;
    this.spawnProcess();
  }

  spawnProcess() {
    try {
      this.ps = spawn('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy', 'Bypass',
        '-Command',
        `
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetParameters().Count -eq 1
} | Select-Object -First 1

function Await($t, $r) {
  $asTask = $asTaskGeneric.MakeGenericMethod($r)
  $net = $asTask.Invoke($null, @($t))
  $net.Wait(1500) | Out-Null
  return $net.Result
}

[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media, ContentType=WindowsRuntime] | Out-Null
$w = New-Object -ComObject WScript.Shell

function GetSession {
  try {
    $mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
    $s = $mgr.GetCurrentSession()
    if (-not $s) {
      $sessions = $mgr.GetSessions()
      if ($sessions.Count -gt 0) { $s = $sessions[0] }
    }
    return $s
  } catch {
    return $null
  }
}

while ($line = [Console]::ReadLine()) {
  try {
    $s = GetSession
    if ($line -eq 'play' -or $line -eq 'playpause') {
      if ($s) {
        $s.TryTogglePlayPauseAsync() | Out-Null
      } else {
        $w.SendKeys([char]179)
      }
    } elseif ($line -eq 'next') {
      if ($s) {
        $s.TrySkipNextAsync() | Out-Null
      } else {
        $w.SendKeys([char]176)
      }
    } elseif ($line -eq 'prev') {
      if ($s) {
        $s.TrySkipPreviousAsync() | Out-Null
      } else {
        $w.SendKeys([char]177)
      }
    } elseif ($line -eq 'forward') {
      if ($s) {
        $s.TryFastForwardAsync() | Out-Null
      }
    } elseif ($line -eq 'rewind') {
      if ($s) {
        $s.TryRewindAsync() | Out-Null
      }
    } elseif ($line.StartsWith('seek:')) {
      $sec = [double]($line.Substring(5))
      if ($s) {
        $ticks = [long]($sec * 10000000)
        $s.TryChangePlaybackPositionAsync($ticks) | Out-Null
      }
    } elseif ($line -eq 'mute') {
      $w.SendKeys([char]173)
    }
  } catch {}
}
        `
      ]);

      this.ps.on('error', (err) => {
        console.error('[MediaController] PowerShell process error:', err.message);
        this.ps = null;
      });

      this.ps.on('exit', () => {
        this.ps = null;
      });
    } catch (e) {
      console.error('[MediaController] Failed to spawn PowerShell:', e);
      this.ps = null;
    }
  }

  send(command) {
    if (!this.ps || !this.ps.stdin || this.ps.killed) {
      this.spawnProcess();
    }

    if (this.ps && this.ps.stdin && !this.ps.stdin.destroyed) {
      try {
        this.ps.stdin.write(command + '\n');
      } catch (err) {
        console.error('[MediaController] Write error:', err.message);
      }
    }
  }

  stop() {
    if (this.ps) {
      try {
        this.ps.stdin.end();
        this.ps.kill();
      } catch (_) {}
      this.ps = null;
    }
  }
}

module.exports = new MediaController();

