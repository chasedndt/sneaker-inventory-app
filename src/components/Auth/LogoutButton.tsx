// src/components/auth/LogoutButton.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Button, 
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert
} from '@mui/material';
import { LogoutOutlined as LogoutIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

interface LogoutButtonProps {
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'inherit' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  iconOnly?: boolean;
  showConfirmDialog?: boolean;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  fullWidth = false,
  iconOnly = false,
  showConfirmDialog = true
}) => {
  // State for handling logout process
  const [loading, setLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get auth methods from context
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Handle logout confirmation dialog
  const handleLogoutClick = () => {
    if (showConfirmDialog) {
      setConfirmDialogOpen(true);
    } else {
      handleLogout();
    }
  };

  // Handle actual logout
  const handleLogout = async () => {
    setLoading(true);
    
    try {
      await logout();
      
      // Redirect to login page after successful logout
      navigate('/login');
    } catch (error: any) {
      console.error('Logout error:', error);
      setError(`Failed to log out: ${error.message}`);
    } finally {
      setLoading(false);
      setConfirmDialogOpen(false);
    }
  };

  // Close error alert
  const handleCloseError = () => {
    setError(null);
  };

  // Cancel logout
  const handleCancelLogout = () => {
    setConfirmDialogOpen(false);
  };

  return (
    <>
      {iconOnly ? (
        <Tooltip title="Logout">
          <IconButton
            onClick={handleLogoutClick}
            color={color}
            size={size}
            disabled={loading}
            aria-label="logout"
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : <LogoutIcon />}
          </IconButton>
        </Tooltip>
      ) : (
        <Button
          variant={variant}
          color={color}
          size={size}
          fullWidth={fullWidth}
          onClick={handleLogoutClick}
          disabled={loading}
          startIcon={<LogoutIcon />}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : "Logout"}
        </Button>
      )}
      
      {/* Logout Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={handleCancelLogout}>
        <DialogTitle>Confirm Logout</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to log out? You will need to sign in again to access your account.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelLogout} color="primary">
            Cancel
          </Button>
          <Button onClick={handleLogout} color="error" autoFocus>
            {loading ? <CircularProgress size={24} color="inherit" /> : "Logout"}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Error Snackbar */}
      <Snackbar open={!!error} autoHideDuration={6000} onClose={handleCloseError}>
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
};

export default LogoutButton;