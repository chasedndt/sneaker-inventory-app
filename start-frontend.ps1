#!/usr/bin/env powershell

# PowerShell script to start the React frontend
Write-Host "Starting Sneaker Inventory Frontend..." -ForegroundColor Green

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "node_modules not found. Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Check if backend is running
$backendRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/health" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        $backendRunning = $true
    }
} catch {
    # Backend not running
}

if (-not $backendRunning) {
    Write-Host "Warning: Backend doesn't appear to be running on port 5000!" -ForegroundColor Yellow
    Write-Host "Please start the backend first using: .\start-backend.ps1" -ForegroundColor Yellow
}

# Start the React application
Write-Host "Starting React development server on http://localhost:3000" -ForegroundColor Cyan
npm start 