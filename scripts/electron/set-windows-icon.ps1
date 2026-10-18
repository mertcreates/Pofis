param([Parameter(Mandatory = $true)][string]$Executable, [Parameter(Mandatory = $true)][string]$Icon)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Runtime.InteropServices;

public static class PofisIcon {
    delegate bool NameCallback(IntPtr module, IntPtr type, IntPtr name, IntPtr parameter);
    delegate bool LanguageCallback(IntPtr module, IntPtr type, IntPtr name, ushort language, IntPtr parameter);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    static extern IntPtr LoadLibraryExW(string path, IntPtr file, uint flags);
    [DllImport("kernel32.dll")] static extern bool FreeLibrary(IntPtr module);
    [DllImport("kernel32.dll", SetLastError=true)]
    static extern bool EnumResourceNamesW(IntPtr module, IntPtr type, NameCallback callback, IntPtr parameter);
    [DllImport("kernel32.dll", SetLastError=true)]
    static extern bool EnumResourceLanguagesW(IntPtr module, IntPtr type, IntPtr name, LanguageCallback callback, IntPtr parameter);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    static extern IntPtr BeginUpdateResourceW(string path, bool deleteExisting);
    [DllImport("kernel32.dll", SetLastError=true)]
    static extern bool UpdateResourceW(IntPtr update, IntPtr type, IntPtr name, ushort language, byte[] data, uint size);
    [DllImport("kernel32.dll", SetLastError=true)]
    static extern bool EndUpdateResourceW(IntPtr update, bool discard);

    class Group {
        public int Id;
        public string Name;
        public ushort Language;
    }
    static void Check(bool success) {
        if (!success) throw new Win32Exception(Marshal.GetLastWin32Error());
    }

    public static void Set(string executable, string icon) {
        byte[] ico = File.ReadAllBytes(icon);
        if (ico.Length < 22 || BitConverter.ToUInt16(ico, 2) != 1 || BitConverter.ToUInt16(ico, 4) != 1 ||
            BitConverter.ToUInt32(ico, 18) != 22 || BitConverter.ToUInt32(ico, 14) != ico.Length - 22)
            throw new InvalidDataException("Expected a single PNG icon.");
        var groups = new List<Group>();
        int maximumId = 0;
        IntPtr module = LoadLibraryExW(executable, IntPtr.Zero, 0x22);
        if (module == IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error());
        try {
            NameCallback icons = (m, t, n, p) => {
                long value = n.ToInt64();
                if ((value >> 16) == 0) maximumId = Math.Max(maximumId, (int)value);
                return true;
            };
            Check(EnumResourceNamesW(module, new IntPtr(3), icons, IntPtr.Zero));
            NameCallback names = (m, t, n, p) => {
                long value = n.ToInt64();
                LanguageCallback languages = (lm, lt, ln, language, lp) => {
                    groups.Add(new Group { Id = (value >> 16) == 0 ? (int)value : 0,
                        Name = (value >> 16) == 0 ? null : Marshal.PtrToStringUni(n), Language = language });
                    return true;
                };
                Check(EnumResourceLanguagesW(m, t, n, languages, IntPtr.Zero));
                return true;
            };
            Check(EnumResourceNamesW(module, new IntPtr(14), names, IntPtr.Zero));
        } finally { FreeLibrary(module); }
        if (groups.Count == 0 || maximumId >= UInt16.MaxValue) throw new InvalidDataException("No usable application icon group.");
        ushort imageId = (ushort)(maximumId + 1);
        byte[] png = new byte[ico.Length - 22];
        Array.Copy(ico, 22, png, 0, png.Length);
        byte[] group = new byte[20];
        Array.Copy(ico, 0, group, 0, 6);
        Array.Copy(ico, 6, group, 6, 12);
        Array.Copy(BitConverter.GetBytes(imageId), 0, group, 18, 2);
        IntPtr update = BeginUpdateResourceW(executable, false);
        if (update == IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error());
        try {
            foreach (var entry in groups) {
                IntPtr name = entry.Name == null ? new IntPtr(entry.Id) : Marshal.StringToHGlobalUni(entry.Name);
                try {
                    Check(UpdateResourceW(update, new IntPtr(3), new IntPtr(imageId), entry.Language, png, (uint)png.Length));
                    Check(UpdateResourceW(update, new IntPtr(14), name, entry.Language, group, (uint)group.Length));
                } finally { if (entry.Name != null) Marshal.FreeHGlobal(name); }
            }
            Check(EndUpdateResourceW(update, false));
            update = IntPtr.Zero;
        } finally { if (update != IntPtr.Zero) EndUpdateResourceW(update, true); }
    }
}
'@
[PofisIcon]::Set([IO.Path]::GetFullPath($Executable), [IO.Path]::GetFullPath($Icon))
