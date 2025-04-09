// src/components/Inventory/BatchTagsModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Checkbox,
  FormControlLabel,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  useTheme,
  IconButton,
  Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

import { Tag } from '../../pages/InventoryPage';
import { tagService } from '../../services/tagService';
import { api } from '../../services/api';

interface BatchTagsModalProps {
  open: boolean;
  onClose: (tagsChanged?: boolean) => void;
  itemIds: number[];
  tags: Tag[];
}

interface TagActionState {
  [tagId: string]: 'add' | 'remove' | null;
}

const BatchTagsModal: React.FC<BatchTagsModalProps> = ({
  open,
  onClose,
  itemIds,
  tags
}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  
  // Track tag actions: add, remove, or no change (null)
  const [tagActions, setTagActions] = useState<TagActionState>({});
  
  // Current tags for selected items
  const [itemTags, setItemTags] = useState<Record<number, string[]>>({});
  
  // Initialize when modal opens
  useEffect(() => {
    if (open && itemIds.length > 0) {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setDebugInfo(null);
      
      // Initialize with empty tag actions
      const initialTagActions: TagActionState = {};
      tags.forEach(tag => {
        initialTagActions[tag.id] = null;
      });
      setTagActions(initialTagActions);
      
      // Fetch current tags for all selected items
      const fetchItemTags = async () => {
        try {
          const itemTagsData: Record<number, string[]> = {};
          
          for (const itemId of itemIds) {
            const item = await api.getItem(itemId);
            console.log(`Current tags for item ${itemId}:`, item.tags);
            itemTagsData[itemId] = item.tags || [];
          }
          
          setItemTags(itemTagsData);
          setLoading(false);
        } catch (err: any) {
          console.error('Failed to fetch item tags:', err);
          setError(`Failed to fetch item tags: ${err.message}`);
          setLoading(false);
        }
      };
      
      fetchItemTags();
    }
  }, [open, itemIds, tags]);
  
  // Toggle tag action (add, remove, no action)
  const handleToggleTagAction = (tagId: string) => {
    setTagActions(prev => {
      const currentAction = prev[tagId];
      let nextAction: 'add' | 'remove' | null;
      
      if (currentAction === null) {
        nextAction = 'add';
      } else if (currentAction === 'add') {
        nextAction = 'remove';
      } else {
        nextAction = null;
      }
      
      console.log(`Toggled tag ${tagId} from ${currentAction} to ${nextAction}`);
      return { ...prev, [tagId]: nextAction };
    });
  };
  
  // Apply tag changes to all selected items
  const handleApplyChanges = async () => {
    // Check if any changes have been made
    const hasChanges = Object.values(tagActions).some(action => action !== null);
    if (!hasChanges) {
      setError('No tag changes to apply');
      return;
    }
    
    setLoading(true);
    setError(null);
    setDebugInfo(null);
    
    try {
      // Get tags to add and remove
      const tagsToAdd = Object.entries(tagActions)
        .filter(([_, action]) => action === 'add')
        .map(([tagId]) => tagId);
        
      const tagsToRemove = Object.entries(tagActions)
        .filter(([_, action]) => action === 'remove')
        .map(([tagId]) => tagId);
      
      console.log('Tags to add:', tagsToAdd);
      console.log('Tags to remove:', tagsToRemove);
      
      // Apply changes to each item one by one
      for (const itemId of itemIds) {
        try {
          console.log(`Processing item ${itemId}`);
          // Get current item tags
          const item = await api.getItem(itemId);
          console.log(`Current tags for item ${itemId}:`, item.tags);
          
          let currentTags = Array.isArray(item.tags) ? [...item.tags] : [];
          console.log(`Current tags array:`, currentTags);
          
          // Add new tags
          for (const tagId of tagsToAdd) {
            if (!currentTags.includes(tagId)) {
              currentTags.push(tagId);
              console.log(`Added tag ${tagId} to item ${itemId}`);
            }
          }
          
          // Remove tags
          currentTags = currentTags.filter(tag => !tagsToRemove.includes(tag));
          console.log(`Updated tags for item ${itemId}:`, currentTags);
          
          // Update the item using the updateItemField method
          const result = await api.updateItemField(itemId, 'tags', currentTags);
          console.log(`Update result for item ${itemId}:`, result);
        } catch (itemError: any) {
          console.error(`Error updating item ${itemId}:`, itemError);
          throw new Error(`Error updating item ${itemId}: ${itemError.message}`);
        }
      }
      
      setSuccess(`Applied tag changes to ${itemIds.length} item(s)`);
      setDebugInfo(`Tags to add: ${tagsToAdd.join(', ')}\nTags to remove: ${tagsToRemove.join(', ')}`);
      
      // Close the modal after a brief delay to show the success message
      setTimeout(() => {
        onClose(true);
      }, 1500);
    } catch (err: any) {
      console.error('Failed to apply tag changes:', err);
      setError(`Failed to apply tag changes: ${err.message}`);
      setDebugInfo(`Error occurred during tag application. Check browser console for details.`);
    } finally {
      setLoading(false);
    }
  };
  
  // Check if tag is on all items, some items, or no items
  const getTagStatus = (tagId: string): 'all' | 'some' | 'none' => {
    if (Object.keys(itemTags).length === 0) {
      return 'none';
    }
    
    const itemCount = Object.keys(itemTags).length;
    const itemsWithTag = Object.values(itemTags).filter(tags => 
      Array.isArray(tags) && tags.includes(tagId)
    ).length;
    
    if (itemsWithTag === 0) return 'none';
    if (itemsWithTag === itemCount) return 'all';
    return 'some';
  };

  // Get color for tag display based on status
  const getTagColor = (tagId: string, status: 'all' | 'some' | 'none'): string => {
    const tag = tags.find(t => t.id === tagId);
    if (!tag) return '#888888';
    return status === 'all' ? tag.color : status === 'some' ? `${tag.color}80` : '#888888';
  };

  return (
    <Dialog
      open={open}
      onClose={() => onClose(false)}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: theme.palette.background.paper
        }
      }}
    >
      <DialogTitle>
        Manage Tags for {itemIds.length} Item{itemIds.length !== 1 ? 's' : ''}
        <IconButton
          aria-label="close"
          onClick={() => onClose(false)}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        
        {debugInfo && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Debug Information:</Typography>
            <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
              {debugInfo}
            </Typography>
          </Alert>
        )}
        
        {loading && !error && !success ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" paragraph>
              Use this form to add or remove tags from all selected items. Click the tags to toggle between adding, removing, or no action.
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Available Tags
              </Typography>
              
              <Grid container spacing={1} sx={{ mt: 1 }}>
                {tags.map(tag => {
                  const tagStatus = getTagStatus(tag.id);
                  const action = tagActions[tag.id];
                  
                  return (
                    <Grid item key={tag.id}>
                      <Chip
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {action === 'add' ? (
                              <AddIcon fontSize="small" />
                            ) : action === 'remove' ? (
                              <RemoveIcon fontSize="small" />
                            ) : null}
                            {tag.name}
                          </Box>
                        }
                        icon={<LocalOfferIcon />}
                        onClick={() => handleToggleTagAction(tag.id)}
                        sx={{
                          bgcolor: action === 'add' 
                            ? `${tag.color}40` 
                            : action === 'remove' 
                              ? theme.palette.error.light
                              : tagStatus === 'all' 
                                ? tag.color 
                                : tagStatus === 'some' 
                                  ? `${tag.color}80`
                                  : theme.palette.action.disabledBackground,
                          borderColor: tag.color,
                          '&:hover': {
                            bgcolor: action === 'remove' 
                              ? theme.palette.error.light 
                              : `${tag.color}60`,
                          },
                          color: tagStatus === 'all' && !action ? '#fff' : undefined,
                          fontWeight: tagStatus !== 'none' || action ? 'bold' : 'normal'
                        }}
                        variant={tagStatus === 'none' && !action ? 'outlined' : 'filled'}
                      />
                    </Grid>
                  );
                })}
              </Grid>
              
              {tags.length === 0 && (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No tags available. Create tags in the Tag Manager first.
                  </Typography>
                </Box>
              )}
            </Box>
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Tag Actions Legend
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip icon={<AddIcon />} label="Add" color="primary" variant="outlined" size="small" />
                    <Typography variant="caption">Add tag to all items</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip icon={<RemoveIcon />} label="Remove" color="error" variant="outlined" size="small" />
                    <Typography variant="caption">Remove tag from all items</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label="Filled" color="success" variant="filled" size="small" />
                    <Typography variant="caption">Tag on all items</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label="Partial" color="info" variant="filled" size="small" sx={{ opacity: 0.7 }} />
                    <Typography variant="caption">Tag on some items</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={() => onClose(false)}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleApplyChanges}
          disabled={loading || Object.values(tagActions).every(action => action === null)}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Applying...' : 'Apply Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BatchTagsModal;