// src/components/auth/ForgotPassword.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Paper, 
  Grid, 
  Alert, 
  CircularProgress 
} from '@mui/material';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase';

const ForgotPassword: React.FC = () => {
  // State for form input
  const [email, setEmail] = useState('');
  
  // State for form submission and feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Form validation state
  const [emailError, setEmailError] = useState<string | null>(null);

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const isValid = re.test(email);
    
    if (!email) {
      setEmailError('Email is required');
      return false;
    } else if (!isValid) {
      setEmailError('Please enter a valid email address');
      return false;
    } else {
      setEmailError(null);
      return true;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset error and success states
    setError(null);
    setSuccess(false);
    
    // Validate email
    if (!validateEmail(email)) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Send password reset email
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (error: any) {
      // Handle specific Firebase auth errors
      if (error.code === 'auth/user-not-found') {
        // For security reasons, don't tell the user that the email doesn't exist
        // Instead, show the success message anyway
        setSuccess(true);
      } else {
        setError(`Failed to send password reset email: ${error.message}`);
        console.error('Password reset error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid container justifyContent="center" sx={{ mt: 8 }}>
      <Grid item xs={12} sm={8} md={6} lg={4}>
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 2
          }}
        >
          <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
            Reset Your Password
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
            Enter your email address and we'll send you a link to reset your password.
          </Typography>
          
          {/* Display error message if there is one */}
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {/* Display success message */}
          {success && (
            <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
              If an account exists with this email, a password reset link has been sent. Please check your email inbox and spam folder.
            </Alert>
          )}
          
          {/* Password Reset Form */}
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => validateEmail(email)}
              error={!!emailError}
              helperText={emailError}
              disabled={loading || success}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, p: 1.5, borderRadius: 2 }}
              disabled={loading || success}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Send Reset Link'
              )}
            </Button>
            
            <Grid container justifyContent="center" sx={{ mt: 2 }}>
              <Grid item xs={12} sx={{ textAlign: 'center' }}>
                <Link to="/login" style={{ textDecoration: 'none' }}>
                  <Typography variant="body2" color="primary">
                    Back to Sign In
                  </Typography>
                </Link>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default ForgotPassword;