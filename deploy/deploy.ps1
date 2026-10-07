$ErrorActionPreference = "Stop"

$Project = "D:\IncidentManagement"
$Server  = "$Project\server"
$Client  = "$Project\client"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Incident Management Deployment" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

function Run-NativeCommand {
    param(
        [string]$Command,
        [string[]]$Arguments
    )

    Write-Host ""
    Write-Host ">>> $Command $($Arguments -join ' ')" -ForegroundColor Cyan

    & $Command @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code $LASTEXITCODE : $Command $($Arguments -join ' ')"
    }
}

try {

    # =========================================
    # 1. Pull latest code
    # =========================================

    Set-Location $Project

    Write-Host ""
    Write-Host "[1/8] Pulling latest code..." -ForegroundColor Yellow

    Run-NativeCommand "git" @("fetch", "origin")
    Run-NativeCommand "git" @("reset", "--hard", "origin/main")


    # =========================================
    # 2. Install server dependencies
    # =========================================

    Write-Host ""
    Write-Host "[2/8] Installing server dependencies..." -ForegroundColor Yellow

    Set-Location $Server

    # Stop API BEFORE npm ci so bcrypt.node is not locked
    Write-Host "Stopping Incident API..." -ForegroundColor Yellow

    & pm2 stop incident-api

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to stop incident-api."
    }

    Start-Sleep -Seconds 2

    Run-NativeCommand "npm" @("ci")


    # =========================================
    # 3. Build server
    # =========================================

    Write-Host ""
    Write-Host "[3/8] Building server..." -ForegroundColor Yellow

    Run-NativeCommand "npm" @("run", "build")


    # =========================================
    # 4. Install client dependencies
    # =========================================

    Write-Host ""
    Write-Host "[4/8] Installing client dependencies..." -ForegroundColor Yellow

    Set-Location $Client

    Run-NativeCommand "npm" @("ci")


    # =========================================
    # 5. Build client
    # =========================================

    Write-Host ""
    Write-Host "[5/8] Building client..." -ForegroundColor Yellow

    Run-NativeCommand "npm" @("run", "build")


    # =========================================
    # 6. Restart API
    # =========================================

    Write-Host ""
    Write-Host "[6/8] Restarting Incident API..." -ForegroundColor Yellow

    & pm2 restart incident-api

    if ($LASTEXITCODE -ne 0) {
        throw "PM2 failed to restart incident-api."
    }

    Start-Sleep -Seconds 5


    # =========================================
    # 7. Check PM2
    # =========================================

    Write-Host ""
    Write-Host "[7/8] Checking PM2 status..." -ForegroundColor Yellow

    & pm2 status

    if ($LASTEXITCODE -ne 0) {
        throw "PM2 status check failed."
    }


    # =========================================
    # 8. API health check
    # =========================================

    Write-Host ""
    Write-Host "[8/8] Checking API health..." -ForegroundColor Yellow

    $response = Invoke-RestMethod `
        -Uri "https://138.252.200.157/incidentManagement/api/health" `
        -Method Get `
        -TimeoutSec 30

    if ($response.success -ne $true) {
        throw "API health check failed."
    }


    # =========================================
    # SUCCESS
    # =========================================

    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host " DEPLOYMENT SUCCESSFUL" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green

    Write-Host ""
    Write-Host "API Health:" -ForegroundColor Green
    $response | Format-Table

    exit 0
}
catch {

    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Red
    Write-Host " DEPLOYMENT FAILED" -ForegroundColor Red
    Write-Host "=========================================" -ForegroundColor Red

    Write-Host ""
    Write-Host "ERROR:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red

    Write-Host ""
    Write-Host "Attempting to restore Incident API..." -ForegroundColor Yellow

    & pm2 restart incident-api

    Start-Sleep -Seconds 5

    Write-Host ""
    Write-Host "Current PM2 status:" -ForegroundColor Yellow

    & pm2 status

    Write-Host ""
    Write-Host "Deployment stopped because a command failed." -ForegroundColor Red

    exit 1
}