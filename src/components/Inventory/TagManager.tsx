// src/components/Inventory/TagManager.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  TextField,
  Box,
  Typography,
  Divider,
  Tooltip,
  CircularProgress,
  Alert,
  Chip,
  Grid,
  useTheme,
  Paper,
} from '@mui/material';
import { ChromePicker } from 'react-color';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import { Tag } from '../../pages/InventoryPage';
import { tagService } from '../../services/tagService';

interface TagManagerProps {
  open: boolean;
  onClose: (tagsChanged?: boolean) => void;
  tags: Tag[];
}

const TagManager: React.FC<TagManagerProps> = ({
  open,
  onClose,
  tags
}) => {
  const theme = useTheme();
  const [localTags, setLocalTags] = useState<Tag[]>([]);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tempTag, setTempTag] = useState<{ name: string; color: string }>({ name: '', color: '#8884d8' });
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tagsChanged, setTagsChanged] = useState<boolean>(false);

  // Initialize local tags with the provided tags
  useEffect(() => {
    if (open) {
      setLocalTags([...tags]);
      setEditingTag(null);
      setIsCreating(false);
      setError(null);
      setSuccess(null);
      setTagsChanged(false);
    }
  }, [open, tags]);

  const handleCreateTag = async () => {
    if (!tempTag.name.trim()) {
      setError('Tag name cannot be empty');
      return;
    }

    // Check for duplicate tag names
    if (localTags.some(tag => tag.name.toLowerCase() === tempTag.name.toLowerCase())) {
      setError('Tag name already exists');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const newTag = await tagService.createTag(tempTag.name, tempTag.color);
      setLocalTags([...localTags, newTag]);
      setTempTag({ name: '', color: '#8884d8' });
      setIsCreating(false);
      setSuccess('Tag created successfully');
      setTagsChanged(true);
    } catch (err: any) {
      setError(`Failed to create tag: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTag = async () => {
    if (!editingTag) return;
    if (!tempTag.name.trim()) {
      setError('Tag name cannot be empty');
      return;
    }

    // Check for duplicate tag names
    if (localTags.some(tag => tag.id !== editingTag.id && tag.name.toLowerCase() === tempTag.name.toLowerCase())) {
      setError('Tag name already exists');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const updatedTag = await tagService.updateTag(editingTag.id, tempTag.name, tempTag.color);
      setLocalTags(localTags.map(tag => tag.id === editingTag.id ? updatedTag : tag));
      setEditingTag(null);
      setSuccess('Tag updated successfully');
      setTagsChanged(true);
    } catch (err: any) {
      setError(`Failed to update tag: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = async (tag: Tag) => {
    setLoading(true);
    setError(null);
    try {
      await tagService.deleteTag(tag.id);
      setLocalTags(localTags.filter(t => t.id !== tag.id));
      setSuccess('Tag deleted successfully');
      setTagsChanged(true);
    } catch (err: any) {
      setError(`Failed to delete tag: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCreating = () => {
    setIsCreating(true);
    setEditingTag(null);
    setTempTag({ name: '', color: '#8884d8' });
  };

  const handleStartEditing = (tag: Tag) => {
    setEditingTag(tag);
    setIsCreating(false);
    setTempTag({ name: tag.name, color: tag.color });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingTag(null);
    setError(null);
  };

  const handleClose = () => {
    onClose(tagsChanged);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Tag Manager
        <IconButton
          aria-label="close"
          onClick={handleClose}
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

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Create and manage tags to organize your inventory
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tags help you categorize items and filter your inventory more effectively.
          </Typography>
        </Box>

        <Grid container spacing={2}>
          {/* Tag List */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Existing Tags
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                maxHeight: 300,
                overflow: 'auto',
                borderRadius: 1,
              }}
            >
              {localTags.length === 0 ? (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No tags created yet
                  </Typography>
                </Box>
              ) : (
                <List dense>
                  {localTags.map((tag) => (
                    <ListItem
                      key={tag.id}
                      secondaryAction={
                        <Box>
                          <Tooltip title="Edit Tag">
                            <IconButton edge="end" onClick={() => handleStartEditing(tag)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Tag">
                            <IconButton edge="end" onClick={() => handleDeleteTag(tag)} disabled={loading}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      }
                      sx={{
                        borderLeft: `4px solid ${tag.color}`,
                        mb: 0.5,
                        borderRadius: 1,
                        '&:hover': {
                          bgcolor: theme.palette.action.hover,
                        },
                      }}
                    >
                      <ListItemText
                        primary={tag.name}
                        secondary={`Color: ${tag.color}`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleStartCreating}
              disabled={isCreating || !!editingTag}
              fullWidth
              sx={{ mt: 2 }}
            >
              Create New Tag
            </Button>
          </Grid>

          {/* Tag Editor */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              {isCreating ? 'Create New Tag' : editingTag ? 'Edit Tag' : 'Tag Editor'}
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 1,
                height: isCreating || editingTag ? 'auto' : '300px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: isCreating || editingTag ? 'flex-start' : 'center',
                alignItems: isCreating || editingTag ? 'stretch' : 'center',
              }}
            >
              {isCreating || editingTag ? (
                <>
                  <TextField
                    label="Tag Name"
                    value={tempTag.name}
                    onChange={(e) => setTempTag({ ...tempTag, name: e.target.value })}
                    fullWidth
                    sx={{ mb: 2 }}
                    autoFocus
                    error={!!error && error.includes('name')}
                  />
                  <Typography variant="subtitle2" gutterBottom>
                    Tag Color
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <ChromePicker
                      color={tempTag.color}
                      onChange={(color) => setTempTag({ ...tempTag, color: color.hex })}
                      disableAlpha
                    />
                  </Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Preview
                  </Typography>
                  <Box sx={{ mb: 3, display: 'flex', gap: 1 }}>
                    <Chip
                      label={tempTag.name || 'Tag Preview'}
                      style={{ backgroundColor: tempTag.color, color: 'white' }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 'auto' }}>
                    <Button onClick={handleCancel} disabled={loading}>
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={isCreating ? handleCreateTag : handleEditTag}
                      disabled={loading || !tempTag.name.trim()}
                      startIcon={loading ? <CircularProgress size={20} /> : null}
                    >
                      {loading
                        ? 'Saving...'
                        : isCreating
                        ? 'Create Tag'
                        : 'Update Tag'}
                    </Button>
                  </Box>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary" align="center">
                  Select a tag to edit or create a new one
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{tagsChanged ? 'Done' : 'Cancel'}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TagManager;