# Simple Firebase Setup Guide

## Overview

Your app can now run with either SQLite (current) or Firebase. This guide shows how to switch to Firebase when you're ready.

## Current Status

- **Default**: SQLite (your existing database)
- **Optional**: Firebase (cloud database)
- **Switch**: Set `USE_FIREBASE=true` environment variable

## Quick Switch to Firebase

### 1. Set Environment Variable

**Windows (PowerShell):**
```powershell
$env:USE_FIREBASE="true"
```

**Linux/Mac:**
```bash
export USE_FIREBASE=true
```

### 2. Set Up Firebase Credentials

You need one of these files:
- `backend/firebase-credentials.json` (service account key)
- OR set `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` environment variable
- OR set `GOOGLE_APPLICATION_CREDENTIALS` environment variable

### 3. Set Firebase Project

```powershell
$env:FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
```

### 4. Start Your App

```bash
# Backend
cd backend
python app.py

# Frontend  
npm start
```

## What Changes When You Switch

### With SQLite (Default)
- Data stored locally in `backend/instance/inventory.db`
- Works offline
- Single user (you)

### With Firebase
- Data stored in Google Cloud
- Requires internet connection
- Multi-user ready
- Scalable for SaaS

## Testing the Switch

1. **Start with SQLite** (default) - your existing data
2. **Switch to Firebase** - starts with empty database
3. **Switch back to SQLite** - your old data is still there

## Files You Need

- ✅ `firebase_service.py` - Already created
- ✅ `database_service.py` - Already created  
- ✅ `config.py` - Updated with USE_FIREBASE option
- ⚠️ `firebase-credentials.json` - You need to create this

## Next Steps

1. **Get Firebase credentials** from your Firebase project
2. **Set USE_FIREBASE=true** when ready to switch
3. **Test with empty Firebase database**
4. **Optionally migrate your SQLite data** (separate process)

## Rollback

To go back to SQLite:
```powershell
$env:USE_FIREBASE="false"
# OR
Remove-Item Env:USE_FIREBASE
```

Your SQLite data is never deleted - it's always there as a backup! 