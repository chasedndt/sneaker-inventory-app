// src/components/AddItem/ImagesUploadForm.tsx
import React, { useCallback, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  IconButton,
  Paper,
  Button
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';

interface ImageFile extends File {
  preview?: string;
}

interface ImagesUploadFormProps {
  images: ImageFile[];
  onChange: (images: ImageFile[]) => void;
  errors: {
    images?: string;
  };
}

const ImagesUploadForm: React.FC<ImagesUploadFormProps> = ({
  images,
  onChange,
  errors
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map(file => Object.assign(file, {
      preview: URL.createObjectURL(file)
    }));
    onChange([...images, ...newImages]);
  }, [images, onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    maxSize: 5242880, // 5MB
    multiple: true
  });

  const handleRemoveImage = (index: number) => {
    const newImages = [...images];
    if (newImages[index].preview) {
      URL.revokeObjectURL(newImages[index].preview!);
    }
    newImages.splice(index, 1);
    onChange(newImages);
  };

  return (
    <Box sx={{ mt: 2 }}>
      {/* Dropzone */}
      <Paper
        {...getRootProps()}
        sx={{
          p: 3,
          mb: 3,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover'
          }
        }}
      >
        <input {...getInputProps()} />
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}
        >
          <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main' }} />
          <Typography variant="h6" align="center">
            {isDragActive
              ? 'Drop the images here'
              : 'Drag & drop images here, or click to select files'}
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            Supported formats: JPEG, PNG. Max size: 5MB
          </Typography>
        </Box>
      </Paper>

      {/* Error message */}
      {errors.images && (
        <Typography color="error" sx={{ mb: 2 }}>
          {errors.images}
        </Typography>
      )}

      {/* Image previews */}
      <Grid container spacing={2}>
        {images.map((file, index) => (
          <Grid item xs={6} sm={4} md={3} key={index}>
            <Paper
              sx={{
                position: 'relative',
                paddingTop: '100%', // 1:1 Aspect ratio
                overflow: 'hidden'
              }}
            >
              <Box
                component="img"
                src={file.preview}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                onLoad={() => { URL.revokeObjectURL(file.preview!) }}
              />
              <IconButton
                size="small"
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  bgcolor: 'background.paper',
                  '&:hover': {
                    bgcolor: 'error.light',
                    color: 'white'
                  }
                }}
                onClick={() => handleRemoveImage(index)}
              >
                <DeleteIcon />
              </IconButton>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ImagesUploadForm;
