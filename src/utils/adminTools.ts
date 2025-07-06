// src/utils/adminTools.ts

import { AppUser } from '../contexts/AuthContext'; // Corrected path
import { api } from '../services/api';

/**
 * Checks if the current user has admin privileges.
 * Relies on a custom claim 'admin' being set to true on the user's Firebase token.
 */
export const isAdmin = (user: AppUser | null): boolean => {
  // Check if user exists and then if customClaims exists and then if admin is true
  return !!user?.customClaims?.admin;
};

/**
 * Grant a specified number of items to a user.
 * This calls the backend admin endpoint to actually grant items.
 * 
 * @param userId - The user ID to grant items to.
 * @param numberOfItems - The number of items to grant (defaults to 50 for Free tier testing).
 */
export const grantFreeItems = async (userId: string, numberOfItems = 50): Promise<void> => {
  try {
    const response = await api.authenticatedFetch('http://127.0.0.1:5000/api/admin/grant-items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        userId: userId, 
        itemCount: numberOfItems 
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to grant items' }));
      throw new Error(errorData.error || 'Failed to grant items');
    }

    const result = await response.json();
    console.log('Items granted successfully:', result);
    alert(`Successfully granted ${numberOfItems} items to user ${userId}`);
  } catch (error) {
    console.error('Failed to grant items:', error);
    alert(`Failed to grant items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
};

/**
 * Set a user's account tier (plan level).
 * This calls the backend admin endpoint to update the user's custom claims.
 */
export async function setUserAccountTier(uid: string | undefined, tier: 'free' | 'starter' | 'professional' | 'admin'): Promise<void> {
  if (!uid) {
    console.error('setUserAccountTier: UID is undefined.');
    alert('Error: User ID is undefined. Cannot set account tier.');
    return Promise.reject(new Error('User ID is undefined'));
  }

  try {
    const response = await api.authenticatedFetch(`http://127.0.0.1:5000/api/admin/users/${uid}/plan-tier`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        planTier: tier 
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to update account tier' }));
      throw new Error(errorData.error || 'Failed to update account tier');
    }

    const result = await response.json();
    console.log('Account tier updated successfully:', result);
    alert(`Successfully updated account tier to '${tier}' for user ${uid}`);
  } catch (error) {
    console.error('Failed to set account tier:', error);
    alert(`Failed to set account tier: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Seed dummy data for testing purposes.
 * This calls the backend admin endpoint to generate dummy data.
 * @param dataType Type of data to seed (e.g., 'items', 'sales', 'expenses')
 * @param count Number of dummy records to create
 */
export async function seedDummyData(dataType: 'items' | 'sales' | 'expenses', count: number): Promise<void> {
  try {
    const response = await api.authenticatedFetch('http://127.0.0.1:5000/api/admin/seed-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        dataType: dataType,
        count: count
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to seed dummy data' }));
      throw new Error(errorData.error || 'Failed to seed dummy data');
    }

    const result = await response.json();
    console.log('Dummy data seeded successfully:', result);
    alert(`Successfully seeded ${count} dummy ${dataType} records`);
  } catch (error) {
    console.error('Failed to seed dummy data:', error);
    alert(`Failed to seed dummy data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Get admin statistics from the backend.
 */
export async function getAdminStats(): Promise<any> {
  try {
    const response = await api.authenticatedFetch('http://127.0.0.1:5000/api/admin/stats');
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to get admin stats' }));
      throw new Error(errorData.error || 'Failed to get admin stats');
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get admin stats:', error);
    throw error;
  }
}

/**
 * Get all users (admin only).
 */
export async function getAllUsers(): Promise<any[]> {
  try {
    const response = await api.authenticatedFetch('http://127.0.0.1:5000/api/admin/users');
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to get users' }));
      throw new Error(errorData.error || 'Failed to get users');
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get users:', error);
    throw error;
  }
}
