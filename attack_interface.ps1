# Interactive DDoS Attack Simulator Interface
# Launch this to access the attack menu

param(
    [string]$BackendUrl = "http://localhost:8080"
)

$Host.UI.RawUI.WindowTitle = "DDoS Attack Simulator - CloudDrive-AI"

function Show-Banner {
    Clear-Host
    Write-Host ""
    Write-Host "  DDOS ATTACK SIMULATOR" -ForegroundColor Red
    Write-Host "  ===========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "  CloudDrive-AI Testing Interface" -ForegroundColor Yellow
    Write-Host "  Testing ML Detection System" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  ===========================================" -ForegroundColor DarkGray
    Write-Host ""
}

function Show-Menu {
    Write-Host "  Backend URL: $BackendUrl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  ATTACK TYPES:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "    [1] Rapid Fire Attack" -ForegroundColor Red
    Write-Host "        High-frequency requests" -ForegroundColor Gray
    Write-Host ""
    Write-Host "    [2] Duplicate File Spam" -ForegroundColor Yellow
    Write-Host "        Same file repeatedly" -ForegroundColor Gray
    Write-Host ""
    Write-Host "    [3] Massive File Flooding" -ForegroundColor Yellow
    Write-Host "        Large files" -ForegroundColor Gray
    Write-Host ""
    Write-Host "    [4] Combined Attack" -ForegroundColor Red
    Write-Host "        All patterns together" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  OTHER OPTIONS:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "    [5] View DDoS Dashboard" -ForegroundColor Cyan
    Write-Host "    [6] Check Server Status" -ForegroundColor Cyan
    Write-Host "    [7] Configure Settings" -ForegroundColor Cyan
    Write-Host "    [0] Exit" -ForegroundColor White
    Write-Host ""
    Write-Host "  ===========================================" -ForegroundColor DarkGray
    Write-Host ""
}

function Test-ServerStatus {
    Write-Host "  [INFO] Checking server status..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "$BackendUrl/api/health" -Method GET -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        Write-Host "  [OK] Server is online and responding" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "  [ERROR] Server not responding at $BackendUrl" -ForegroundColor Red
        Write-Host "  [!] Please start the server with: npm run dev:full" -ForegroundColor Yellow
        return $false
    }
}

