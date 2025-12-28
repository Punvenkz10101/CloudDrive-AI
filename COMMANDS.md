# CloudDrive-AI - Complete Command Reference

Quick reference for all commands to run Frontend, Backend, and DDoS System

---

## 🎯 Fastest Way to Get Started

### PowerShell Script (Interactive Menu)
```powershell
.\RUN_ALL.ps1
```

---

## 📱 Frontend Commands

### Start Frontend Only
```powershell
npm run dev
```
- URL: http://localhost:5173
- Hot reload enabled

---

## 🖥️ Backend Commands

### Start Backend Only
```powershell
npm run server
```
- URL: http://localhost:8080
- API: http://localhost:8080/api

### Health Check
```powershell
curl http://localhost:8080/api/health
```

---

## 🚀 Start Both (Frontend + Backend)

### Recommended: Run Both Together
```powershell
npm run dev:full
```
- Frontend: http://localhost:5173
- Backend: http://localhost:8080

---

## 🤖 DDoS ML System Commands

### Setup Python Environment (First Time)
```powershell
cd ddos_system\Application_Layer_DDOS
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..\..
```

### Generate Minimal Training Data (Quick Solution)
```powershell
cd ddos_system\Application_Layer_DDOS
.\venv\Scripts\Activate.ps1
python generate_minimal_training_data.py
cd ..\..
```

### Extract Features from Logs
```powershell
cd ddos_system\Application_Layer_DDOS
.\venv\Scripts\Activate.ps1
python src\feature_extractor.py
cd ..\..
```

### Train ML Model
```powershell
cd ddos_system\Application_Layer_DDOS
.\venv\Scripts\Activate.ps1
python src\train_isolation_forest.py
cd ..\..
```

### Evaluate Model Performance
```powershell
cd ddos_system\Application_Layer_DDOS
.\venv\Scripts\Activate.ps1
python src\evaluate_model.py
cd ..\..
```

### Test Predictions
```powershell
cd ddos_system\Application_Layer_DDOS
.\venv\Scripts\Activate.ps1
python src\predict.py
cd ..\..
```

---

## 🎬 Complete Training Workflow (All-in-One)

### Quick Training (Uses Minimal Data)
```powershell
cd ddos_system\Application_Layer_DDOS
.\venv\Scripts\Activate.ps1

# Generate data (if needed)
python generate_minimal_training_data.py

# Extract & Train
python src\feature_extractor.py
python src\train_isolation_forest.py
python src\evaluate_model.py

cd ..\..
```

### Full Training (With Simulator - Takes ~5 min)

**Terminal 1 - Mock Server:**
```powershell
cd ddos_system\Application_Layer_DDOS
.\venv\Scripts\Activate.ps1
python mock_server\mock_upload_api.py
```

**Terminal 2 - Simulator:**
```powershell
cd ddos_system\Application_Layer_DDOS
.\venv\Scripts\Activate.ps1
python simulator\upload_simulator.py
# Wait ~5 minutes for completion
```

**Terminal 3 - Training:**
```powershell
cd ddos_system\Application_Layer_DDOS
.\venv\Scripts\Activate.ps1
python src\feature_extractor.py
python src\train_isolation_forest.py
python src\evaluate_model.py
python src\predict.py
```

---

## 📊 Using Real CloudDrive-AI Upload Data

### Step 1: Upload Files
1. Start CloudDrive-AI: `npm run dev:full`
2. Go to http://localhost:5173
3. Upload 20-30 files (they're automatically logged)

### Step 2: Train on Real Data
```powershell
cd ddos_system\Application_Layer_DDOS
.\venv\Scripts\Activate.ps1
python src\feature_extractor.py
python src\train_isolation_forest.py
cd ..\..
```

---

## 🔍 Check System Status

### Check DDoS Model Status
```powershell
# Check if model files exist
Test-Path ddos_system\Application_Layer_DDOS\model\isolation_forest.pkl
Test-Path ddos_system\Application_Layer_DDOS\model\scaler.pkl

# Check training data
if (Test-Path ddos_system\Application_Layer_DDOS\data\upload_logs.csv) {
    $count = (Get-Content ddos_system\Application_Layer_DDOS\data\upload_logs.csv).Count - 1
    Write-Host "Training records: $count"
}
```

### View DDoS Dashboard
1. Start app: `npm run dev:full`
2. Go to: http://localhost:5173/ddos
3. Check model status and metrics

---

## 🛠️ Troubleshooting Commands

### Kill Port 8080 (Backend)
```powershell
Get-NetTCPConnection -LocalPort 8080 | Select-Object -ExpandProperty OwningProcess | Stop-Process -Force
```

### Kill Port 5173 (Frontend)
```powershell
Get-NetTCPConnection -LocalPort 5173 | Select-Object -ExpandProperty OwningProcess | Stop-Process -Force
```

### Recreate Python Virtual Environment
```powershell
cd ddos_system\Application_Layer_DDOS
Remove-Item -Recurse -Force venv
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..\..
```

### Reinstall Node Dependencies
```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

---

## 📝 Common Workflows

### First Time Setup
```powershell
# 1. Install Node deps
npm install

# 2. Setup Python env
cd ddos_system\Application_Layer_DDOS
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 3. Generate data & train
python generate_minimal_training_data.py
python src\feature_extractor.py
python src\train_isolation_forest.py

cd ..\..

# 4. Start app
npm run dev:full
```

### Daily Development
```powershell
# Just start the app
npm run dev:full
```

### Retrain Model with New Data
```powershell
cd ddos_system\Application_Layer_DDOS
.\venv\Scripts\Activate.ps1
python src\feature_extractor.py
python src\train_isolation_forest.py
cd ..\..
```

---

## 🎯 Quick Fixes

### Fix: "Log file not found"
```powershell
cd ddos_system\Application_Layer_DDOS
.\venv\Scripts\Activate.ps1
python generate_minimal_training_data.py
cd ..\..
```

### Fix: "Features file not found"
```powershell
cd ddos_system\Application_Layer_DDOS
.\venv\Scripts\Activate.ps1
python src\feature_extractor.py
cd ..\..
```

### Fix: "Model file not found"
```powershell
cd ddos_system\Application_Layer_DDOS
.\venv\Scripts\Activate.ps1
python src\train_isolation_forest.py
cd ..\..
```

---

## 📚 More Information

- **Full Guide:** See `QUICK_START.md`
- **DDoS System:** See `ddos_system/Application_Layer_DDOS/README.md`
- **DDoS Quick Start:** See `ddos_system/Application_Layer_DDOS/QUICK_START.md`



