# Admin Tools

This directory contains administrative tools and routes for the inventory management system.

## Admin Utilities

The `admin_utils.py` script provides command-line tools for managing users and admin privileges.

### Available Commands

#### List All Users
```bash
python -m admin.admin_utils list-users
```

#### Make a User an Admin
```bash
python -m admin.admin_utils make-admin user@example.com
```

#### Remove Admin Privileges
```bash
python -m admin.admin_utils remove-admin user@example.com
```

#### Create a New User
```bash
python -m admin.admin_utils create-user new.user@example.com SecurePassword123
```

To create an admin user:
```bash
python -m admin.admin_utils create-user admin.user@example.com SecurePassword123 --admin
```

#### Delete a User
```bash
python -m admin.admin_utils delete-user USER_UID
```

#### Get User Details
```bash
python -m admin.admin_utils get-user USER_UID
```

#### Disable/Enable a User
```bash
python -m admin.admin_utils disable-user USER_UID
python -m admin.admin_utils enable-user USER_UID
```

#### Export Users to JSON
```bash
python -m admin.admin_utils export-users --output users.json
```

## Admin API Routes

The `admin_routes.py` file provides API endpoints that can only be accessed by users with admin privileges.

### User Management Endpoints
- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/<uid>` - Get a specific user
- `POST /api/admin/users` - Create a new user
- `PUT /api/admin/users/<uid>` - Update a user
- `DELETE /api/admin/users/<uid>` - Delete a user
- `POST /api/admin/users/<email>/set-admin` - Set admin status for a user

### Data Management Endpoints
- `GET /api/admin/stats` - Get system-wide statistics
- `GET /api/admin/all-items` - Get all items across all users
- `GET /api/admin/all-sales` - Get all sales across all users
- `GET /api/admin/all-expenses` - Get all expenses across all users

### Admin Status Check
- `GET /api/admin/check` - Check if the current user is an admin

## Important Security Notes

1. Keep the admin tools and credentials secure
2. All admin actions are logged for auditing purposes
3. Users have data isolation by default - only admins can see all data
4. Admin privileges are stored as Firebase custom claims
5. All admin endpoints require the `@require_admin` decorator

## Usage Example

To create your initial admin user:

1. Create a regular user through the web interface
2. Run the admin tool to grant admin privileges:
   ```bash
   python -m admin.admin_utils make-admin your.email@example.com
   ```
3. Verify admin status is active:
   ```bash
   python -m admin.admin_utils get-user YOUR_USER_ID
   ```