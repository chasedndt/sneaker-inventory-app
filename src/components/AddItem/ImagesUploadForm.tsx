// src/components/AddItem/ImagesUploadForm.tsx
import React, { useCallback, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  IconButton,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  Alert
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import ImageIcon from '@mui/icons-material/Image';

interface ImageFile extends File {
  preview?: string;
  id?: string;
}

interface ImagesUploadFormProps {
  images: ImageFile[];
  onChange: (images: ImageFile[]) => void;
  errors: {
    images?: string;
  };
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png']
};

const ImagesUploadForm: React.FC<ImagesUploadFormProps> = ({
  images,
  onChange,
  errors
}) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [primaryImageIndex, setPrimaryImageIndex] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const error = rejectedFiles[0].errors[0];
      if (error.code === 'file-too-large') {
        setUploadError(`File is too large. Max size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      } else if (error.code === 'file-invalid-type') {
        setUploadError('Invalid file type. Only JPG and PNG are allowed');
      } else {
        setUploadError(error.message);
      }
      return;
    }

    // Clear any previous errors
    setUploadError(null);

    // Check total number of files
    if (images.length + acceptedFiles.length > MAX_FILES) {
      setUploadError(`Maximum ${MAX_FILES} images allowed`);
      return;
    }

    const newImages = acceptedFiles.map(file => 
      Object.assign(file, {
        preview: URL.createObjectURL(file),
        id: Math.random().toString(36).substring(7)
      })
    );

    onChange([...images, ...newImages]);
  }, [images, onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: true
  });

  const handleRemoveImage = (index: number) => {
    const newImages = [...images];
    if (newImages[index].preview) {
      URL.revokeObjectURL(newImages[index].preview!);
    }
    newImages.splice(index, 1);
    onChange(newImages);

    // Update primary image index if necessary
    if (index === primaryImageIndex) {
      setPrimaryImageIndex(0);
    } else if (index < primaryImageIndex) {
      setPrimaryImageIndex(primaryImageIndex - 1);
    }
  };

  const handleSetPrimaryImage = (index: number) => {
    setPrimaryImageIndex(index);
    // Reorder images array to put primary image first
    const newImages = [...images];
    const [movedImage] = newImages.splice(index, 1);
    newImages.unshift(movedImage);
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

      {/* Error messages */}
      {(errors.images || uploadError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.images || uploadError}
        </Alert>
      )}

      {/* Image previews */}
      <Grid container spacing={2}>
        {images.map((file, index) => (
          <Grid item xs={6} sm={4} md={3} key={file.id || index}>
            <Paper
              sx={{
                position: 'relative',
                paddingTop: '100%', // 1:1 Aspect ratio
                overflow: 'hidden',
                cursor: 'pointer'
              }}
              onClick={() => setPreviewImage(file.preview || null)}
            >
              {file.preview ? (
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
                />
              ) : (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'action.hover'
                  }}
                >
                  <ImageIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                </Box>
              )}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  display: 'flex',
                  justifyContent: 'space-between',
                  p: 1,
                  bgcolor: 'rgba(0, 0, 0, 0.3)'
                }}
              >
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetPrimaryImage(index);
                  }}
                  sx={{ color: 'white' }}
                >
                  {index === primaryImageIndex ? <StarIcon /> : <StarBorderIcon />}
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage(index);
                  }}
                  sx={{ color: 'white' }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Image preview dialog */}
      <Dialog
        open={!!previewImage}
        onClose={() => setPreviewImage(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Image Preview
          <IconButton
            onClick={() => setPreviewImage(null)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8
            }}
          >
            <DeleteIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {previewImage && (
            <Box
              component="img"
              src={previewImage}
              sx={{
                width: '100%',
                height: 'auto',
                maxHeight: '70vh',
                objectFit: 'contain'
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ImagesUploadForm;
