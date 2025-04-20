#!/usr/bin/env python3
# backend/admin/admin_utils.py
# Utility script for performing admin tasks from the command line
# Usage: python -m admin.admin_utils <command> [<args>]

import sys
import os
import json
import argparse

# Add the parent directory to the path so we can import the middleware
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from middleware.auth import (
    initialize_firebase, 
    set_user_admin_status,
    get_all_users,
    create_user,
    delete_user,
    update_user,
    get_user_by_id
)

def setup_parser():
    """Set up command line argument parser"""
    parser = argparse.ArgumentParser(description='Admin utilities for inventory management system')
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    # List users command
    list_parser = subparsers.add_parser('list-users', help='List all users')
    
    # Make admin command
    admin_parser = subparsers.add_parser('make-admin', help='Make a user an admin')
    admin_parser.add_argument('email', help='Email of the user to make admin')
    
    # Remove admin command
    remove_admin_parser = subparsers.add_parser('remove-admin', help='Remove admin privileges from a user')
    remove_admin_parser.add_argument('email', help='Email of the user to remove admin privileges from')
    
    # Create user command
    create_parser = subparsers.add_parser('create-user', help='Create a new user')
    create_parser.add_argument('email', help='Email for the new user')
    create_parser.add_argument('password', help='Password for the new user')
    create_parser.add_argument('--display-name', help='Display name for the new user')
    create_parser.add_argument('--admin', action='store_true', help='Make the new user an admin')
    
    # Delete user command
    delete_parser = subparsers.add_parser('delete-user', help='Delete a user')
    delete_parser.add_argument('uid', help='User ID to delete')
    
    # Get user command
    get_parser = subparsers.add_parser('get-user', help='Get user details')
    get_parser.add_argument('uid', help='User ID to get details for')
    
    # Disable user command
    disable_parser = subparsers.add_parser('disable-user', help='Disable a user account')
    disable_parser.add_argument('uid', help='User ID to disable')

    # Enable user command
    enable_parser = subparsers.add_parser('enable-user', help='Enable a user account')
    enable_parser.add_argument('uid', help='User ID to enable')
    
    # Export users command
    export_parser = subparsers.add_parser('export-users', help='Export users to a JSON file')
    export_parser.add_argument('--output', default='users_export.json', help='Output file name')
    
    return parser

def list_users_command():
    """List all users in the system"""
    print("Listing all users...")
    
    users = get_all_users()
    if users is None:
        print("Error: Failed to retrieve users")
        return 1
    
    print(f"Found {len(users)} users:")
    for user in users:
        admin_status = " (admin)" if user.get('is_admin', False) else ""
        disabled_status = " [DISABLED]" if user.get('disabled', False) else ""
        print(f"- {user.get('email', 'No email')} ({user.get('uid')}){admin_status}{disabled_status}")
    
    return 0

def make_admin_command(email):
    """Make a user an admin"""
    print(f"Making user {email} an admin...")
    
    success, message = set_user_admin_status(email, True)
    if not success:
        print(f"Error: {message}")
        return 1
    
    print(f"Success: {message}")
    return 0

def remove_admin_command(email):
    """Remove admin privileges from a user"""
    print(f"Removing admin privileges from user {email}...")
    
    success, message = set_user_admin_status(email, False)
    if not success:
        print(f"Error: {message}")
        return 1
    
    print(f"Success: {message}")
    return 0

def create_user_command(email, password, display_name=None, is_admin=False):
    """Create a new user"""
    print(f"Creating new user {email}...")
    
    success, result = create_user(email, password, display_name, is_admin)
    if not success:
        print(f"Error: {result}")
        return 1
    
    print(f"Success: Created user with ID {result.uid}")
    if is_admin:
        print("User has been granted admin privileges")
    
    return 0

def delete_user_command(uid):
    """Delete a user"""
    print(f"Deleting user {uid}...")
    
    success, message = delete_user(uid)
    if not success:
        print(f"Error: {message}")
        return 1
    
    print(f"Success: {message}")
    return 0

def get_user_command(uid):
    """Get user details"""
    print(f"Getting details for user {uid}...")
    
    user = get_user_by_id(uid)
    if user is None:
        print(f"Error: User with ID {uid} not found")
        return 1
    
    print("User details:")
    for key, value in user.items():
        print(f"- {key}: {value}")
    
    return 0

def disable_user_command(uid):
    """Disable a user account"""
    print(f"Disabling user {uid}...")
    
    success, result = update_user(uid, {'disabled': True})
    if not success:
        print(f"Error: {result}")
        return 1
    
    print(f"Success: User {uid} has been disabled")
    return 0

def enable_user_command(uid):
    """Enable a user account"""
    print(f"Enabling user {uid}...")
    
    success, result = update_user(uid, {'disabled': False})
    if not success:
        print(f"Error: {result}")
        return 1
    
    print(f"Success: User {uid} has been enabled")
    return 0

def export_users_command(output):
    """Export users to a JSON file"""
    print(f"Exporting users to {output}...")
    
    users = get_all_users()
    if users is None:
        print("Error: Failed to retrieve users")
        return 1
    
    try:
        with open(output, 'w') as f:
            json.dump(users, f, indent=2)
        
        print(f"Success: Exported {len(users)} users to {output}")
        return 0
    except Exception as e:
        print(f"Error exporting users: {str(e)}")
        return 1

def main():
    """Main entry point"""
    parser = setup_parser()
    args = parser.parse_args()
    
    # Initialize Firebase Admin SDK
    if not initialize_firebase():
        print("Error: Failed to initialize Firebase Admin SDK")
        return 1
    
    # Dispatch to the appropriate command
    if args.command == 'list-users':
        return list_users_command()
    elif args.command == 'make-admin':
        return make_admin_command(args.email)
    elif args.command == 'remove-admin':
        return remove_admin_command(args.email)
    elif args.command == 'create-user':
        return create_user_command(args.email, args.password, args.display_name, args.admin)
    elif args.command == 'delete-user':
        return delete_user_command(args.uid)
    elif args.command == 'get-user':
        return get_user_command(args.uid)
    elif args.command == 'disable-user':
        return disable_user_command(args.uid)
    elif args.command == 'enable-user':
        return enable_user_command(args.uid)
    elif args.command == 'export-users':
        return export_users_command(args.output)
    else:
        parser.print_help()
        return 1

if __name__ == '__main__':
    sys.exit(main())