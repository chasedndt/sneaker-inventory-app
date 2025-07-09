# Sneaker Inventory App - Startup Guide

## Quick Start

### Option 1: Start Everything (Recommended)
```powershell
.\start-dev.ps1
```
This will start both backend and frontend in separate windows.

### Option 2: Manual Start

#### Backend Only
```powershell
.\start-backend.ps1
```
Backend will run on: http://127.0.0.1:5000

#### Frontend Only
```powershell
.\start-frontend.ps1
```
Frontend will run on: http://localhost:3000

### Option 3: Individual Commands

#### Start Backend Manually
```powershell
cd backend
$env:USE_FIREBASE="true"
python app.py
```

#### Start Frontend Manually
```powershell
npm start
```

## Common Issues & Solutions

### 1. "Can't open file 'app.py'"
**Solution**: Make sure you're running the backend from the correct directory:
```powershell
cd backend
python app.py
```

### 2. "Port 3000 already in use"
**Solution**: Kill existing processes:
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace XXXX with actual PID)
taskkill /F /PID XXXX
```

### 3. Backend Environment Issues
**Solution**: Ensure `.env` file exists in `backend/` directory with proper Firebase configuration.

### 4. Node.js Dependencies Missing
**Solution**: Install dependencies:
```powershell
npm install
```

## Application URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://127.0.0.1:5000
- **Backend Health Check**: http://127.0.0.1:5000/api/health

## Architecture

- **Frontend**: React 18 + TypeScript (Port 3000)
- **Backend**: Flask + Firebase (Port 5000)
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Storage**: Firebase Storage

## Development Notes

- The backend uses Firebase Phase 3 configuration
- Currency conversion has been fixed (symbols → ISO codes)
- All test files have been restored for verification
- CORS and CSP headers are configured for Firebase domains 