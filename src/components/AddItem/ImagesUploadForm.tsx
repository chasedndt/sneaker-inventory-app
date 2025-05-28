// src/components/AddItem/ImagesUploadForm.tsx
import React, { useCallback, useState, useEffect, useRef } from 'react';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import {
  Box,
  Button,
  Typography,
  Grid,
  Paper,
  IconButton,
  FormHelperText,
  useTheme,
  Tooltip,
  Badge
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import { ImageFile } from '../../services/api';
import { getImageUrl } from '../../utils/imageUtils';
import { useAuth } from '../../contexts/AuthContext';

// Helper function to safely get image URL
const safeImageUrl = (image: string): string => {
  if (!image) return '/placeholder-image.svg';
  if (image.startsWith('http')) return image;
  
  // Otherwise, construct URL
  const API_BASE_URL = 'http://127.0.0.1:5000/api';
  return `${API_BASE_URL}/uploads/${image}`;
};

interface ImagesUploadFormProps {
  images: ImageFile[];
  onChange: (images: ImageFile[]) => void;
  errors: { [key: string]: string };
  existingImages?: string[]; // Add support for existing images
  onExistingImagesChange?: (images: string[]) => void; // Callback for existing images changes
}

const ImagesUploadForm: React.FC<ImagesUploadFormProps> = ({
  images,
  onChange,
  errors,
  existingImages = [],
  onExistingImagesChange
}) => {
  const theme = useTheme();
  // Get user ID from auth context
  const { currentUser } = useAuth();
  const userId = currentUser?.uid || 'PpdcAvliVrR4zBAH6WGBeLqd0c73'; // Default to the observed user ID
  
  // Use a ref to prevent infinite renders
  const errorLogged = useRef<Set<string>>(new Set());
  
  // Debug log current image paths to understand structure
  useEffect(() => {
    if (existingImages.length > 0 && !errorLogged.current.has('initial_debug')) {
      console.log('%c[IMAGE DEBUG] Existing images to display:', 'background: #222; color: #bada55', {
        existingImages,
        userId,
        count: existingImages.length
      });
      errorLogged.current.add('initial_debug');
    }
  }, [existingImages, userId]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Process new files
      const newImages = acceptedFiles.map(file =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
          id: `image-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        })
      ) as ImageFile[];

      // Append to existing images
      onChange([...images, ...newImages]);
    },
    [images, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: true
  });

  const handleRemoveImage = (indexToRemove: number) => {
    // Remove from the new images array
    const newImages = images.filter((_, index) => index !== indexToRemove);
    
    // Revoke the object URL to avoid memory leaks
    if (images[indexToRemove]?.preview) {
      URL.revokeObjectURL(images[indexToRemove].preview!);
    }
    
    onChange(newImages);
  };

  // Handle reordering of existing images
  const handleMoveExistingImage = (indexToMove: number, direction: 'up' | 'down') => {
    try {
      // First validate parameters
      if (indexToMove < 0 || indexToMove >= existingImages.length) {
        console.error(`Invalid index: ${indexToMove}`);
        return;
      }
      
      // Can't move first item up or last item down
      if ((direction === 'up' && indexToMove === 0) || 
          (direction === 'down' && indexToMove === existingImages.length - 1)) {
        return;
      }

      // Calculate the new index
      const newIndex = direction === 'up' ? indexToMove - 1 : indexToMove + 1;
      
      // Create a new array and swap the images
      const newExistingImages = [...existingImages];
      [newExistingImages[indexToMove], newExistingImages[newIndex]] = 
      [newExistingImages[newIndex], newExistingImages[indexToMove]];
      
      // Get current item ID from session storage
      const itemId = sessionStorage.getItem('currentEditItemId');

      // Store in session storage for persistence
      if (itemId) {
        const storageKey = `item_${itemId}_images`;
        sessionStorage.setItem(storageKey, JSON.stringify(newExistingImages));
      }

      // Notify the parent component about the image change
      if (onExistingImagesChange) {
        onExistingImagesChange(newExistingImages);
      }
    } catch (error) {
      console.error('Error reordering images:', error);
    }
  };

  const handleRemoveExistingImage = (indexToRemove: number, event?: React.MouseEvent) => {
    // Prevent event bubbling if provided
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    try {
      // Log the operation
      console.log(`🗑️ Removing image at index ${indexToRemove}`);

      // Check if index is valid
      if (indexToRemove < 0 || indexToRemove >= existingImages.length) {
        console.error(`Invalid index: ${indexToRemove}`);
        return;
      }

      // Create a new array without the removed image
      const newExistingImages = existingImages.filter((_, index) => index !== indexToRemove);
      
      // Get current item ID from session storage
      const itemId = sessionStorage.getItem('currentEditItemId');

      // Store in session storage for persistence
      if (itemId) {
        const storageKey = `item_${itemId}_images`;
        sessionStorage.setItem(storageKey, JSON.stringify(newExistingImages));
      }

      // Notify the parent component about the image change
      if (onExistingImagesChange) {
        onExistingImagesChange(newExistingImages);
      }
    } catch (error) {
      console.error('Error removing image:', error);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Images
      </Typography>
      
      {/* Existing Images Section */}
      {existingImages.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Existing Images
          </Typography>
          <Grid container spacing={2}>
            {existingImages.map((image, index) => (
              <Grid item xs={6} sm={4} md={3} key={`existing-${index}`}>
                <Paper
                  elevation={2}
                  sx={{
                    position: 'relative',
                    height: 140,
                    width: '100%',
                    borderRadius: 1,
                    overflow: 'hidden',
                    '&:hover .delete-btn': {
                      opacity: 1,
                    },
                  }}
                >
                  <Box
                    component="img"
                    src={(()=>{
                      // Create and log the constructed URL for debugging
                      let finalUrl;
                      if (image.includes('//')) {
                        finalUrl = image; // If it's a full URL, use it directly
                      } else {
                        // Try different URL constructions
                        // 1. First attempt with user ID and original filename
                        finalUrl = `http://127.0.0.1:5000/api/uploads/${userId}/${image}`;
                      }
                      console.log(`%c[IMAGE DEBUG] Constructed URL for ${image}:`, 'color: #3498db', {
                        originalImage: image,
                        constructedUrl: finalUrl,
                        userId
                      });
                      return finalUrl;
                    })()}
                    alt={`Item image ${index + 1}`}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      backgroundColor: 'rgba(0, 0, 0, 0.05)',
                    }}
                    // Enhanced error handler to prevent infinite rerenders
                    onError={(e) => {
                      const imgElement = e.currentTarget;
                      const currentSrc = imgElement.src;
                      
                      // Only log once per image to prevent spam
                      if (!errorLogged.current.has(image)) {
                        console.error(`%c[IMAGE ERROR] Failed to load image`, 'color: #e74c3c', {
                          originalImage: image,
                          attemptedUrl: currentSrc,
                          userId,
                          timestamp: new Date().toISOString(),
                          domElement: imgElement
                        });
                        
                        // Try to fetch the image directly with fetch API to get HTTP error details
                        fetch(currentSrc)
                          .then(response => {
                            console.log(`%c[IMAGE DEBUG] Fetch test for ${image}:`, 'color: #2ecc71', {
                              status: response.status,
                              statusText: response.statusText,
                              // Get header values directly to avoid iteration issues
                              contentType: response.headers.get('content-type'),
                              contentLength: response.headers.get('content-length'),
                              ok: response.ok,
                              url: response.url
                            });
                          })
                          .catch(fetchError => {
                            console.error(`%c[IMAGE DEBUG] Fetch test failed for ${image}:`, 'color: #e67e22', {
                              error: fetchError.message,
                              stack: fetchError.stack
                            });
                          });
                          
                        errorLogged.current.add(image);
                      }
                      
                      // Only replace with placeholder if we haven't already tried
                      if (!currentSrc.includes('placeholder-image.svg')) {
                        imgElement.src = '/placeholder-image.svg';
                      }
                      
                      // Prevent future error events on this element
                      imgElement.onerror = null;
                    }}
                  />
                  <Box sx={{ position: 'absolute', top: 5, right: 5, display: 'flex', gap: 0.5 }} className="image-controls">
                    {/* First image indicator */}
                    {index === 0 && (
                      <Typography
                        variant="caption"
                        sx={{
                          position: 'absolute',
                          left: -40,
                          top: 0,
                          bgcolor: 'primary.main',
                          color: 'white',
                          px: 0.5,
                          borderRadius: '4px',
                          fontSize: '0.6rem',
                          fontWeight: 'bold'
                        }}
                      >
                        MAIN
                      </Typography>
                    )}

                    {/* Move up button */}
                    <Tooltip title="Move up (make primary)">
                      <IconButton
                        className="move-btn"
                        size="small"
                        onClick={() => handleMoveExistingImage(index, 'up')}
                        disabled={index === 0}
                        sx={{
                          bgcolor: 'rgba(0, 0, 0, 0.5)',
                          color: 'white',
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          '&:hover': {
                            bgcolor: 'rgba(0, 0, 0, 0.7)',
                          },
                          '&.Mui-disabled': {
                            opacity: 0
                          }
                        }}
                      >
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    {/* Move down button */}
                    <Tooltip title="Move down">
                      <IconButton
                        className="move-btn"
                        size="small"
                        onClick={() => handleMoveExistingImage(index, 'down')}
                        disabled={index === existingImages.length - 1}
                        sx={{
                          bgcolor: 'rgba(0, 0, 0, 0.5)',
                          color: 'white',
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          '&:hover': {
                            bgcolor: 'rgba(0, 0, 0, 0.7)',
                          },
                          '&.Mui-disabled': {
                            opacity: 0
                          }
                        }}
                      >
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    {/* Remove button */}
                    <Tooltip title="Remove image">
                      <IconButton
                        className="delete-btn"
                        size="small"
                        onClick={() => handleRemoveExistingImage(index)}
                        sx={{
                          bgcolor: 'rgba(0, 0, 0, 0.5)',
                          color: 'white',
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          '&:hover': {
                            bgcolor: 'rgba(0, 0, 0, 0.7)',
                          },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Dropzone for New Images */}
      <Box
        {...getRootProps()}
        sx={{
          border: `2px dashed ${errors.images ? theme.palette.error.main : theme.palette.divider}`,
          borderRadius: 1,
          p: 3,
          textAlign: 'center',
          bgcolor: isDragActive ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
          cursor: 'pointer',
          '&:hover': {
            bgcolor: 'rgba(0, 0, 0, 0.04)',
          },
        }}
      >
        <input {...getInputProps()} />
        <CloudUploadIcon
          sx={{ fontSize: 40, color: isDragActive ? 'primary.main' : 'text.secondary', mb: 1 }}
        />
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          {isDragActive ? 'Drop the images here' : 'Drag & drop images here, or click to select files'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Supported formats: JPEG, PNG, WebP. Max 5MB per file.
        </Typography>
      </Box>

      {errors.images && (
        <FormHelperText error>{errors.images}</FormHelperText>
      )}
      
      {/* Existing Images Section - Simplified */}
      {existingImages.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Existing Images (First is thumbnail)
          </Typography>
          
          <Grid container spacing={2}>
            {existingImages.map((image, index) => (
              <Grid item xs={6} sm={4} md={3} key={`existing-${index}`}>
                <Paper
                  elevation={2}
                  sx={{
                    position: 'relative',
                    height: 140,
                    width: '100%',
                    borderRadius: 1,
                    overflow: 'hidden',
                    border: index === 0 ? '2px solid #2196f3' : 'none',
                    '&:hover .image-controls': {
                      opacity: 1,
                    },
                  }}
                >
                  <Box
                    component="img"
                    src={typeof image === 'string' ? getImageUrl(image, undefined, userId) : ''}
                    alt={`Existing image ${index + 1}`}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  
                  {/* Simple Control Buttons */}
                  <Box 
                    className="image-controls"
                    sx={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      padding: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      opacity: 0.9,
                      transition: 'opacity 0.2s'
                    }}
                  >
                    {/* Delete Button */}
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveExistingImage(index)}
                      sx={{ 
                        bgcolor: 'rgba(0,0,0,0.5)', 
                        color: 'white',
                        mb: 1,
                        '&:hover': { bgcolor: 'rgba(244,67,54,0.8)' } 
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                    
                    {/* Move Up Button - Only show if not first */}
                    {index > 0 && (
                      <IconButton
                        size="small"
                        onClick={() => handleMoveExistingImage(index, 'up')}
                        sx={{ 
                          bgcolor: 'rgba(0,0,0,0.5)', 
                          color: 'white',
                          mb: 1,
                          '&:hover': { bgcolor: 'rgba(33,150,243,0.8)' } 
                        }}
                      >
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                    )}
                    
                    {/* Move Down Button - Only show if not last */}
                    {index < existingImages.length - 1 && (
                      <IconButton
                        size="small"
                        onClick={() => handleMoveExistingImage(index, 'down')}
                        sx={{ 
                          bgcolor: 'rgba(0,0,0,0.5)', 
                          color: 'white',
                          '&:hover': { bgcolor: 'rgba(33,150,243,0.8)' } 
                        }}
                      >
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Preview of New Images */}
      {images.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            New Images to Upload
          </Typography>
          <Grid container spacing={2}>
            {images.map((image, index) => (
              <Grid item xs={6} sm={4} md={3} key={`new-${index}`}>
                <Paper
                  elevation={2}
                  sx={{
                    position: 'relative',
                    height: 140,
                    width: '100%',
                    borderRadius: 1,
                    overflow: 'hidden',
                    '&:hover .delete-btn': {
                      opacity: 1,
                    },
                  }}
                >
                  <Box
                    component="img"
                    src={image.preview || '/placeholder-image.svg'}
                    alt={`New image ${index + 1}`}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  <Tooltip title="Remove image">
                    <IconButton
                      className="delete-btn"
                      size="small"
                      onClick={() => handleRemoveImage(index)}
                      sx={{
                        position: 'absolute',
                        top: 5,
                        right: 5,
                        bgcolor: 'rgba(0, 0, 0, 0.5)',
                        color: 'white',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        '&:hover': {
                          bgcolor: 'rgba(0, 0, 0, 0.7)',
                        },
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* No Images Message */}
      {images.length === 0 && existingImages.length === 0 && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No images uploaded yet. Add some images to showcase your item.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ImagesUploadForm;