// src/pages/AdminPage.tsx
import React from 'react';
import { Box, Typography, Button, Paper, Grid, Alert } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useAuthReady } from '../hooks/useAuthReady';
import { seedDummyData, setUserAccountTier } from '../utils/adminTools';

const AdminPage: React.FC = () => {
  const { accountTier } = useAuth();
  const { authReady, currentUser } = useAuthReady();

  const handleSetUserTier = async () => {
    if (!currentUser) {
      alert('Error: No user logged in.');
      return;
    }
    // Example: Prompt for tier or have a selection mechanism
    const newTier = prompt("Enter new tier for user " + currentUser.uid + " (e.g., 'free', 'starter', 'premium', 'admin'):", accountTier || 'free') as 'free' | 'starter' | 'premium' | 'admin' | null;
    if (newTier) {
      try {
        await setUserAccountTier(currentUser.uid, newTier);
        // Optionally, refresh auth state here if custom claims change immediately
        // await currentUser.getIdToken(true); // Force refresh token and custom claims
        // auth.refreshUser(); // If you have a method in AuthContext to refresh user state
        alert(`User tier update initiated for ${currentUser.uid} to ${newTier}. (Stubbed - check console and refresh page after backend update)`);
      } catch (error: any) { 
        alert('Failed to set user tier: ' + error.message);
        console.error('Failed to set user tier:', error);
      }
    }
  };

  const handleSeedItems = async () => {
    const dataType = prompt("Enter data type to seed ('items', 'sales', 'expenses'):", 'items') as 'items' | 'sales' | 'expenses' | null;
    if (!dataType || !['items', 'sales', 'expenses'].includes(dataType)) {
      alert('Invalid data type.');
      return;
    }
    const countStr = prompt("Enter number of dummy records to create:", '10');
    const count = parseInt(countStr || '0', 10);
    if (isNaN(count) || count <= 0) {
      alert('Invalid count.');
      return;
    }
    try {
      await seedDummyData(dataType, count);
      alert(`Seeding ${count} dummy ${dataType} initiated. (Stubbed - check console)`);
    } catch (error: any) {
      alert('Failed to seed data: ' + error.message);
      console.error('Failed to seed data:', error);
    }
  };

  if (!authReady) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <Typography>Loading authentication...</Typography>
      </Box>
    );
  }

  if (!currentUser) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Access Denied. Please log in.</Alert>
      </Box>
    );
  }

  if (accountTier !== 'admin') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access Denied. This page is for administrators only. Your current tier is: {accountTier || 'unknown'}.
        </Alert>
      </Box>
    );
  }

  return (
    <Paper sx={{ m: 3, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Admin Control Panel
      </Typography>
      <Alert severity="warning" sx={{ mb: 2 }}>
        This page is for development and administrative purposes only. Actions taken here can directly affect application data and user accounts.
      </Alert>
      
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>User Management</Typography>
          <Button variant="contained" color="primary" onClick={handleSetUserTier} sx={{ mr: 1 }}>
            Set User Tier (Placeholder)
          </Button>
          {/* Add more user management tools here */}
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>Data Management</Typography>
          <Button variant="contained" color="secondary" onClick={handleSeedItems} sx={{ mr: 1 }}>
            Seed Dummy Items (Placeholder)
          </Button>
          {/* Add more data seeding/management tools here */}
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 3 }}>
        <Typography variant="body2">Current User ID: {currentUser.uid}</Typography>
        <Typography variant="body2">Current Account Tier: {accountTier}</Typography>
      </Box>
    </Paper>
  );
};

export default AdminPage;
