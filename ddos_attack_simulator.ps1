# DDoS Attack Simulator
# This script simulates various attack patterns to test the ML detection system

param(
    [string]$BackendUrl = "http://localhost:8080",
    [string]$AttackType = "rapid",
    [int]$Duration = 60
)

# Force ASCII encoding for output to avoid issues
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==========================================" -ForegroundColor Red
Write-Host "    DDoS ATTACK SIMULATOR" -ForegroundColor Red
Write-Host "==========================================" -ForegroundColor Red
Write-Host ""
Write-Host "WARNING: This will simulate a DDoS attack!" -ForegroundColor Yellow
Write-Host "Make sure your server is running on $BackendUrl" -ForegroundColor Yellow
Write-Host ""
Write-Host "Attack Type: $AttackType" -ForegroundColor Cyan
Write-Host "Duration: $Duration seconds" -ForegroundColor Cyan
Write-Host ""

# Check if server is running
Write-Host "[1/3] Checking if server is running..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-WebRequest -Uri "$BackendUrl/api/health" -Method GET -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "[OK] Server is running!" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR] Server not responding at $BackendUrl" -ForegroundColor Red
    Write-Host "Please start the server with: npm run dev:full" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "[2/3] Preparing attack simulation..." -ForegroundColor Yellow

# Create text file helper
function New-TestFile {
    param([string]$FilePath, [int]$SizeKB = 10)
    $content = "X" * ($SizeKB * 1024)
    [System.IO.File]::WriteAllText($FilePath, $content)
}

# Upload helper
function Send-Upload {
    param(
        [string]$FilePath,
        [string]$UserId
    )
    
    try {
        $fileBytes = [System.IO.File]::ReadAllBytes($FilePath)
        $fileEnc = [System.Text.Encoding]::GetEncoding('ISO-8859-1').GetString($fileBytes)
        $boundary = "---------------------------" + [System.Guid]::NewGuid().ToString()
        $filename = Split-Path $FilePath -Leaf
        
        $bodyLines = @(
            "--$boundary",
            "Content-Disposition: form-data; name=`"file`"; filename=`"$filename`"",
            "Content-Type: application/octet-stream",
            "",
            $fileEnc,
            "--$boundary--"
        ) -join "`r`n"

        $response = Invoke-WebRequest -Uri "$BackendUrl/api/files/upload" `
            -Method POST `
            -ContentType "multipart/form-data; boundary=$boundary" `
            -Body $bodyLines `
            -Headers @{ "X-User-Id" = $UserId } `
            -TimeoutSec 10 `
            -UseBasicParsing
            
        return $true
    }
    catch {
        return $false
    }
}

# Create temporary directory
$tempDir = New-Item -ItemType Directory -Path "$env:TEMP\ddos_attack_$(Get-Date -Format 'yyyyMMdd_HHmmss')" -Force
Write-Host "[OK] Created temp directory: $tempDir" -ForegroundColor Green

Write-Host ""
Write-Host "[3/3] Starting attack simulation..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

$startTime = Get-Date
$requestCount = 0
$successCount = 0
$failCount = 0

# Main Attack Logic - Using simple If/Else instead of Switch to avoid nesting issues
if ($AttackType -eq "rapid") {
    Write-Host "ATTACK TYPE: Rapid Fire (High Frequency)" -ForegroundColor Red
    Write-Host "Sending requests as fast as possible..." -ForegroundColor Gray
    
    $testFile = Join-Path $tempDir "attack_file.txt"
    New-TestFile -FilePath $testFile -SizeKB 5
    
    while (((Get-Date) - $startTime).TotalSeconds -lt $Duration) {
        $requestCount++
        $randomId = Get-Random -Maximum 10
        if (Send-Upload -FilePath $testFile -UserId "rapid_attacker_$randomId") {
            $successCount++
            Write-Host "[$requestCount] Sent (Total: $successCount)" -ForegroundColor Green
        }
        else {
            $failCount++
            Write-Host "[$requestCount] Failed (Blocked/Error)" -ForegroundColor Red
        }
        Start-Sleep -Milliseconds 100
    }
}
elseif ($AttackType -eq "duplicate") {
    Write-Host "ATTACK TYPE: Duplicate Files (Same File Spamming)" -ForegroundColor Red
    Write-Host "Uploading the same file repeatedly..." -ForegroundColor Gray
    
    $testFile = Join-Path $tempDir "duplicate_attack.txt"
    New-TestFile -FilePath $testFile -SizeKB 10
    
    while (((Get-Date) - $startTime).TotalSeconds -lt $Duration) {
        $requestCount++
        if (Send-Upload -FilePath $testFile -UserId "duplicate_attacker") {
            $successCount++
            Write-Host "[$requestCount] Duplicate upload (Total: $successCount)" -ForegroundColor Green
        }
        else {
            $failCount++
            Write-Host "[$requestCount] Failed (Blocked/Error)" -ForegroundColor Red
        }
        Start-Sleep -Milliseconds 500
    }
}
elseif ($AttackType -eq "massive") {
    Write-Host "ATTACK TYPE: Massive Files (Large File Flooding)" -ForegroundColor Red
    Write-Host "Uploading large files to consume resources..." -ForegroundColor Gray
    
    while (((Get-Date) - $startTime).TotalSeconds -lt $Duration) {
        $requestCount++
        $testFile = Join-Path $tempDir "massive_$requestCount.bin"
        New-TestFile -FilePath $testFile -SizeKB 1024
        
        Write-Host "[$requestCount] Uploading 1MB file..." -ForegroundColor Yellow
        
        if (Send-Upload -FilePath $testFile -UserId "massive_attacker") {
            $successCount++
            Write-Host "[$requestCount] Massive upload succeeded" -ForegroundColor Green
        }
        else {
            $failCount++
            Write-Host "[$requestCount] Failed (Blocked/Error)" -ForegroundColor Red
        }
        
        Remove-Item $testFile -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}
else {
    Write-Host "Unknown attack type: $AttackType" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Red
Write-Host "ATTACK SIMULATION COMPLETE" -ForegroundColor Red
Write-Host "==========================================" -ForegroundColor Red
Write-Host ""
Write-Host "Statistics:" -ForegroundColor Cyan
Write-Host "  Total Requests: $requestCount" -ForegroundColor White
Write-Host "  Successful: $successCount" -ForegroundColor Green
Write-Host "  Failed (Blocked): $failCount" -ForegroundColor Red
$totalSeconds = ((Get-Date) - $startTime).TotalSeconds
Write-Host "  Duration: $([math]::Round($totalSeconds, 2)) seconds" -ForegroundColor White

Write-Host ""
Write-Host "NOTE ABOUT DASHBOARD:" -ForegroundColor Yellow
Write-Host "The dashboard shows detection for YOUR user." -ForegroundColor Gray
Write-Host "These attacks are simulating OTHER attackers." -ForegroundColor Gray
Write-Host "To see these attacks, look at the Security Events log." -ForegroundColor Gray
Write-Host ""

# Cleanup
Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
