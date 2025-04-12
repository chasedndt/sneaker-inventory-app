// src/components/AddItem/ImagesUploadForm.tsx
import React, { useCallback, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Grid,
  Paper,
  IconButton,
  FormHelperText,
  useTheme,
  Tooltip
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import { ImageFile } from '../../services/api';
import { getImageUrl } from '../../utils/imageUtils';

interface ImagesUploadFormProps {
  images: ImageFile[];
  onChange: (images: ImageFile[]) => void;
  errors: { [key: string]: string };
  existingImages?: string[]; // Add support for existing images
}

const ImagesUploadForm: React.FC<ImagesUploadFormProps> = ({
  images,
  onChange,
  errors,
  existingImages = []
}) => {
  const theme = useTheme();
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>(
    existingImages.map(filename => getImageUrl(filename) || '')
  );

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

  const handleRemoveExistingImage = (indexToRemove: number) => {
    // Remove from the existing images array
    const newExistingImages = existingImages.filter((_, index) => index !== indexToRemove);
    const newExistingImageUrls = existingImageUrls.filter((_, index) => index !== indexToRemove);
    
    // Update the state
    setExistingImageUrls(newExistingImageUrls);
    
    // Notify the parent component
    // This is a bit of a hack since we're keeping existingImages separate from images
    // In a real implementation, you might want to combine them or handle this differently
    onChange(images);
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
                    src={getImageUrl(image) || '/placeholder-image.svg'}
                    alt={`Item image ${index + 1}`}
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
                      onClick={() => handleRemoveExistingImage(index)}
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