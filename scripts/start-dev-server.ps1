# Start the dev auth server in the background and verify it's reachable on port 8082
$ErrorActionPreference = 'Stop'

function Find-Node {
    $paths = @(
        "$env:ProgramFiles\nodejs\node.exe",
        "$env:ProgramFiles(x86)\nodejs\node.exe",
        "$env:LocalAppData\Programs\nodejs\node.exe"
    )
    try {
        $cmd = Get-Command node -ErrorAction SilentlyContinue
        if ($cmd -and $cmd.Source) { $paths += $cmd.Source }
    } catch { }
    foreach ($p in $paths) {
        if (-not $p) { continue }
        if (Test-Path $p) { return $p }
    }
    return $null
}

$node = Find-Node
if (-not $node) {
    Write-Host "ERROR: node executable not found. Please install Node.js or ensure 'node' is on PATH." -ForegroundColor Red
    exit 1
}

$scriptPath = Join-Path $PSScriptRoot "..\backend\server.js"
if (-not (Test-Path $scriptPath)) {
    Write-Host "ERROR: server.js not found at $scriptPath" -ForegroundColor Red
    exit 1
}

# Start node as a background process
$proc = Start-Process -FilePath $node -ArgumentList "$scriptPath" -PassThru
Start-Sleep -Seconds 1

# Wait a bit and check netstat for listening
$tries = 0
$found = $false
while ($tries -lt 6 -and -not $found) {
    Start-Sleep -Seconds 1
    $net = netstat -ano | Select-String ":8082"
    if ($net) { $found = $true; break }
    $tries++
}

if (-not $found) {
    Write-Host "WARNING: dev-server process started (PID=$($proc.Id)) but port 8082 not detected listening yet." -ForegroundColor Yellow
    Write-Host "Process info: PID=$($proc.Id), MainWindowHandle=$($proc.MainWindowHandle)"
} else {
    Write-Host "✅ Dev server started and port 8082 is listening (PID=$($proc.Id))" -ForegroundColor Green
}

# Try a quick GET to / on both loopback and 0.0.0.0 to verify responsiveness
try {
    $resp = Invoke-RestMethod -Uri 'http://127.0.0.1:8082/' -Method GET -TimeoutSec 5
    Write-Host "✅ Dev server root response:" -ForegroundColor Green
    $resp | ConvertTo-Json -Depth 2 | Write-Host
} catch {
    Write-Host "ERROR: dev server did not respond to HTTP GET on http://127.0.0.1:8082/" -ForegroundColor Red
    Write-Host "Exception: $($_.Exception.Message)"
}

# Check firewall rule
$ruleName = "Allow Node.js for Marketplace Dev"
$fwRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if (-not $fwRule) {
    Write-Host "⚠️  Firewall rule '$ruleName' not found." -ForegroundColor Yellow
    Write-Host "Your emulator might not be able to connect. To allow connections, run PowerShell as Administrator and execute:" -ForegroundColor Yellow
    Write-Host "New-NetFirewallRule -DisplayName '$ruleName' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8082 -Program `"$node`"" -ForegroundColor Cyan
} else {
    Write-Host "✅ Firewall rule '$ruleName' exists." -ForegroundColor Green
}

# Test against 0.0.0.0 to simulate external access
try {
    $respExt = Invoke-RestMethod -Uri 'http://0.0.0.0:8082/' -Method GET -TimeoutSec 5
    Write-Host "✅ Dev server is accessible on all interfaces (0.0.0.0)." -ForegroundColor Green
} catch {
    Write-Host "WARNING: Server responded on 127.0.0.1 but NOT on 0.0.0.0." -ForegroundColor Yellow
    Write-Host "This could indicate a firewall issue or the server is bound to localhost only." -ForegroundColor Yellow
    Write-Host "Exception: $($_.Exception.Message)"
}

Write-Host "If the emulator still can't reach the server, ensure you're using the correct emulator host mapping (10.0.2.2 for Android emulator)." -ForegroundColor Cyan

# Print PID so user can kill later if needed
Write-Host "Dev server PID: $($proc.Id)" -ForegroundColor Cyan
