# Admin Tools & User Tier Management

This directory contains administrative tools and routes for the Hypelist inventory management system, including user tier management and access control.

## 🚀 Quick Start

### 1. Create Your First Admin User

**Option A: Via Command Line (Recommended)**
```bash
# Navigate to backend directory
cd backend

# Create an admin user
python -m admin.admin_utils create-user admin@yourdomain.com SecurePassword123 --admin
```

**Option B: Via Web Interface**
1. Sign up normally at `/signup`
2. Use command line to promote to admin:
```bash
python -m admin.admin_utils make-admin your@email.com
```

### 2. Access Admin Panel

1. Log in with your admin account
2. Navigate to `/admin` to see the admin control panel
3. Navigate to `/admin/users` to manage users and plan tiers

## 📋 Plan Tier System

The system supports three user tiers plus admin:

### **Free Tier**
- Limited analytics
- Basic inventory tracking
- 30 item limit warning
- Community support

### **Starter Tier**
- Basic analytics
- Enhanced inventory features
- Email support
- Bulk operations

### **Professional Tier**
- Full analytics + revenue tools
- Advanced features
- Priority support
- API access

### **Admin Tier**
- Full system access
- User management
- Plan tier management
- System statistics

## 🎛️ Admin Interface Features

### User Management (`/admin/users`)
- **View All Users**: Email, UID, signup date, current plan tier
- **Search & Filter**: By email, UID, or display name
- **Plan Tier Management**: Update user tiers instantly
- **User Status**: View active/disabled status and admin roles

### Plan Tier Updates
- Real-time tier changes (no re-login required)
- Immediate feature access updates
- Audit logging of all changes

## 🔧 Command Line Tools

### User Management Commands

#### List All Users
```bash
python -m admin.admin_utils list-users
```

#### Grant Admin Privileges
```bash
python -m admin.admin_utils make-admin user@example.com
```

#### Revoke Admin Privileges
```bash
python -m admin.admin_utils remove-admin user@example.com
```

#### Create New User
```bash
# Regular user
python -m admin.admin_utils create-user new.user@example.com SecurePassword123

# Admin user
python -m admin.admin_utils create-user admin.user@example.com SecurePassword123 --admin
```

#### User Details & Management
```bash
# Get user details
python -m admin.admin_utils get-user USER_UID

# Disable/Enable user
python -m admin.admin_utils disable-user USER_UID
python -m admin.admin_utils enable-user USER_UID

# Delete user
python -m admin.admin_utils delete-user USER_UID
```

#### Export User Data
```bash
python -m admin.admin_utils export-users --output users.json
```

## 🌐 API Endpoints

### User Management
- `GET /api/admin/users` - Get all users with plan tier info
- `GET /api/admin/users/<uid>` - Get specific user details
- `PUT /api/admin/users/<uid>/plan-tier` - Update user's plan tier
- `POST /api/admin/users` - Create new user
- `PUT /api/admin/users/<uid>` - Update user properties
- `DELETE /api/admin/users/<uid>` - Delete user
- `POST /api/admin/users/<email>/set-admin` - Set admin status

### Plan Tier Management
```javascript
// Update user plan tier
PUT /api/admin/users/<uid>/plan-tier
{
  "planTier": "free" | "starter" | "professional"
}
```

### System Statistics
- `GET /api/admin/stats` - System-wide statistics
- `GET /api/admin/all-items` - All items across users
- `GET /api/admin/all-sales` - All sales across users
- `GET /api/admin/all-expenses` - All expenses across users
- `GET /api/admin/check` - Check admin status

## 🔒 Security & Access Control

### Frontend Protection
- Route-level protection with `ProtectedRoute`
- Account tier checking in components
- Real-time feature access control

### Backend Protection
- `@require_admin` decorator on all admin endpoints
- Firebase custom claims verification
- Automatic audit logging

### Plan Tier Enforcement
- **Free Tier**: ROI metrics locked, basic analytics only
- **Starter Tier**: Basic analytics unlocked
- **Professional Tier**: Full analytics + revenue tools
- **Admin Tier**: Full system access

## 🔄 Real-Time Updates

When an admin updates a user's plan tier:
1. Backend updates Firebase custom claims
2. User's token refreshes automatically
3. Frontend immediately reflects new permissions
4. No re-login required

## 📝 Usage Examples

### Promote User to Professional
1. Go to `/admin/users`
2. Search for user by email
3. Click edit icon
4. Select "Professional" from dropdown
5. Click "Update Plan Tier"

### Bulk User Management
```bash
# Create multiple test users
for i in {1..5}; do
  python -m admin.admin_utils create-user "test$i@example.com" "password123"
done

# Export all users for analysis
python -m admin.admin_utils export-users --output user_report.json
```

## 🚨 Important Notes

1. **Admin privileges are powerful** - Use responsibly
2. **All admin actions are logged** - For security auditing
3. **Plan tier changes are immediate** - Users see changes instantly
4. **Firebase setup required** - Ensure proper Firebase configuration
5. **Backup before bulk operations** - Especially user deletions

## 🔧 Troubleshooting

### Common Issues

**"Access Denied" on admin pages**
- Check Firebase custom claims: `admin: true`
- Verify account tier is set to 'admin'
- Clear browser cache and re-login

**Plan tier changes not reflecting**
- Check backend logs for errors
- Verify Firebase connection
- Force token refresh in browser

**Command line tools not working**
- Ensure you're in the backend directory
- Check Firebase admin SDK configuration
- Verify network connectivity

## 🎯 Next Steps

After setup:
1. Create admin account
2. Test user management interface
3. Configure plan tier features as needed
4. Set up monitoring and logging
5. Train team on admin procedures
2. Run the admin tool to grant admin privileges:
   ```bash
   python -m admin.admin_utils make-admin your.email@example.com
   ```
3. Verify admin status is active:
   ```bash
   python -m admin.admin_utils get-user YOUR_USER_ID
   ```