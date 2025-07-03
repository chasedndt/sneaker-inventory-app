// src/services/tagService.ts
import { Tag } from '../pages/InventoryPage';
import { getApiAuthToken } from './api';

const API_BASE_URL = 'http://127.0.0.1:5000/api';
const TAGS_STORAGE_KEY = 'inventory_tags';

/**
 * Service for managing tags in the inventory system
 */
export const tagService = {
  /**
   * Get all tags
   * @returns Promise<Tag[]> List of tags
   */
  getTags: async (): Promise<Tag[]> => {
    try {
      console.log('🔄 Fetching tags from API...');
      
      // Get authentication token
      const token = await getApiAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please log in to view tags.');
      }
      
      const response = await fetch(`${API_BASE_URL}/user-tags`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.status === 401) {
        throw new Error('Authentication expired. Please log in again.');
      }
      
      if (!response.ok) {
        console.error(`❌ API getTags failed with status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const tags = await response.json();
      console.log(`✅ Received ${tags.length} tags from API`);
      return tags;
    } catch (error: any) {
      console.error('💥 Error in getTags:', error);
      
      // Fall back to localStorage for development
      console.warn('⚠️ Using localStorage for tags due to API error');
      const storedTags = localStorage.getItem(TAGS_STORAGE_KEY);
      return storedTags ? JSON.parse(storedTags) : [];
    }
  },
  
  /**
   * Create a new tag
   * @param name Tag name
   * @param color Tag color (hex)
   * @returns Promise<Tag> Created tag
   */
  createTag: async (name: string, color: string): Promise<Tag> => {
    try {
      console.log(`🔄 Creating new tag: ${name} (${color})...`);
      
      // Get authentication token
      const token = await getApiAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please log in to create tags.');
      }
      
      const response = await fetch(`${API_BASE_URL}/user-tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ name, color }),
      });
      
      if (response.status === 401) {
        throw new Error('Authentication expired. Please log in again.');
      }
      
      if (!response.ok) {
        console.error(`❌ API createTag failed with status: ${response.status}`);
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
      }
      
      const tag = await response.json();
      console.log(`✅ Tag created successfully: ${tag.id}`);
      return tag;
    } catch (error: any) {
      console.error('💥 Error in createTag:', error);
      
      // Fall back to localStorage for development
      console.warn('⚠️ Using localStorage for tags due to API error');
      return createLocalTag(name, color);
    }
  },
  
  /**
   * Update an existing tag
   * @param id Tag ID
   * @param name New tag name
   * @param color New tag color (hex)
   * @returns Promise<Tag> Updated tag
   */
  updateTag: async (id: string, name: string, color: string): Promise<Tag> => {
    try {
      console.log(`🔄 Updating tag ${id}: ${name} (${color})...`);
      
      // Get authentication token
      const token = await getApiAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please log in to update tags.');
      }
      
      const response = await fetch(`${API_BASE_URL}/user-tags/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ name, color }),
      });
      
      if (response.status === 401) {
        throw new Error('Authentication expired. Please log in again.');
      }
      
      if (!response.ok) {
        console.error(`❌ API updateTag failed with status: ${response.status}`);
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
      }
      
      const tag = await response.json();
      console.log(`✅ Tag updated successfully: ${tag.id}`);
      return tag;
    } catch (error: any) {
      console.error(`💥 Error updating tag ${id}:`, error);
      
      // Fall back to localStorage for development
      console.warn('⚠️ Using localStorage for tags due to API error');
      return updateLocalTag(id, name, color);
    }
  },
  
  /**
   * Delete a tag
   * @param id Tag ID
   * @returns Promise<{ success: boolean }> Success status
   */
  deleteTag: async (id: string): Promise<{ success: boolean }> => {
    try {
      console.log(`🔄 Deleting tag ${id}...`);
      
      // Get authentication token
      const token = await getApiAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please log in to delete tags.');
      }
      
      const response = await fetch(`${API_BASE_URL}/user-tags/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.status === 401) {
        throw new Error('Authentication expired. Please log in again.');
      }
      
      if (!response.ok) {
        console.error(`❌ API deleteTag failed with status: ${response.status}`);
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
      }
      
      console.log(`✅ Tag ${id} deleted successfully`);
      return { success: true };
    } catch (error: any) {
      console.error(`💥 Error deleting tag ${id}:`, error);
      
      // Fall back to localStorage for development
      console.warn('⚠️ Using localStorage for tags due to API error');
      return deleteLocalTag(id);
    }
  },
  
  /**
   * Apply tags to an item
   * @param itemId Item ID
   * @param tagIds Array of tag IDs to apply
   * @returns Promise<{ success: boolean }> Success status
   */
  applyTagsToItem: async (itemId: number, tagIds: string[]): Promise<{ success: boolean }> => {
    try {
      console.log(`🔄 Applying tags to item ${itemId}:`, tagIds);
      
      // Get authentication token
      const token = await getApiAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please log in to apply tags.');
      }
      
      // Use the item field update API endpoint directly
      const response = await fetch(`${API_BASE_URL}/items/${itemId}/field`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ field: 'tags', value: tagIds }),
      });
      
      if (response.status === 401) {
        throw new Error('Authentication expired. Please log in again.');
      }
      
      if (!response.ok) {
        console.error(`❌ API applyTagsToItem failed with status: ${response.status}`);
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
      }
      
      console.log(`✅ Tags applied successfully to item ${itemId}`);
      return { success: true };
    } catch (error: any) {
      console.error(`💥 Error applying tags to item ${itemId}:`, error);
      throw error;
    }
  },
  
  /**
   * Remove tags from an item
   * @param itemId Item ID
   * @param tagIds Array of tag IDs to remove
   * @returns Promise<{ success: boolean }> Success status
   */
  removeTagsFromItem: async (itemId: number, tagIds: string[]): Promise<{ success: boolean }> => {
    try {
      console.log(`🔄 Removing tags from item ${itemId}:`, tagIds);
      
      // Get authentication token
      const token = await getApiAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please log in to remove tags.');
      }
      
      // Get current item tags first
      const itemResponse = await fetch(`${API_BASE_URL}/items/${itemId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (!itemResponse.ok) {
        throw new Error(`Failed to get item: ${itemResponse.status}`);
      }
      
      const item = await itemResponse.json();
      
      // Filter out the tags to remove
      const currentTags = Array.isArray(item.tags) ? item.tags : [];
      const updatedTags = currentTags.filter((tagId: string) => !tagIds.includes(tagId));
      
      // Update the item with the filtered tags
      const updateResponse = await fetch(`${API_BASE_URL}/items/${itemId}/field`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ field: 'tags', value: updatedTags }),
      });
      
      if (updateResponse.status === 401) {
        throw new Error('Authentication expired. Please log in again.');
      }
      
      if (!updateResponse.ok) {
        console.error(`❌ API removeTagsFromItem failed with status: ${updateResponse.status}`);
        const errorData = await updateResponse.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP error! status: ${updateResponse.status}`);
      }
      
      console.log(`✅ Tags removed successfully from item ${itemId}`);
      return { success: true };
    } catch (error: any) {
      console.error(`💥 Error removing tags from item ${itemId}:`, error);
      throw error;
    }
  }
};

