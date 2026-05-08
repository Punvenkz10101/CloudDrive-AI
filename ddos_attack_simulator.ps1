# DDoS Attack Simulator
# This script simulates targeted application-layer upload attacks for ML defense testing

param(
    [string]$BackendUrl = "http://localhost:8080",
    [string]$AttackType = "rapid-duplicate",
    [int]$Duration = 60
)

# Force ASCII encoding for output to avoid issues
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Net.Http -ErrorAction SilentlyContinue

$Script:SharedHttpClient = New-Object System.Net.Http.HttpClient
$Script:SharedHttpClient.Timeout = [TimeSpan]::FromSeconds(15)

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

# Persistent file hash for simulating duplicate file uploads (same hash = same content)
$DUPLICATE_FILE_HASH = "0xDEADBEEF_BOTNET_PAYLOAD_v3"
$SAME_IP_BOTNET_IP = "185.74.22.91"
$SAME_IP_LOCATION_LABEL = "Unknown"

function Get-LocalPublicAttackOrigin {
    try {
        $publicIpResp = Invoke-RestMethod -Uri "https://api.ipify.org?format=json" -Method GET -TimeoutSec 6 -ErrorAction Stop
        $publicIp = $publicIpResp.ip
        if (-not $publicIp) { return $null }

        $geoResp = Invoke-RestMethod -Uri "http://ip-api.com/json/$publicIp" -Method GET -TimeoutSec 6 -ErrorAction Stop
        if ($geoResp -and $geoResp.status -eq "success") {
            return @{
                ip = $publicIp
                city = $geoResp.city
                region = $geoResp.regionName
                country = $geoResp.country
                countryCode = $geoResp.countryCode
            }
        }

        return @{ ip = $publicIp; city = "Unknown"; region = "Unknown"; country = "Unknown"; countryCode = "XX" }
    }
    catch {
        return $null
    }
}

# Attack request helper — performs REAL multipart file upload
# This hits /api/files/upload so successful requests appear in My Files,
# while blocked requests are denied by DDoS middleware after threshold/risk escalation.
function Send-BotRequest {
    param(
        [string]$BotId,
        [bool]$IsDuplicate = $false,
        [int]$FileSizeBytes = 8192,
        [string]$SimulatedIp = "",
        [string]$AttackLabel = "rapid-duplicate",
        [string]$AttackRunId = ""
    )
    
    $filename = if ($IsDuplicate) { "duplicate_payload_$($BotId).txt" } else { "rapid_flood_$(Get-Random)_$($BotId).txt" }

    # Use deterministic bytes for duplicates and randomized bytes for unique uploads.
    if ($IsDuplicate) {
        $duplicateText = "ATTACK_DUPLICATE_PAYLOAD|$DUPLICATE_FILE_HASH"
        $payloadText = $duplicateText.PadRight([Math]::Max($FileSizeBytes, $duplicateText.Length), 'X')
    }
    else {
        $uniqueText = "ATTACK_UNIQUE_PAYLOAD|$([Guid]::NewGuid().ToString())"
        $payloadText = $uniqueText.PadRight([Math]::Max($FileSizeBytes, $uniqueText.Length), 'Y')
    }
    $fileBytes = [System.Text.Encoding]::UTF8.GetBytes($payloadText)
    
    # Use one consistent source IP (your laptop public origin) for all attack modes
    $simulatedIp = if ($SimulatedIp -and $SimulatedIp.Trim() -ne "") {
        $SimulatedIp
    } else {
        $SAME_IP_BOTNET_IP
    }
    
    try {
        $uploadUrl = "$BackendUrl/api/files/upload"

        $multipart = New-Object System.Net.Http.MultipartFormDataContent
        $fileContent = New-Object System.Net.Http.ByteArrayContent(,$fileBytes)
        $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("text/plain")
        $multipart.Add($fileContent, "file", $filename)

        $request = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Post, $uploadUrl)
        $request.Content = $multipart
        $request.Headers.Add("X-User-Id", $BotId)
        $request.Headers.Add("X-Attack-Simulation", "true")
        $request.Headers.Add("X-Attack-Type", $AttackLabel)
        if ($AttackRunId -and $AttackRunId.Trim() -ne "") {
            $request.Headers.Add("X-Attack-Run-Id", $AttackRunId)
        }
        $request.Headers.Add("X-File-Size", $fileBytes.Length.ToString())
        $request.Headers.Add("X-Filename", $filename)
        $request.Headers.Add("X-File-Hash", $DUPLICATE_FILE_HASH)
        if ($simulatedIp -and $simulatedIp.Trim() -ne "") {
            $request.Headers.Add("X-Forwarded-For", $simulatedIp)
            $request.Headers.Add("X-Real-IP", $simulatedIp)
        }

        $response = $Script:SharedHttpClient.SendAsync($request).GetAwaiter().GetResult()
        $statusCode = [int]$response.StatusCode

        if ($statusCode -ge 200 -and $statusCode -lt 300) {
            return "ALLOWED"
        }
        elseif ($statusCode -eq 403) {
            return "BLOCKED"
        }
        else {
            return "BLOCKED"
        }
    }
    catch {
        $errMsg = $_.Exception.Message
        if ($errMsg) {
            Write-Host "[WARN] Upload request failed for ${BotId}: $errMsg" -ForegroundColor DarkYellow
        }
        # Non-2xx uploads are treated as blocked for simulator stats.
        return "BLOCKED"
    }
    finally {
        if ($null -ne $response) { $response.Dispose() }
        if ($null -ne $request) { $request.Dispose() }
        if ($null -ne $multipart) { $multipart.Dispose() }
    }
}

