param([switch]$Confirmed)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2

function Assert-PofisDirectory([string]$Path) {
    $item = Get-Item -LiteralPath $Path -Force
    if (-not $item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
        throw 'Kurulum dizini güvenli bir klasör olmalı.'
    }
}

function Remove-PofisVersions([string]$Root, [string]$Keep) {
    $rootPath = [IO.Path]::GetFullPath($Root).TrimEnd('\')
    Assert-PofisDirectory $rootPath
    $versionsPath = Join-Path $rootPath 'versions'
    Assert-PofisDirectory $versionsPath
    foreach ($item in Get-ChildItem -LiteralPath $versionsPath -Force) {
        if ($item.Name -eq $Keep) { continue }
        if ($item.Name -cnotmatch '^[a-f0-9]{32}$') { throw 'Sürüm dizininde beklenmeyen dosya var.' }
        $candidate = [IO.Path]::GetFullPath($item.FullName)
        if ([IO.Path]::GetDirectoryName($candidate) -ne $versionsPath) { throw 'Sürüm temizleme sınırı aşıldı.' }
        Assert-PofisDirectory $candidate
        $running = @(Get-Process -ErrorAction SilentlyContinue | Where-Object {
            try { $_.Path -and $_.Path.StartsWith($candidate + '\', [StringComparison]::OrdinalIgnoreCase) } catch { $false }
        })
        if ($running.Count) { throw 'Eski Pofis sürümü açık. Uygulamayı kapatıp yeniden dene.' }
        # Refuse junctions before recursive enumeration or deletion.
        $pending = New-Object 'Collections.Generic.Stack[string]'
        $pending.Push(('\\?\' + $candidate))
        while ($pending.Count) {
            foreach ($entry in [IO.Directory]::EnumerateFileSystemEntries($pending.Pop())) {
                $attributes = [IO.File]::GetAttributes($entry)
                if ($attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Sürüm dosyalarında bağlantı var; temizlenmedi.' }
                if ($attributes -band [IO.FileAttributes]::Directory) { $pending.Push($entry) }
            }
        }
        [IO.Directory]::Delete(('\\?\' + $candidate), $true)
    }
}

function Uninstall-Pofis([string]$Root, [switch]$Confirmed) {
    Assert-PofisDirectory $Root
    $record = Get-Content -LiteralPath (Join-Path $Root 'installed.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    $registryPrefix = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\'
    if ($record.schemaVersion -ne 1 -or $record.installRoot -ne $Root -or
        -not $record.registryPath.StartsWith($registryPrefix, [StringComparison]::OrdinalIgnoreCase) -or
        $record.registryPath.Substring($registryPrefix.Length) -cnotmatch '^Pofis(?:-[a-f0-9]{32})?$') {
        throw 'Pofis kaldırma kaydı doğrulanamadı.'
    }
    if (-not $Confirmed) {
        Add-Type -AssemblyName System.Windows.Forms
        if ([Windows.Forms.MessageBox]::Show("Pofis kaldırılsın mı?`nAyarların ve oturum verilerin korunacak.", 'Pofis', 'YesNo', 'Question') -ne 'Yes') { return }
    }
    if ((Test-Path -LiteralPath $record.registryPath) -and
        (Get-ItemProperty -LiteralPath $record.registryPath).InstallLocation -ne $Root) {
        throw 'Kaldırma kaydı başka bir kuruluma ait.'
    }
    $lock = [IO.File]::Open((Join-Path $Root 'install.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
    try {
        $prefix = (Join-Path $Root 'versions') + '\'
        $running = @(Get-Process -ErrorAction SilentlyContinue | Where-Object {
            try { $_.Path -and $_.Path.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase) } catch { $false }
        })
        if ($running.Count) { throw 'Pofis açık. Uygulamayı kapatıp kaldırmayı yeniden dene.' }
        if (Test-Path -LiteralPath $record.shortcutPath) {
            $shell = New-Object -ComObject WScript.Shell
            try {
                $shortcut = $shell.CreateShortcut($record.shortcutPath)
                if (-not $shortcut.TargetPath.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) { throw 'Kısayol başka bir uygulamaya ait; kaldırılmadı.' }
            } finally { [Runtime.InteropServices.Marshal]::ReleaseComObject($shell) | Out-Null }
        }
        Remove-PofisVersions $Root ''
        if (Test-Path -LiteralPath $record.shortcutPath) { Remove-Item -LiteralPath $record.shortcutPath -Force }
        if (Test-Path -LiteralPath $record.registryPath) { Remove-Item -LiteralPath $record.registryPath -Recurse -Force }
        foreach ($name in @('installed.json', 'uninstall.ps1')) {
            $file = Join-Path $Root $name
            if (Test-Path -LiteralPath $file) { [IO.File]::Delete($file) }
        }
        [IO.Directory]::Delete((Join-Path $Root 'versions'))
    } finally { $lock.Dispose() }
    [IO.File]::Delete((Join-Path $Root 'install.lock'))
    # Remove only an empty installation root. Unknown files are never recursively deleted.
    if (@(Get-ChildItem -LiteralPath $Root -Force).Count -eq 0) { [IO.Directory]::Delete($Root) }
}

if ($MyInvocation.InvocationName -ne '.') {
    try { Uninstall-Pofis $PSScriptRoot -Confirmed:$Confirmed }
    catch {
        if ($Confirmed) { throw }
        Add-Type -AssemblyName System.Windows.Forms
        [Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Pofis kaldırılamadı', 'OK', 'Error') | Out-Null
        exit 1
    }
}