function Start-AttackSimulation {
    param(
        [string]$AttackType,
        [string]$DisplayName,
        [int]$Duration = 60
    )
    
    Show-Banner
    Write-Host "  LAUNCHING: $DisplayName" -ForegroundColor Red
    Write-Host "  ===========================================" -ForegroundColor Red
    Write-Host ""
    
    Write-Host "  Duration (seconds) [default: 60]: " -NoNewline -ForegroundColor Cyan
    $userDuration = Read-Host
    if ($userDuration -match '^\d+$') {
        $Duration = [int]$userDuration
    }
    
    Write-Host ""
    Write-Host "  Starting attack in..." -ForegroundColor Yellow
    for ($i = 3; $i -gt 0; $i--) {
        Write-Host "    $i..." -ForegroundColor Red
        Start-Sleep -Seconds 1
    }
    Write-Host ""
    Write-Host "  ATTACK STARTED" -ForegroundColor Red
    Write-Host ""
    
    $scriptPath = Join-Path $PSScriptRoot "ddos_attack_simulator.ps1"
    & $scriptPath -AttackType $AttackType -Duration $Duration -BackendUrl $BackendUrl
    
    Write-Host ""
    Write-Host "  ===========================================" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  Press any key to return to menu..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function Start-CombinedAttack {
    Show-Banner
    Write-Host "  LAUNCHING: COMBINED MULTI-VECTOR ATTACK" -ForegroundColor Red
    Write-Host "  ===========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "  This will launch ALL attack types simultaneously!" -ForegroundColor Yellow
    Write-Host "  - Rapid Fire (high frequency)" -ForegroundColor White
    Write-Host "  - Duplicate Spam (same files)" -ForegroundColor White
    Write-Host "  - Massive Files (large uploads)" -ForegroundColor White
    Write-Host ""
    Write-Host "  Duration (seconds) [default: 60]: " -NoNewline -ForegroundColor Cyan
    $durationInput = Read-Host
    if ($durationInput -match '^\d+$') {
        $attackDuration = [int]$durationInput
    }
    else {
        $attackDuration = 60
    }
    
    Write-Host ""
    Write-Host "  WARNING: This is an intensive operation!" -ForegroundColor Red
    Write-Host "  Continue? (Y/N): " -NoNewline -ForegroundColor Yellow
    $confirm = Read-Host
    
    if ($confirm -ne 'Y' -and $confirm -ne 'y') {
        Write-Host "  [!] Attack cancelled" -ForegroundColor Yellow
        Start-Sleep -Seconds 2
        return
    }
    
    Write-Host ""
    Write-Host "  Starting combined attack..." -ForegroundColor Yellow
    Write-Host ""
    
    $scriptPath = Join-Path $PSScriptRoot "ddos_attack_simulator.ps1"
    
    $job1 = Start-Job -ScriptBlock {
        param($script, $url, $dur)
        & $script -AttackType rapid -BackendUrl $url -Duration $dur
    } -ArgumentList $scriptPath, $BackendUrl, $attackDuration
    
    $job2 = Start-Job -ScriptBlock {
        param($script, $url, $dur)
        & $script -AttackType duplicate -BackendUrl $url -Duration $dur
    } -ArgumentList $scriptPath, $BackendUrl, $attackDuration
    
    $job3 = Start-Job -ScriptBlock {
        param($script, $url, $dur)
        & $script -AttackType massive -BackendUrl $url -Duration $dur
    } -ArgumentList $scriptPath, $BackendUrl, $attackDuration
    
    Write-Host "  [OK] Rapid Fire Attack launched (Background)" -ForegroundColor Green
    Write-Host "  [OK] Duplicate Spam Attack launched (Background)" -ForegroundColor Green
    Write-Host "  [OK] Massive File Attack launched (Background)" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Waiting for attacks to complete (${attackDuration} seconds)..." -ForegroundColor Yellow
    
    Wait-Job -Job $job1, $job2, $job3 | Out-Null
    
    Write-Host ""
    Write-Host "  Combined attack completed!" -ForegroundColor Green
    
    Remove-Job -Job $job1, $job2, $job3
    
    Write-Host ""
    Write-Host "  Press any key to return to menu..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function Update-Settings {
    Show-Banner
    Write-Host "  SETTINGS" -ForegroundColor Cyan
    Write-Host "  ===========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Current Backend URL: $BackendUrl" -ForegroundColor White
    Write-Host ""
    Write-Host "  Enter new Backend URL (or press Enter to keep current): " -ForegroundColor Yellow
    Write-Host "  > " -NoNewline -ForegroundColor Cyan
    $newUrl = Read-Host
    
    if ($newUrl -ne "") {
        $script:BackendUrl = $newUrl
        Write-Host ""
        Write-Host "  [OK] Backend URL updated to: $BackendUrl" -ForegroundColor Green
    }
    else {
        Write-Host ""
        Write-Host "  [!] Keeping current URL" -ForegroundColor Yellow
    }
    
    Start-Sleep -Seconds 2
}

# Main loop
while ($true) {
    Show-Banner
    Show-Menu
    
    Write-Host "  Select option: " -NoNewline -ForegroundColor Cyan
    $choice = Read-Host
    
    switch ($choice) {
        "1" {
            if (Test-ServerStatus) {
                Start-AttackSimulation -AttackType "rapid" -DisplayName "Rapid Fire Attack"
            }
            else {
                Write-Host ""
                Write-Host "  Press any key to continue..." -ForegroundColor Gray
                $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
            }
        }
        "2" {
            if (Test-ServerStatus) {
                Start-AttackSimulation -AttackType "duplicate" -DisplayName "Duplicate File Spam"
            }
            else {
                Write-Host ""
                Write-Host "  Press any key to continue..." -ForegroundColor Gray
                $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
            }
        }
        "3" {
            if (Test-ServerStatus) {
                Start-AttackSimulation -AttackType "massive" -DisplayName "Massive File Flooding"
            }
            else {
                Write-Host ""
                Write-Host "  Press any key to continue..." -ForegroundColor Gray
                $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
            }
        }
        "4" {
            if (Test-ServerStatus) {
                Start-CombinedAttack
            }
            else {
                Write-Host ""
                Write-Host "  Press any key to continue..." -ForegroundColor Gray
                $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
            }
        }
        "5" {
            Write-Host ""
            Write-Host "  [INFO] Opening DDoS Dashboard in browser..." -ForegroundColor Cyan
            Start-Process "http://localhost:5173/ddos"
            Start-Sleep -Seconds 2
        }
        "6" {
            Write-Host ""
            Test-ServerStatus
            Write-Host ""
            Write-Host "  Press any key to continue..." -ForegroundColor Gray
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        }
        "7" {
            Update-Settings
        }
        "0" {
            Show-Banner
            Write-Host "  Exiting DDoS Attack Simulator..." -ForegroundColor Yellow
            Write-Host ""
            Start-Sleep -Seconds 1
            exit 0
        }
        default {
            Write-Host ""
            Write-Host "  [!] Invalid option. Please try again." -ForegroundColor Red
            Start-Sleep -Seconds 2
        }
    }
}