/**
 * Helper function for creating a local tag in localStorage
 */
function createLocalTag(name: string, color: string): Tag {
  // Get existing tags
  const storedTags = localStorage.getItem(TAGS_STORAGE_KEY);
  const tags: Tag[] = storedTags ? JSON.parse(storedTags) : [];
  
  // Create a new tag with a unique ID
  const newTag: Tag = {
    id: `local-${Date.now()}`,
    name,
    color
  };
  
  // Add the new tag and save back to localStorage
  tags.push(newTag);
  localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags));
  
  return newTag;
}

/**
 * Helper function for updating a local tag in localStorage
 */
function updateLocalTag(id: string, name: string, color: string): Tag {
  // Get existing tags
  const storedTags = localStorage.getItem(TAGS_STORAGE_KEY);
  const tags: Tag[] = storedTags ? JSON.parse(storedTags) : [];
  
  // Find and update the tag
  const updatedTags = tags.map(tag => {
    if (tag.id === id) {
      return { ...tag, name, color };
    }
    return tag;
  });
  
  // Save back to localStorage
  localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(updatedTags));
  
  // Return the updated tag
  const updatedTag = updatedTags.find(tag => tag.id === id);
  if (!updatedTag) {
    throw new Error(`Tag with ID ${id} not found`);
  }
  
  return updatedTag;
}

/**
 * Helper function for deleting a local tag in localStorage
 */
function deleteLocalTag(id: string): { success: boolean } {
  // Get existing tags
  const storedTags = localStorage.getItem(TAGS_STORAGE_KEY);
  const tags: Tag[] = storedTags ? JSON.parse(storedTags) : [];
  
  // Filter out the tag to delete
  const updatedTags = tags.filter(tag => tag.id !== id);
  
  // Save back to localStorage
  localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(updatedTags));
  
  return { success: true };
}

export default tagService;