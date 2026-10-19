param([string]$InstallerPath = (Join-Path $PSScriptRoot 'install.ps1'), [switch]$ForceClose, [switch]$Preview)

$ErrorActionPreference = 'Stop'
# Load the real installer functions without executing installation code.
$tokens = $null; $errors = $null
$ast = [Management.Automation.Language.Parser]::ParseFile($InstallerPath, [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw ($errors | Out-String) }
foreach ($statement in $ast.EndBlock.Statements) {
    if ($statement -is [Management.Automation.Language.FunctionDefinitionAst]) {
        . ([scriptblock]::Create($statement.Extent.Text))
    }
}

# All process operations are simulated; no real process is inspected or stopped.
$script:running = $true
$script:forceDemo = $ForceClose.IsPresent
$script:owned = [pscustomobject]@{ HasExited = $false; MainWindowHandle = 1 }
$script:owned | Add-Member ScriptMethod CloseMainWindow {
    if (-not $script:forceDemo) { $script:running = $false }
    return $true
}
$script:owned | Add-Member ScriptMethod Kill { $script:running = $false }
function Get-InstalledProcess { if ($script:running) { $script:owned } }
function Wait-PofisClosed { return (-not $script:running) }
if ($Preview) {
    function Read-Host([string]$Prompt) { Write-Host "${Prompt}: e (demo)"; return 'e' }
}

Write-Host 'DEMO | İndirme, kurulum ve gerçek uygulama kapatma yapılmaz.'
Write-Host 'Pofis indiriliyor…'
Write-Host 'Paket doğrulanıyor…'
try {
    Close-PofisForUpdate
    Write-Host "`nDEMO | Pofis kapandı; güncelleme devam ederdi."
} catch {
    Write-Host "`nDEMO | $($_.Exception.Message)"
}
