# Firebase Authentication Setup Guide

This guide will help you set up Firebase Authentication for the Hypelist application.

## Prerequisites

1. A Firebase account (create one at [firebase.google.com](https://firebase.google.com) if you don't have one)
2. Node.js and npm installed on your machine

## Steps to Configure Firebase

### 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the prompts to create a new project
3. Give your project a name (e.g., "Hypelist")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

### 2. Add a Web App to Your Firebase Project

1. From your Firebase project dashboard, click on the web icon (</>) to add a web app
2. Register your app with a nickname (e.g., "Hypelist Web")
3. Check the option "Also set up Firebase Hosting" if you plan to use Firebase Hosting
4. Click "Register app"
5. Firebase will generate a configuration object with your API keys and project details
6. Copy this configuration, you'll need it in the next step

### 3. Enable Authentication Methods

1. In the Firebase Console, navigate to "Authentication" in the left sidebar
2. Click on the "Sign-in method" tab
3. Enable "Email/Password" authentication
4. Optionally, enable other authentication providers as needed (Google, Facebook, etc.)
5. Click "Save"

### 4. Configure Environment Variables

1. In the root of the project, create a `.env` file based on the `.env.example` template
2. Fill in the environment variables with your Firebase configuration:

```
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

### 5. Install Dependencies

Make sure you have the required Firebase dependencies installed:

```bash
npm install firebase
```

### 6. Verify Setup

1. Start your development server:
```bash
npm start
```

2. Navigate to the signup page and create a test account
3. Verify that the user appears in your Firebase Authentication console

## Security Considerations

- **NEVER commit your `.env` file to Git** - it contains sensitive API keys
- The `.env.example` file provides a template without actual secrets
- Make sure `.env` is listed in your `.gitignore` file
- In production, set environment variables through your hosting platform rather than in files

## Troubleshooting

### Common Issues:

1. **Authentication Error - "Firebase: Error (auth/invalid-api-key)."**
   - Check that your API key in the `.env` file is correct
   - Verify that the environment variables are properly loaded

2. **"Firebase App named '[DEFAULT]' already exists"**
   - This can happen if you're initializing Firebase multiple times
   - Make sure Firebase is only initialized once in your application

3. **CORS Issues**
   - If you're using Firebase Authentication with Firebase Cloud Functions, you may need to configure CORS

For more help, consult the [Firebase Authentication documentation](https://firebase.google.com/docs/auth).