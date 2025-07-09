#!/usr/bin/env powershell

# PowerShell script to start both frontend and backend in development mode
Write-Host "Starting Sneaker Inventory Full Stack Application..." -ForegroundColor Green

# Function to start backend in background
function Start-Backend {
    Write-Host "Starting Backend..." -ForegroundColor Blue
    Start-Process powershell -ArgumentList "-NoExit", "-Command", ".\start-backend.ps1" -WindowStyle Normal
}

# Function to start frontend in background  
function Start-Frontend {
    Write-Host "Starting Frontend..." -ForegroundColor Blue
    Start-Sleep -Seconds 3  # Give backend time to start
    Start-Process powershell -ArgumentList "-NoExit", "-Command", ".\start-frontend.ps1" -WindowStyle Normal
}

# Start both services
Start-Backend
Start-Frontend

Write-Host ""
Write-Host "🚀 Development servers starting..." -ForegroundColor Green
Write-Host "📱 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔧 Backend: http://127.0.0.1:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop services, close both PowerShell windows or use Ctrl+C in each." -ForegroundColor Yellow 