# Create temporary directory
$tempDir = New-Item -ItemType Directory -Path "$env:TEMP\ddos_attack_$(Get-Date -Format 'yyyyMMdd_HHmmss')" -Force
Write-Host "[OK] Created temp directory: $tempDir" -ForegroundColor Green

$origin = Get-LocalPublicAttackOrigin
if ($origin -ne $null) {
    $SAME_IP_BOTNET_IP = $origin.ip
    $SAME_IP_LOCATION_LABEL = "$($origin.city), $($origin.region), $($origin.country)"
    Write-Host "[OK] Using your laptop public origin: $SAME_IP_BOTNET_IP ($SAME_IP_LOCATION_LABEL)" -ForegroundColor Green
    if ($origin.countryCode -ne "IN") {
        Write-Host "[WARN] Public IP geolocation is not India ($($origin.countryCode)). Map will show your actual ISP geolocation." -ForegroundColor Yellow
    }
}
else {
    $SAME_IP_LOCATION_LABEL = "Fallback origin"
    Write-Host "[WARN] Could not detect laptop public IP. Using fallback attack IP: $SAME_IP_BOTNET_IP" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[3/3] Starting attack simulation..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

$startTime = Get-Date
$requestCount = 0
$allowedCount = 0
$rateLimitedCount = 0
$blockedCount = 0
$runTag = "$(Get-Date -Format 'yyyyMMddHHmmss')_$(Get-Random -Minimum 1000 -Maximum 9999)"
$targetRequests = 200

# PERSISTENT BOT IDs - Same identity sends many requests to build ML session history
$persistentBotIds = @(
    "attacker_alpha_01_$runTag", "attacker_beta_02_$runTag", "attacker_gamma_03_$runTag",
    "attacker_delta_04_$runTag", "attacker_epsilon_05_$runTag", "attacker_zeta_06_$runTag",
    "attacker_eta_07_$runTag", "attacker_theta_08_$runTag", "attacker_iota_09_$runTag", "attacker_kappa_10_$runTag"
)

if ($AttackType -eq "rapid") { $AttackType = "rapid-duplicate" }
if ($AttackType -eq "duplicate") { $AttackType = "rapid-duplicate" }
if ($AttackType -eq "botnet") { $AttackType = "bot-same-ip" }
if ($AttackType -eq "massive") { $AttackType = "combined" }

function Update-AttackCounters {
    param(
        [string]$Outcome,
        [string]$LogLine
    )

    switch ($Outcome) {
        "ALLOWED" {
            $script:allowedCount++
            Write-Host $LogLine -ForegroundColor Yellow
        }
        "RATE_LIMITED" {
            $script:rateLimitedCount++
            Write-Host $LogLine -ForegroundColor DarkYellow
        }
        default {
            $script:blockedCount++
            Write-Host $LogLine -ForegroundColor Red
        }
    }
}

if ($AttackType -eq "rapid-duplicate") {
    Write-Host "ATTACK TYPE 1: Rapid Duplicate File Attack" -ForegroundColor Red
    Write-Host "One attacker rapidly uploads highly duplicated files to spike duplicate ratio." -ForegroundColor Gray
    Write-Host ""

    $attacker = "rapid_duplicate_attacker_$runTag"

    $targetRequests = 200

    while ($requestCount -lt $targetRequests) {
        $burstSize = Get-Random -Minimum 4 -Maximum 9
        for ($b = 0; $b -lt $burstSize; $b++) {
            if ($requestCount -ge $targetRequests) { break }
            $requestCount++

            $useDuplicate = ($b % 4 -ne 0)
            $result = Send-BotRequest `
                -BotId $attacker `
                -IsDuplicate $useDuplicate `
                -FileSizeBytes (Get-Random -Min 4096 -Max 18432) `
                -SimulatedIp $SAME_IP_BOTNET_IP `
                -AttackLabel "rapid-duplicate" `
                -AttackRunId $runTag

            $kind = if ($useDuplicate) { "duplicate payload" } else { "fresh payload" }
            Update-AttackCounters -Outcome $result -LogLine "[$requestCount] $attacker ($kind): $result"
        }
    }
}
elseif ($AttackType -eq "bot-same-ip") {
    Write-Host "ATTACK TYPE 2: Multiple-Bot Upload Attack (Same IP)" -ForegroundColor Red
    Write-Host "Many bot identities submit uploads from one shared source IP." -ForegroundColor Gray
    Write-Host "Shared attacker IP: $SAME_IP_BOTNET_IP" -ForegroundColor DarkYellow
    Write-Host "Detected attack origin: $SAME_IP_LOCATION_LABEL" -ForegroundColor DarkYellow
    Write-Host ""

    $sameIpBots = @(
        "attacker_alpha_01_$runTag", "attacker_beta_02_$runTag", "attacker_gamma_03_$runTag",
        "attacker_delta_04_$runTag", "attacker_epsilon_05_$runTag", "attacker_zeta_06_$runTag"
    )

    $targetRequests = 200

    while ($requestCount -lt $targetRequests) {
        foreach ($botId in $sameIpBots) {
            if ($requestCount -ge $targetRequests) { break }

            $botBurst = Get-Random -Minimum 8 -Maximum 12
            for ($burst = 0; $burst -lt $botBurst; $burst++) {
                if ($requestCount -ge $targetRequests) { break }
                $requestCount++

                $useDuplicate = ($burst % 3 -ne 0)
                $result = Send-BotRequest `
                    -BotId $botId `
                    -IsDuplicate $useDuplicate `
                    -FileSizeBytes (Get-Random -Min 8192 -Max 262144) `
                    -SimulatedIp $SAME_IP_BOTNET_IP `
                    -AttackLabel "bot-same-ip" `
                    -AttackRunId $runTag

                $flavor = if ($useDuplicate) { "duplicate" } else { "new" }
                Update-AttackCounters -Outcome $result -LogLine "[$requestCount] $botId @ ${SAME_IP_BOTNET_IP} ($flavor): $result"
            }
        }
    }
}
elseif ($AttackType -eq "combined") {
    Write-Host "ATTACK TYPE 3: Combined Attack (Rapid Duplicate + Same-IP Botnet)" -ForegroundColor Red
    Write-Host "Combines duplicate flooding and multi-bot same-IP pressure." -ForegroundColor Gray
    Write-Host ""

    $attacker = "combined_orchestrator_$runTag"
    $targetRequests = 200

    while ($requestCount -lt $targetRequests) {
        $duplicateBurst = Get-Random -Minimum 10 -Maximum 16
        for ($i = 0; $i -lt $duplicateBurst; $i++) {
            if ($requestCount -ge $targetRequests) { break }
            $requestCount++

            $result = Send-BotRequest `
                -BotId $attacker `
                -IsDuplicate $true `
                -FileSizeBytes (Get-Random -Min 4096 -Max 16384) `
                -SimulatedIp $SAME_IP_BOTNET_IP `
                -AttackLabel "combined" `
                -AttackRunId $runTag

            Update-AttackCounters -Outcome $result -LogLine "[$requestCount] $attacker duplicate burst: $result"
        }

        $selectedBots = $persistentBotIds | Get-Random -Count 7
        foreach ($botId in $selectedBots) {
            if ($requestCount -ge $targetRequests) { break }
            $perBotSpike = Get-Random -Minimum 2 -Maximum 4
            for ($spike = 0; $spike -lt $perBotSpike; $spike++) {
                if ($requestCount -ge $targetRequests) { break }
                $requestCount++

                $useDuplicate = ($spike % 2 -eq 0)
                $result = Send-BotRequest `
                    -BotId $botId `
                    -IsDuplicate $useDuplicate `
                    -FileSizeBytes (Get-Random -Min 12288 -Max 196608) `
                    -SimulatedIp $SAME_IP_BOTNET_IP `
                    -AttackLabel "combined" `
                    -AttackRunId $runTag

                $burstType = if ($useDuplicate) { "same-ip duplicate spike" } else { "same-ip burst" }
                Update-AttackCounters -Outcome $result -LogLine "[$requestCount] $botId ${burstType}: $result"
            }
        }
    }
}
else {
    Write-Host "Unknown attack type: $AttackType" -ForegroundColor Red
    Write-Host "Supported: rapid-duplicate, bot-same-ip, combined" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Red
Write-Host "ATTACK SIMULATION COMPLETE" -ForegroundColor Red
Write-Host "==========================================" -ForegroundColor Red
Write-Host ""
Write-Host "Statistics:" -ForegroundColor Cyan
Write-Host "  Total Requests: $requestCount" -ForegroundColor White
Write-Host "  Allowed: $allowedCount" -ForegroundColor Yellow
Write-Host "  Rate Limited: $rateLimitedCount" -ForegroundColor DarkYellow
Write-Host "  Blocked: $blockedCount" -ForegroundColor Red
Write-Host "  Target Requests: $targetRequests" -ForegroundColor DarkGray
$totalSeconds = ((Get-Date) - $startTime).TotalSeconds
Write-Host "  Duration: $([math]::Round($totalSeconds, 2)) seconds" -ForegroundColor White

Write-Host ""
Write-Host "NOTE ABOUT DASHBOARD:" -ForegroundColor Yellow
Write-Host "This simulator now performs REAL uploads to /api/files/upload." -ForegroundColor Gray
Write-Host "Allowed requests appear in My Files; blocked ones are denied and not stored." -ForegroundColor Gray
Write-Host "DDoS Admin metrics will still show blocked attack events." -ForegroundColor Gray
Write-Host ""

# Cleanup
Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
if ($null -ne $Script:SharedHttpClient) { $Script:SharedHttpClient.Dispose() }
