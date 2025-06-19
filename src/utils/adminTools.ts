// src/utils/adminTools.ts

import { AppUser } from '../contexts/AuthContext'; // Corrected path

/**
 * Checks if the current user has admin privileges.
 * Relies on a custom claim 'admin' being set to true on the user's Firebase token.
 */
export const isAdmin = (user: AppUser | null): boolean => {
  // Check if user exists and then if customClaims exists and then if admin is true
  return !!user?.customClaims?.admin;
};

/**
 * Placeholder function to grant a specified number of items to a user.
 * This would typically call a backend admin endpoint.
 * 
 * @param userId - The user ID to grant items to.
 * @param numberOfItems - The number of items to grant (defaults to 50 for Free tier testing).
 */
export const grantFreeItems = async (userId: string, numberOfItems = 50): Promise<void> => {
  console.warn(`grantFreeItems called for UID: ${userId}, numberOfItems: ${numberOfItems}. This is a stub and does not actually grant items yet.`);
  // In a real implementation, this would make an authenticated API call:
  // try {
  //   const response = await api.post('/admin/grant-items', { userId: userId, itemCount: numberOfItems });
  //   console.log('Items granted successfully:', response.data);
  // } catch (error) {
  //   console.error('Failed to grant items:', error);
  //   throw error;
  // }
  return Promise.resolve(); // Placeholder
}

// Example of how you might add other admin functions in the future:
export async function setUserAccountTier(uid: string | undefined, tier: 'free' | 'starter' | 'premium' | 'admin'): Promise<void> {
  if (!uid) {
    console.error('setUserAccountTier: UID is undefined.');
    alert('Error: User ID is undefined. Cannot set account tier.');
    return Promise.reject(new Error('User ID is undefined'));
  }
  console.warn(`ADMIN ACTION (STUB): setUserAccountTier called for UID: ${uid}, tier: ${tier}.`);
  alert(`ADMIN ACTION (STUB): Setting account tier to '${tier}' for user ${uid}. This would normally call a backend function.`);
  // In a real app, this would call a Firebase Callable Function or an admin-privileged API endpoint
  // to set a custom claim on the user or update their record in a database.
  // Example: firebase.functions().httpsCallable('setCustomUserClaims')({ uid, claims: { accountTier: tier } });
  return Promise.resolve();
}

/**
 * Placeholder function to simulate seeding dummy data.
 * @param dataType Type of data to seed (e.g., 'items', 'sales', 'expenses')
 * @param count Number of dummy records to create
 */
export async function seedDummyData(dataType: 'items' | 'sales' | 'expenses', count: number): Promise<void> {
  console.warn(`ADMIN ACTION (STUB): seedDummyData called for dataType: ${dataType}, count: ${count}.`);
  alert(`ADMIN ACTION (STUB): Seeding ${count} dummy ${dataType}. This would normally call a backend function.`);
  // In a real app, this would call a backend endpoint to generate and insert dummy data.
  return Promise.resolve();
}
