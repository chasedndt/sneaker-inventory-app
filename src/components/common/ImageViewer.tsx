// src/components/common/ImageViewer.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  useTheme,
  Paper,
  CircularProgress,
  DialogActions
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { api } from '../../services/api';
import { getImageUrl } from '../../utils/imageUtils';


interface ImageViewerProps {
  open: boolean;
  onClose: () => void;
  itemId: number | null;
  initialImageIndex?: number;
}

const ImageViewer: React.FC<ImageViewerProps> = ({
  open,
  onClose,
  itemId,
  initialImageIndex = 0
}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(initialImageIndex);

  // Fetch images when the dialog opens
  useEffect(() => {
    if (open && itemId !== null) {
      const fetchImages = async () => {
        try {
          setLoading(true);
          setError(null);
          
          // Fetch all images for the item
          const imageFilenames = await api.getItemImages(itemId);
          
          if (imageFilenames.length === 0) {
            setError('No images found for this item');
            setImages([]);
          } else {
            setImages(imageFilenames);
            // Make sure the initial index is valid
            setCurrentIndex(Math.min(initialImageIndex, imageFilenames.length - 1));
          }
        } catch (err: any) {
          console.error('Error fetching images:', err);
          setError(`Failed to load images: ${err.message}`);
          setImages([]);
        } finally {
          setLoading(false);
        }
      };
      
      fetchImages();
    }
  }, [open, itemId, initialImageIndex]);

  // Handle navigation
  const handlePrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : images.length - 1));
  };
  
  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex < images.length - 1 ? prevIndex + 1 : 0));
  };

  // Get current image URL
  const currentImageUrl = images.length > 0 ? getImageUrl(images[currentIndex]) : '';

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      
      if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: theme.palette.background.paper,
          height: { xs: '80vh', sm: '90vh' }
        }
      }}
    >
      <DialogTitle sx={{ 
        m: 0, 
        p: 2, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.03)'
      }}>
        <Typography variant="h6">
          Item Images {images.length > 0 ? `(${currentIndex + 1}/${images.length})` : ''}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ color: 'grey.500' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : images.length > 0 ? (
          <>
            <Box 
              sx={{ 
                width: '100%', 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                overflow: 'hidden'
              }}
            >
              <Box
                component="img"
                src={currentImageUrl}
                alt={`Item image ${currentIndex + 1}`}
                sx={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  margin: '0 auto'
                }}
              />
            </Box>
            
            {/* Navigation buttons */}
            {images.length > 1 && (
              <>
                <IconButton
                  onClick={handlePrevious}
                  sx={{
                    position: 'absolute',
                    left: 16,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.7)',
                    },
                  }}
                >
                  <ArrowBackIosIcon />
                </IconButton>
                
                <IconButton
                  onClick={handleNext}
                  sx={{
                    position: 'absolute',
                    right: 16,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.7)',
                    },
                  }}
                >
                  <ArrowForwardIosIcon />
                </IconButton>
              </>
            )}
          </>
        ) : (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Typography color="text.secondary">No images available</Typography>
          </Box>
        )}
      </DialogContent>
      
      {/* Thumbnail navigation */}
      {images.length > 1 && (
        <DialogActions sx={{ 
          justifyContent: 'center', 
          p: 2, 
          bgcolor: 'rgba(0, 0, 0, 0.03)',
          overflowX: 'auto'
        }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {images.map((image, index) => (
              <Paper
                key={`thumb-${index}`}
                elevation={index === currentIndex ? 3 : 1}
                sx={{
                  width: 60,
                  height: 60,
                  overflow: 'hidden',
                  borderRadius: 1,
                  cursor: 'pointer',
                  opacity: index === currentIndex ? 1 : 0.7,
                  transition: 'all 0.2s',
                  border: index === currentIndex ? `2px solid ${theme.palette.primary.main}` : 'none',
                  '&:hover': {
                    opacity: 1,
                  },
                }}
                onClick={() => setCurrentIndex(index)}
              >
                <Box
                  component="img"
                  src={getImageUrl(image)}
                  alt={`Thumbnail ${index + 1}`}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </Paper>
            ))}
          </Box>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default ImageViewer;