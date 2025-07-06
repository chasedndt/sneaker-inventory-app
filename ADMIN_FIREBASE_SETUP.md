# Firebase Admin & User Tier Setup Guide

This guide covers the Firebase configuration needed for the admin panel and user tier management system.

## 🚀 Prerequisites

1. Firebase project created and configured (see main FIREBASE_SETUP.md)
2. Firebase Admin SDK credentials configured
3. Basic authentication working

## 🔑 Firebase Admin SDK Setup

### 1. Generate Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** > **Service Accounts**
4. Click **Generate new private key**
5. Download the JSON file securely

### 2. Configure Backend Environment

Add to your backend environment (backend/.env or environment variables):

```bash
# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=/path/to/service-account-key.json

# Alternative: Set the JSON content directly
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

### 3. Backend Configuration

Ensure your backend has Firebase Admin SDK initialized:

```python
# backend/config.py or similar
import firebase_admin
from firebase_admin import credentials

# Initialize Firebase Admin SDK
if not firebase_admin._apps:
    cred = credentials.Certificate('path/to/service-account-key.json')
    firebase_admin.initialize_app(cred)
```

## 👤 Setting Up Custom Claims

### Understanding Custom Claims

Custom claims are used for:
- **planTier**: 'free', 'starter', 'professional' (user plan)
- **admin**: true/false (admin privileges)
- **accountTierSet**: true/false (flag for admin-set tiers)

### Initial Admin User Setup

**Method 1: Command Line (Recommended)**

```bash
# Navigate to backend directory
cd backend

# Create first admin user
python -m admin.admin_utils create-user admin@yourdomain.com SecurePassword123 --admin
```

**Method 2: Firebase Console + Command Line**

1. Create user via web signup
2. Get the user UID from Firebase Authentication console
3. Set admin claims:

```bash
python -m admin.admin_utils make-admin user@example.com
```

**Method 3: Firebase Console Manual Setup**

1. Go to Firebase Console > Authentication > Users
2. Find your user, click three dots menu
3. Select "Set custom user claims"
4. Add:
```json
{
  "admin": true,
  "planTier": "admin"
}
```

## 🛠️ Required Firebase Features

### 1. Authentication Methods

Enable in Firebase Console > Authentication > Sign-in method:
- ✅ Email/Password
- ✅ (Optional) Google, GitHub, etc.

### 2. Security Rules

No additional Firestore rules needed - the system uses Firebase Auth custom claims.

### 3. Functions (Optional)

If you want to use Firebase Functions for plan tier management:

```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.setUserPlanTier = functions.https.onCall(async (data, context) => {
  // Verify admin privileges
  if (!context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }
  
  const { uid, planTier } = data;
  
  // Update custom claims
  await admin.auth().setCustomUserClaims(uid, { 
    planTier: planTier,
    planTierSet: true 
  });
  
  return { success: true };
});
```

## 🔐 Security Configuration

### 1. Admin Protection Rules

The system automatically protects admin routes using:

- **Frontend**: Account tier checking
- **Backend**: `@require_admin` decorator
- **Firebase**: Custom claims verification

### 2. Plan Tier Enforcement

Configure feature access in your frontend:

```typescript
// Example: Feature access control
const hasFeatureAccess = (feature: string, userTier: string) => {
  const tierFeatures = {
    free: ['basic_inventory', 'limited_analytics'],
    starter: ['basic_inventory', 'basic_analytics', 'bulk_operations'],
    professional: ['all_features', 'advanced_analytics', 'revenue_tools'],
    admin: ['all_features', 'admin_panel', 'user_management']
  };
  
  return tierFeatures[userTier]?.includes(feature) || 
         tierFeatures[userTier]?.includes('all_features');
};
```

## 🔄 Testing the Setup

### 1. Test Admin Access

```bash
# Create test admin
python -m admin.admin_utils create-user testadmin@test.com password123 --admin

# Verify admin status
python -m admin.admin_utils get-user <USER_UID>
```

### 2. Test Plan Tier Updates

1. Create regular user via signup
2. Login as admin
3. Go to `/admin/users`
4. Update user's plan tier
5. Verify changes reflect immediately

### 3. Test Feature Access

1. Login as free user
2. Check that advanced features are locked
3. Promote to professional via admin panel
4. Verify features unlock without re-login

## 🚨 Security Checklist

### ✅ Firebase Security

- [ ] Service account key is secure and not in version control
- [ ] Admin SDK properly initialized
- [ ] Custom claims are being set correctly
- [ ] Admin routes require authentication

### ✅ Backend Security

- [ ] `@require_admin` decorator on all admin endpoints
- [ ] User isolation enforced (users can only see their data)
- [ ] Admin actions are logged
- [ ] Input validation on plan tier updates

### ✅ Frontend Security

- [ ] Admin routes protected with ProtectedRoute
- [ ] Account tier checked before showing features
- [ ] Sensitive admin components not rendered for non-admins
- [ ] API calls include proper authentication headers

## 🐛 Troubleshooting

### Common Issues

**1. "Admin access denied" errors**
```bash
# Check user's custom claims
python -m admin.admin_utils get-user <USER_UID>

# Expected output should include:
# "custom_claims": {"admin": true}
```

**2. Plan tier changes not reflecting**
- Clear browser cache/localStorage
- Check Firebase token expiration
- Verify backend logs for errors
- Force token refresh in browser dev tools

**3. Custom claims not being set**
- Verify Firebase Admin SDK initialization
- Check service account permissions
- Ensure proper environment variable setup

**4. Backend admin routes failing**
- Check Firebase service account key path
- Verify CORS configuration
- Check network connectivity to Firebase

### Debug Commands

```bash
# Check Firebase connection
python -c "import firebase_admin; print('Firebase Admin SDK available')"

# List all users and their claims
python -m admin.admin_utils list-users

# Test admin endpoint
curl -H "Authorization: Bearer <TOKEN>" http://localhost:5000/api/admin/check
```

## 📋 Environment Variables Checklist

Ensure these are set in your environment:

### Backend (.env)
```bash
# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=/path/to/key.json
# OR
GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json

# Flask settings
FLASK_ENV=development
FLASK_DEBUG=True
```

### Frontend (.env)
```bash
# Firebase Web SDK (already configured)
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
# ... other Firebase config
```

## 🎯 Next Steps

After completing this setup:

1. **Create your first admin user**
2. **Test the admin panel interface**
3. **Configure plan tier features as needed**
4. **Set up monitoring and alerting**
5. **Train team members on admin procedures**
6. **Implement backup and recovery procedures**

## 🔗 Related Documentation

- [Main Firebase Setup Guide](FIREBASE_SETUP.md)
- [Admin Tools README](backend/admin/README.md)
- [API Documentation](API_DOCS.md)

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Firebase Console for errors
3. Check backend logs for detailed error messages
4. Verify all environment variables are set correctly 