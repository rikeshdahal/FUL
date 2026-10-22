<#
  Nixi system volume control via the Core Audio API.

    -File volume.ps1 -Get          -> prints the current percentage (0-100)
    -File volume.ps1 -Set 60       -> sets the master volume to 60%
    -File volume.ps1 -Mute         -> mutes
    -File volume.ps1 -Unmute       -> unmutes
#>
param(
  [int]$Set = -1,
  [switch]$Get,
  [switch]$Mute,
  [switch]$Unmute
)

$ErrorActionPreference = 'Stop'

if (-not ('Audio.Volume' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

namespace Audio {
  [Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  public interface IAudioEndpointVolume {
    int RegisterControlChangeNotify(IntPtr pNotify);
    int UnregisterControlChangeNotify(IntPtr pNotify);
    int GetChannelCount(out uint pnChannelCount);
    int SetMasterVolumeLevel(float fLevel, ref Guid guidEventContext);
    int SetMasterVolumeLevelScalar(float fLevel, ref Guid guidEventContext);
    int GetMasterVolumeLevel(out float pfLevel);
    int GetMasterVolumeLevelScalar(out float pfLevel);
    int SetMasterVolumeLevelStep(int nStep, ref Guid guidEventContext);
    int GetMasterVolumeLevelStep(out int pnStep);
    int SetMasterVolumeLevelLinear(int nStep, ref Guid guidEventContext);
    int GetMasterVolumeLevelLinear(out uint pnStep);
    int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, ref Guid guidEventContext);
    int GetMute([MarshalAs(UnmanagedType.Bool)] out bool pbMute);
    int GetVolumeRange(out float pfMin, out float pfMax, out float pfIncrement);
    int SetVolumeRange(float fMin, float fMax, float fIncrement, ref Guid guidEventContext);
    int GetVolumeRangeStep(out uint nMin, out uint nMax, out uint nIncrement);
    int SetVolumeRangeStep(uint nMin, uint nMax, uint nIncrement, ref Guid guidEventContext);
    int VolumeStepUp(ref Guid guidEventContext, uint nStep);
    int VolumeStepDown(ref Guid guidEventContext, uint nStep);
  }

  [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  public interface IMMDevice {
    int Activate(ref Guid id, int clsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
  }

  [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  public interface IMMDeviceEnumerator {
    int EnumAudioEndpointDataFlow(int dataFlow, int stateMask, out object collection);
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
    int GetDevice([MarshalAs(UnmanagedType.LPWStr)] string pwstrId, out IMMDevice ppDevice);
    int EnumDevices(int dataFlow, int stateMask, out object collection);
  }

  [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
  public class MMDeviceEnumeratorComObject { }

  public static class Volume {
    static IAudioEndpointVolume Endpoint() {
      IMMDeviceEnumerator e = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
      IMMDevice dev;
      Marshal.ThrowExceptionForHR(e.GetDefaultAudioEndpoint(0, 0, out dev));
      Guid guid = typeof(IAudioEndpointVolume).GUID;
      object o;
      Marshal.ThrowExceptionForHR(dev.Activate(ref guid, 23, IntPtr.Zero, out o));
      return (IAudioEndpointVolume)o;
    }

    public static int Get() {
      float f;
      Marshal.ThrowExceptionForHR(Endpoint().GetMasterVolumeLevelScalar(out f));
      return (int)Math.Round(f * 100.0f);
    }

    public static void Set(int level) {
      if (level < 0) level = 0;
      if (level > 100) level = 100;
      Guid ctx = Guid.Empty;
      Marshal.ThrowExceptionForHR(Endpoint().SetMasterVolumeLevelScalar(level / 100.0f, ref ctx));
    }

    public static bool GetMute() {
      bool m;
      Marshal.ThrowExceptionForHR(Endpoint().GetMute(out m));
      return m;
    }

    public static void SetMute(bool mute) {
      Guid ctx = Guid.Empty;
      Marshal.ThrowExceptionForHR(Endpoint().SetMute(mute, ref ctx));
    }
  }
}
'@
}

try {
  if ($Mute) { [Audio.Volume]::SetMute($true); '{"muted":true}' }
  elseif ($Unmute) { [Audio.Volume]::SetMute($false); '{"muted":false}' }
  elseif ($Set -ge 0) { [Audio.Volume]::Set($Set); '{"volume":' + [Audio.Volume]::Get() + '}' }
  else { '{"volume":' + [Audio.Volume]::Get() + ',"muted":' + ([Audio.Volume]::GetMute()).ToString().ToLower() + '}' }
} catch {
  '{"error":"' + $_.Exception.Message.Replace('"', "'") + '"}'
}
