# Run tsc using local node if available, with helpful errors for Windows PowerShell
$ErrorActionPreference = 'Stop'

# Try common node install locations
$possibleNodePaths = @(
    "$env:ProgramFiles\nodejs\node.exe",
    "$env:ProgramFiles(x86)\nodejs\node.exe",
    "$env:LocalAppData\Programs\nodejs\node.exe",
    "node.exe"  # fallback to PATH
)

$node = $null
foreach ($p in $possibleNodePaths) {
    try {
        if (Test-Path $p -PathType Leaf) { $node = $p; break }
    } catch { }
}

if (-not $node) {
    Write-Host "ERROR: Node.js not found. Please install Node.js (>= 14) or ensure node.exe is on your PATH." -ForegroundColor Red
    exit 1
}

$tscPath = Join-Path -Path $PSScriptRoot -ChildPath "..\node_modules\typescript\bin\tsc"
if (-not (Test-Path $tscPath)) {
    Write-Host "ERROR: Local TypeScript compiler not installed. Run 'npm install' in the project root." -ForegroundColor Red
    exit 1
}

& $node $tscPath --noEmit
exit $LASTEXITCODE
