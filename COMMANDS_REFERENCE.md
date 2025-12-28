# 🚀 CloudDrive-AI - Command Reference

## Core Commands (Like Frontend/Backend)

```powershell
npm run dev      # Start Frontend (http://localhost:5173)
npm run server   # Start Backend (http://localhost:8080)
npm run ddos     # Start DDoS ML System
```

---

## Run Everything Together

```powershell
npm run dev:full  # Starts Frontend + Backend
```

---

## 🎯 DDoS Attack Simulator

### Interactive Interface (RECOMMENDED)
```powershell
npm run attack
```

**Features:**
- 🎨 Beautiful terminal UI
- 📋 Menu-driven interface
- ⚙️ Configurable settings
- 📊 Live status monitoring
- 🔥 Multiple attack types

**Menu Options:**
- [1] Rapid Fire Attack
- [2] Duplicate File Spam  
- [3] Massive File Flooding
- [4] Combined Attack (all at once!)
- [5] View Dashboard
- [6] Check Server Status
- [7] Configure Settings
- [0] Exit

---

## Direct Attack Commands

If you prefer direct commands without the menu:

```powershell
npm run attack:rapid       # Rapid fire attack (60s)
npm run attack:duplicate   # Duplicate file spam (60s)
npm run attack:massive     # Massive file flooding (60s)
```

---

## Complete Workflow

### Terminal 1: Start Services
```powershell
npm run dev:full
```

### Terminal 2: Run DDoS System
```powershell
npm run ddos
```

### Terminal 3: Launch Attack Interface
```powershell
npm run attack
```

### Browser: Monitor Dashboard
```
http://localhost:5173/ddos
```

---

## What Each Component Does

| Command | What It Does | Where It Runs |
|---------|-------------|---------------|
| `npm run dev` | Frontend React app | http://localhost:5173 |
| `npm run server` | Backend Node.js API | http://localhost:8080 |
| `npm run ddos` | ML Detection System | Background monitoring |
| `npm run attack` | Attack Simulator UI | Interactive terminal |

---

## Quick Start Guide

### First Time Setup:
```powershell
# 1. Install dependencies
npm install

# 2. Train DDoS model
npm run ddos:train

# 3. Start everything
npm run dev:full
```

### Daily Use:
```powershell
# Just start the app
npm run dev:full
```

### Run Tests:
```powershell
# Terminal 1
npm run dev:full

# Terminal 2 (wait for server to start)
npm run attack
# Then select attack type from menu
```

---

## Screenshots

When you run `npm run attack`, you'll see:

```
  ██████╗ ██████╗  ██████╗ ███████╗    ██████╗ ████████╗████████╗ █████╗  ██████╗██╗  ██╗
  ██╔══██╗██╔══██╗██╔═══██╗██╔════╝   ██╔═══██╗╚══██╔══╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
  ██║  ██║██║  ██║██║   ██║███████╗   ██║   ██║   ██║      ██║   ███████║██║     █████╔╝ 
  ██║  ██║██║  ██║██║   ██║╚════██║   ██║   ██║   ██║      ██║   ██╔══██║██║     ██╔═██╗ 
  ██████╔╝██████╔╝╚██████╔╝███████║   ╚██████╔╝   ██║      ██║   ██║  ██║╚██████╗██║  ██╗
  ╚═════╝ ╚═════╝  ╚═════╝ ╚══════╝    ╚═════╝    ╚═╝      ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝

                        S I M U L A T O R   I N T E R F A C E
                              Testing ML Detection System

  Backend URL: http://localhost:8080

  ┌─────────────────────────────────────────────────────────┐
  │                    ATTACK TYPES                         │
  └─────────────────────────────────────────────────────────┘

    [1]  🔴 Rapid Fire Attack
         → High-frequency requests (test: request rate)

    [2]  🟠 Duplicate File Spam
         → Same file repeatedly (test: duplicate detection)

    [3]  🟡 Massive File Flooding
         → Large files (test: bandwidth abuse)

    [4]  🔥 Combined Attack
         → All patterns together (test: everything)

  Select option:
```

---

## Tips

1. **Always start `npm run dev:full` first** before running attacks
2. **Use `npm run attack`** for best experience (interactive menu)
3. **Open dashboard** at http://localhost:5173/ddos to watch real-time
4. **Run `npm run ddos`** in a separate terminal to monitor ML system
5. **Combined attack (#4)** is the most intensive test

---

## Troubleshooting

### Server not responding?
```powershell
# Make sure server is running
npm run dev:full
```

### DDoS model not found?
```powershell
# Train the model
npm run ddos:train
```

### Want to see what's happening?
```powershell
# Terminal 1: App
npm run dev:full

# Terminal 2: DDoS System
npm run ddos

# Terminal 3: Attack
npm run attack

# Browser: Dashboard
start http://localhost:5173/ddos
```

---

## All Available Commands

```json
{
  "dev": "Start frontend",
  "server": "Start backend",
  "ddos": "Start DDoS ML system",
  "dev:full": "Start frontend + backend",
  "attack": "Interactive attack interface",
  "attack:rapid": "Direct rapid attack",
  "attack:duplicate": "Direct duplicate attack",
  "attack:massive": "Direct massive attack",
  "ddos:train": "Train ML model (first time)",
  "ddos:quick": "Quick retrain model"
}
```

---

## Summary

**To run like frontend/backend:**
```powershell
npm run dev     # Frontend
npm run server  # Backend
npm run ddos    # DDoS System
```

**To launch attacks:**
```powershell
npm run attack  # Interactive menu (RECOMMENDED!)
```

**That's it! 🚀**
