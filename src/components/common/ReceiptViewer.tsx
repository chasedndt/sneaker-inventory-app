import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  AlertTitle,
  IconButton,
  useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ReceiptIcon from '@mui/icons-material/Receipt';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';

interface ReceiptViewerProps {
  open: boolean;
  onClose: () => void;
  receiptUrl: string | null;
  expenseName?: string;
  onRetry?: () => void;
}

const ReceiptViewer: React.FC<ReceiptViewerProps> = ({
  open,
  onClose,
  receiptUrl,
  expenseName,
  onRetry
}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string | null>(null);

  useEffect(() => {
    if (open && receiptUrl) {
      setLoading(true);
      setError(null);
      
      // Check if the file exists and get content type
      fetch(receiptUrl, { method: 'HEAD' })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          setContentType(response.headers.get('Content-Type'));
          setLoading(false);
        })
        .catch(err => {
          console.error('Error loading receipt:', err);
          setError(err.message || 'Failed to load receipt');
          setLoading(false);
        });
    }
  }, [open, receiptUrl]);

  const handleImageError = () => {
    setError('Failed to load image. The file may be corrupted or inaccessible.');
    setLoading(false);
  };

  const handleDownload = () => {
    if (receiptUrl) {
      const link = document.createElement('a');
      link.href = receiptUrl;
      link.download = expenseName ? `${expenseName}_receipt` : 'receipt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const isPDF = contentType?.includes('pdf') || receiptUrl?.toLowerCase().endsWith('.pdf');
  const isImage = contentType?.includes('image') || 
    receiptUrl?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { height: '80vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptIcon />
          <Typography variant="h6">
            Receipt Viewer
          </Typography>
          {expenseName && (
            <Typography variant="body2" color="text.secondary">
              - {expenseName}
            </Typography>
          )}
        </Box>
        <IconButton 
          aria-label="close" 
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            p: 4,
            flex: 1
          }}>
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              Loading receipt...
            </Typography>
          </Box>
        ) : error ? (
          <Box sx={{ p: 3 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              <AlertTitle>Error Loading Receipt</AlertTitle>
              {error}
            </Alert>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
              {onRetry && (
                <Button 
                  onClick={onRetry} 
                  variant="outlined" 
                  startIcon={<RefreshIcon />}
                >
                  Retry
                </Button>
              )}
              <Button onClick={onClose} variant="contained">
                Close
              </Button>
            </Box>
          </Box>
        ) : receiptUrl ? (
          <Box sx={{ 
            width: '100%', 
            height: '100%', 
            overflow: 'auto',
            position: 'relative'
          }}>
            {isPDF ? (
              <iframe 
                src={receiptUrl} 
                title="View Receipt PDF"
                width="100%" 
                height="100%" 
                style={{ border: 'none' }}
                onLoad={() => setLoading(false)}
                onError={handleImageError}
              />
            ) : isImage ? (
              <img 
                src={receiptUrl} 
                alt="Receipt" 
                style={{ 
                  width: '100%', 
                  height: 'auto',
                  maxHeight: '100%',
                  objectFit: 'contain'
                }} 
                onLoad={() => setLoading(false)}
                onError={handleImageError}
              />
            ) : (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center', 
                alignItems: 'center', 
                p: 4,
                height: '100%'
              }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Unsupported File Type
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  This file type cannot be previewed. You can download it instead.
                </Typography>
                <Button 
                  onClick={handleDownload} 
                  variant="outlined" 
                  startIcon={<DownloadIcon />}
                >
                  Download File
                </Button>
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            p: 4,
            flex: 1
          }}>
            <ReceiptIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Receipt Available
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              This expense doesn't have a receipt uploaded.
            </Typography>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        {receiptUrl && !loading && !error && (
          <Button 
            onClick={handleDownload} 
            variant="outlined" 
            startIcon={<DownloadIcon />}
          >
            Download
          </Button>
        )}
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReceiptViewer; 