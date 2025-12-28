# CloudDrive-AI Quick Start Guide

Complete guide to run Frontend, Backend, and DDoS ML System

## 🚀 Quick Start (Easiest Way)

### Option 1: Use the PowerShell Script (Recommended)

```powershell
# Run the interactive menu
.\RUN_ALL.ps1
```

This will give you a menu to:
- Start Frontend
- Start Backend  
- Start Both
- Train DDoS Model
- Run Simulator
- etc.

---

## 📋 Manual Commands

### 1. Install Dependencies (First Time Only)

```powershell
# Install Node.js dependencies
npm install

# Install Python dependencies for DDoS system
cd ddos_system\Application_Layer_DDOS
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..\..
```

---

### 2. Start the Application

#### Option A: Start Both Frontend + Backend Together
```powershell
npm run dev:full
```

#### Option B: Start Separately (Two Terminals)

**Terminal 1 - Backend:**
```powershell
npm run server
# Backend runs on http://localhost:8080
```

**Terminal 2 - Frontend:**
```powershell
npm run dev
# Frontend runs on http://localhost:5173
```

---

### 3. Train DDoS ML Model (Required for Full Functionality)

#### Option A: Generate Minimal Training Data & Train
```powershell
cd ddos_system\Application_Layer_DDOS

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Generate minimal training data (if none exists)
python generate_minimal_training_data.py

# Extract features
python src\feature_extractor.py

# Train model
python src\train_isolation_forest.py

# Evaluate model
python src\evaluate_model.py

cd ..\..
```

#### Option B: Use Real Upload Data

1. **Upload files through CloudDrive-AI** (at least 20-30 files)
   - Files are automatically logged to `ddos_system/Application_Layer_DDOS/data/upload_logs.csv`

2. **Train the model:**
   ```powershell
   cd ddos_system\Application_Layer_DDOS
   .\venv\Scripts\Activate.ps1
   python src\feature_extractor.py
   python src\train_isolation_forest.py
   cd ..\..
   ```

#### Option C: Run Full Simulator (Takes ~5 minutes)

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
```

**Terminal 3 - Train:**
```powershell
cd ddos_system\Application_Layer_DDOS
.\venv\Scripts\Activate.ps1
python src\feature_extractor.py
python src\train_isolation_forest.py
python src\evaluate_model.py
```

---

## 📁 Important File Locations

```
CloudDrive-AI/
├── Frontend (React)          → http://localhost:5173
├── Backend (Node.js)         → http://localhost:8080
└── ddos_system/
    └── Application_Layer_DDOS/
        ├── data/
        │   ├── upload_logs.csv          ← Upload logs (created automatically)
        │   └── extracted_features.csv   ← ML features
        └── model/
            ├── isolation_forest.pkl     ← Trained model (after training)
            └── scaler.pkl               ← Feature scaler
```

---

## ✅ Verify Everything Works

### Check Backend
```powershell
# Should return: {"ok":true,"service":"clouddrive-ai",...}
curl http://localhost:8080/api/health
```

### Check Frontend
Open browser: http://localhost:5173

### Check DDoS System
1. Go to http://localhost:5173/ddos
2. Check if model status shows "Active"
3. Upload a file and check risk assessment

---

## 🔧 Troubleshooting

### Error: "Log file not found: data/upload_logs.csv"

**Solution:** Generate minimal training data:
```powershell
cd ddos_system\Application_Layer_DDOS
.\venv\Scripts\Activate.ps1
python generate_minimal_training_data.py
```

### Error: "Features file not found"

**Solution:** Run feature extraction:
```powershell
cd ddos_system\Application_Layer_DDOS
.\venv\Scripts\Activate.ps1
python src\feature_extractor.py
```

### Error: "Model file not found"

**Solution:** Train the model:
```powershell
cd ddos_system\Application_Layer_DDOS
.\venv\Scripts\Activate.ps1
python src\train_isolation_forest.py
```

### Port Already in Use

**Backend (8080):**
```powershell
# Find and kill process
Get-NetTCPConnection -LocalPort 8080 | Select-Object -ExpandProperty OwningProcess | Stop-Process -Force
```

**Frontend (5173):**
```powershell
Get-NetTCPConnection -LocalPort 5173 | Select-Object -ExpandProperty OwningProcess | Stop-Process -Force
```

### Python Virtual Environment Issues

```powershell
# Recreate venv
cd ddos_system\Application_Layer_DDOS
Remove-Item -Recurse -Force venv
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

---

## 📊 What Each Command Does

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start React frontend |
| `npm run server` | Start Node.js backend |
| `npm run dev:full` | Start both together |
| `generate_minimal_training_data.py` | Creates sample upload logs |
| `src/feature_extractor.py` | Extracts ML features from logs |
| `src/train_isolation_forest.py` | Trains the ML model |
| `src/evaluate_model.py` | Shows model performance metrics |
| `src/predict.py` | Tests predictions on data |

---

## 🎯 Complete Workflow (First Time Setup)

```powershell
# 1. Install dependencies
npm install
cd ddos_system\Application_Layer_DDOS
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..\..

# 2. Generate training data & train model
cd ddos_system\Application_Layer_DDOS
.\venv\Scripts\Activate.ps1
python generate_minimal_training_data.py
python src\feature_extractor.py
python src\train_isolation_forest.py
cd ..\..

# 3. Start the application
npm run dev:full

# 4. Open browser
# Frontend: http://localhost:5173
# DDoS Dashboard: http://localhost:5173/ddos
```

---

## 🆘 Need Help?

1. Check error messages carefully
2. Verify Python and Node.js are installed
3. Make sure ports 8080 and 5173 are available
4. Ensure virtual environment is activated when running Python scripts
5. Check that all dependencies are installed



