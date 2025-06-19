// src/components/common/ImageViewer.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
  DialogActions,
  Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import LoginIcon from '@mui/icons-material/Login';
import { api } from '../../services/api';
import { getImageUrl } from '../../utils/imageUtils';
import { useAuthReady } from '../../hooks/useAuthReady';
import { useNavigate } from 'react-router-dom';

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
  const { currentUser, getAuthToken, authReady } = useAuthReady();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(initialImageIndex);
  const [authError, setAuthError] = useState<boolean>(false);
  const [authCheckingInProgress, setAuthCheckingInProgress] = useState(false);

  // Authentication check function
  const checkAuthentication = useCallback(async () => {
    setAuthCheckingInProgress(true);
    try {
      if (!authReady) {
        setAuthError(true);
        setError('Authentication process is not yet complete. Please wait and try again.');
        return false;
      }
      if (!currentUser) {
        setAuthError(true);
        setError('Authentication required. Please log in to view images.');
        setTimeout(() => {
          onClose();
          navigate('/login', { 
            state: { 
              from: '/inventory',
              message: 'Please log in to view item images.' 
            } 
          });
        }, 2000);
        return false;
      }
      
      const token = await getAuthToken();
      if (!token) {
        setAuthError(true);
        setError('Authentication token is invalid or expired. Please log in again.');
        setTimeout(() => {
          onClose();
          navigate('/login', { 
            state: { 
              from: '/inventory',
              message: 'Your session has expired. Please log in again.' 
            } 
          });
        }, 2000);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Authentication check failed:', error);
      setAuthError(true);
      setError('Authentication error. Please log in again.');
      return false;
    } finally {
      setAuthCheckingInProgress(false);
    }
  }, [authReady, currentUser, getAuthToken, navigate, onClose, setError, setAuthError, setAuthCheckingInProgress]);

  // Fetch images when the dialog opens
  useEffect(() => {
    if (open && itemId !== null) {
      const fetchImages = async () => {
        // Verify authentication first
        const isAuthenticated = await checkAuthentication();
        if (!isAuthenticated) {
          setLoading(false);
          return;
        }
        
        try {
          setLoading(true);
          setError(null);
          setAuthError(false);
          
          // Fetch all images for the item with authenticated request
          try {
            const imageFilenames = await api.getItemImages(itemId);
            
            if (imageFilenames.length === 0) {
              setError('No images found for this item');
              setImages([]);
            } else {
              setImages(imageFilenames);
              // Make sure the initial index is valid
              setCurrentIndex(Math.min(initialImageIndex, imageFilenames.length - 1));
            }
          } catch (apiError: any) {
            // Handle authentication errors specifically
            if (apiError.message && (
                apiError.message.includes('Authentication required') ||
                apiError.message.includes('Authentication expired') ||
                apiError.message.includes('Authentication token is invalid') ||
                apiError.message.includes('Unauthorized access')
            )) {
              setAuthError(true);
              setError(`Authentication error: ${apiError.message}`);
              setTimeout(() => {
                onClose();
                navigate('/login', { 
                  state: { 
                    from: '/inventory',
                    message: 'Your session has expired. Please log in again.' 
                  } 
                });
              }, 2000);
            } else {
              console.error('Error fetching images:', apiError);
              setError(`Failed to load images: ${apiError.message}`);
            }
            setImages([]);
          }
        } catch (err: any) {
          console.error('Error in image viewer:', err);
          
          // Set generic error
          setError(`Error: ${err.message}`);
          setImages([]);
        } finally {
          setLoading(false);
        }
      };
      
      fetchImages();
    }
  }, [open, itemId, initialImageIndex, currentUser, checkAuthentication, onClose, navigate]);

  // Handle navigation
  const handlePrevious = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : images.length - 1));
  }, [images]);
  
  const handleNext = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex < images.length - 1 ? prevIndex + 1 : 0));
  }, [images]);

  // Get current image URL with user ID in the path
  const currentImageUrl = images.length > 0 ? 
    (() => {
      const url = getImageUrl(images[currentIndex], undefined, currentUser?.uid);
      console.log(`Main image URL: ${url}`);
      console.log(`Main image filename: ${images[currentIndex]}`);
      console.log(`User ID for main image: ${currentUser?.uid}`);
      return url;
    })() : 
    '';

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
  }, [open, onClose, handlePrevious, handleNext]);

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

      {/* Authentication check in progress */}
      {authCheckingInProgress && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          p: 2,
          bgcolor: 'background.paper'
        }}>
          <CircularProgress size={24} sx={{ mr: 2 }} />
          <Typography>Verifying authentication...</Typography>
        </Box>
      )}

      <DialogContent sx={{ p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : authError ? (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Alert 
              severity="error" 
              icon={<LoginIcon />}
              sx={{ mb: 2 }}
            >
              Authentication Error
            </Alert>
            <Typography color="error">{error}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Please log in again to view these images.
            </Typography>
          </Box>
        ) : error ? (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Alert severity="error" sx={{ mb: 2 }}>Error Loading Images</Alert>
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
                onError={(e) => {
                  // If image fails to load, show error
                  console.error('Failed to load image:', currentImageUrl);
                  // Set a placeholder or broken image indicator
                  (e.target as HTMLImageElement).src = '/placeholder-image-svg.svg';
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
                  src={(() => {
                    const thumbUrl = getImageUrl(image, undefined, currentUser?.uid);
                    console.log(`Thumbnail ${index} URL: ${thumbUrl}`);
                    console.log(`User ID: ${currentUser?.uid}`);
                    console.log(`Image filename: ${image}`);
                    return thumbUrl;
                  })()}
                  alt={`Thumbnail ${index + 1}`}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  onError={(e) => {
                    // If thumbnail fails to load, show placeholder
                    console.error(`Failed to load thumbnail ${index}: ${image}`);
                    (e.target as HTMLImageElement).src = '/placeholder-image-svg.svg';
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