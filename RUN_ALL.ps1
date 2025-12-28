# CloudDrive-AI Complete Startup Script
# This script helps you run Frontend, Backend, and DDoS System

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "CloudDrive-AI Startup Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check if Python is installed
try {
    $pythonVersion = python --version
    Write-Host "[OK] Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Python is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "What would you like to do?" -ForegroundColor Yellow
Write-Host "1. Start Frontend (React)" -ForegroundColor White
Write-Host "2. Start Backend Server (Node.js)" -ForegroundColor White
Write-Host "3. Start Both (Frontend + Backend)" -ForegroundColor White
Write-Host "4. Train DDoS ML Model" -ForegroundColor White
Write-Host "5. Run DDoS Simulator (Generate Training Data)" -ForegroundColor White
Write-Host "6. Extract Features & Train Model" -ForegroundColor White
Write-Host "7. View DDoS System Status" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-7)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Starting Frontend..." -ForegroundColor Green
        npm run dev
    }
    "2" {
        Write-Host ""
        Write-Host "Starting Backend Server..." -ForegroundColor Green
        npm run server
    }
    "3" {
        Write-Host ""
        Write-Host "Starting Frontend + Backend..." -ForegroundColor Green
        Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
        Write-Host "Backend: http://localhost:8080" -ForegroundColor Cyan
        Write-Host ""
        npm run dev:full
    }
    "4" {
        Write-Host ""
        Write-Host "Training DDoS ML Model..." -ForegroundColor Green
        Set-Location ddos_system\Application_Layer_DDOS
        
        # Check if venv exists, create if not
        if (-not (Test-Path "venv")) {
            Write-Host "Creating virtual environment..." -ForegroundColor Yellow
            python -m venv venv
        }
        
        # Activate venv
        Write-Host "Activating virtual environment..." -ForegroundColor Yellow
        & .\venv\Scripts\Activate.ps1
        
        # Install dependencies
        Write-Host "Installing dependencies..." -ForegroundColor Yellow
        pip install -r requirements.txt -q
        
        # Generate minimal data if needed
        Write-Host "Checking for training data..." -ForegroundColor Yellow
        python generate_minimal_training_data.py
        
        # Extract features
        Write-Host "Extracting features..." -ForegroundColor Yellow
        python src\feature_extractor.py
        
        # Train model
        Write-Host "Training model..." -ForegroundColor Yellow
        python src\train_isolation_forest.py
        
        # Evaluate
        Write-Host "Evaluating model..." -ForegroundColor Yellow
        python src\evaluate_model.py
        
        Write-Host ""
        Write-Host "[OK] Model training complete!" -ForegroundColor Green
        Set-Location ..\..
    }
    "5" {
        Write-Host ""
        Write-Host "Starting DDoS Simulator..." -ForegroundColor Green
        Write-Host "This will generate training data (takes ~5 minutes)" -ForegroundColor Yellow
        Set-Location ddos_system\Application_Layer_DDOS
        
        if (-not (Test-Path "venv")) {
            python -m venv venv
        }
        & .\venv\Scripts\Activate.ps1
        pip install -r requirements.txt -q
        
        Write-Host "Starting mock server in background..." -ForegroundColor Yellow
        Start-Process python -ArgumentList "mock_server\mock_upload_api.py" -WindowStyle Hidden
        Start-Sleep -Seconds 3
        
        Write-Host "Running simulator..." -ForegroundColor Yellow
        python simulator\upload_simulator.py
        
        Write-Host "[OK] Simulator complete!" -ForegroundColor Green
        Set-Location ..\..
    }
    "6" {
        Write-Host ""
        Write-Host "Extracting Features & Training Model..." -ForegroundColor Green
        Set-Location ddos_system\Application_Layer_DDOS
        
        if (-not (Test-Path "venv")) {
            python -m venv venv
        }
        & .\venv\Scripts\Activate.ps1
        pip install -r requirements.txt -q
        
        # Check if data exists, generate if not
        if (-not (Test-Path "data\upload_logs.csv") -or ((Get-Content "data\upload_logs.csv").Count -le 1)) {
            Write-Host "No training data found. Generating minimal data..." -ForegroundColor Yellow
            python generate_minimal_training_data.py
        }
        
        python src\feature_extractor.py
        python src\train_isolation_forest.py
        python src\evaluate_model.py
        
        Write-Host ""
        Write-Host "[OK] Complete!" -ForegroundColor Green
        Set-Location ..\..
    }
    "7" {
        Write-Host ""
        Write-Host "DDoS System Status:" -ForegroundColor Green
        Set-Location ddos_system\Application_Layer_DDOS
        
        if (Test-Path "data\upload_logs.csv") {
            $logLines = (Get-Content "data\upload_logs.csv").Count - 1
            Write-Host "  Training Data: $logLines records" -ForegroundColor Green
        } else {
            Write-Host "  Training Data: None" -ForegroundColor Red
        }
        
        if (Test-Path "model\isolation_forest.pkl") {
            Write-Host "  ML Model: Trained" -ForegroundColor Green
        } else {
            Write-Host "  ML Model: Not trained" -ForegroundColor Yellow
        }
        
        if (Test-Path "data\extracted_features.csv") {
            Write-Host "  Features: Extracted" -ForegroundColor Green
        } else {
            Write-Host "  Features: Not extracted" -ForegroundColor Yellow
        }
        
        Set-Location ..\..
    }
    default {
        Write-Host "Invalid choice" -ForegroundColor Red
    }
}



