#!/usr/bin/env powershell

# PowerShell script to start the Flask backend
Write-Host "Starting Sneaker Inventory Backend..." -ForegroundColor Green

# Navigate to backend directory
Set-Location backend

# Set environment variables
$env:USE_FIREBASE = "true"
$env:FLASK_ENV = "development"

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Warning: .env file not found in backend directory!" -ForegroundColor Yellow
    Write-Host "Please ensure Firebase configuration is set up properly." -ForegroundColor Yellow
}

# Start the Flask application
Write-Host "Starting Flask on http://127.0.0.1:5000" -ForegroundColor Cyan
python app.py 