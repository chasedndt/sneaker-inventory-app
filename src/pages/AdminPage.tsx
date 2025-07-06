// src/pages/AdminPage.tsx
import React, { useState } from 'react';
import { 
  Box, Typography, Button, Paper, Grid, Alert, Card, CardContent, CardActions,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  useTheme
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PeopleIcon from '@mui/icons-material/People';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StorageIcon from '@mui/icons-material/Storage';
import { useAuth } from '../contexts/AuthContext';
import { useAuthReady } from '../hooks/useAuthReady';
import { seedDummyData, setUserAccountTier } from '../utils/adminTools';

const AdminPage: React.FC = () => {
  const { accountTier, refreshToken } = useAuth();
  const { authReady, currentUser } = useAuthReady();
  const navigate = useNavigate();
  const theme = useTheme();

  // State for dialogs
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [seedDialogOpen, setSeedDialogOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'free' | 'starter' | 'professional' | 'admin'>('free');
  const [seedDataType, setSeedDataType] = useState<'items' | 'sales' | 'expenses'>('items');
  const [seedCount, setSeedCount] = useState(10);

  const validTiers = ['free', 'starter', 'professional', 'admin'] as const;
  const validDataTypes = ['items', 'sales', 'expenses'] as const;

  const handleSetUserTier = () => {
    if (!currentUser) {
      alert('Error: No user logged in.');
      return;
    }
    setSelectedTier(accountTier || 'free');
    setTierDialogOpen(true);
  };

  const confirmSetUserTier = async () => {
    if (!currentUser) return;
    
    try {
      await setUserAccountTier(currentUser.uid, selectedTier);
      alert(`User tier updated to ${selectedTier}. Refreshing token to apply changes...`);
      setTierDialogOpen(false);
      
      // Use refreshToken from useAuth hook
      
      // Refresh the user's token to get updated custom claims
      console.log('🔄 Refreshing user token to get updated tier...');
      await refreshToken();
      
      // Force a page refresh to ensure all components get the updated tier
      setTimeout(() => {
        console.log('🔄 Reloading page to apply tier changes...');
        window.location.reload();
      }, 1000);
      
    } catch (error: any) { 
      alert('Failed to set user tier: ' + error.message);
      console.error('Failed to set user tier:', error);
    }
  };

  const handleSeedItems = () => {
    setSeedDialogOpen(true);
  };

  const confirmSeedData = async () => {
    if (seedCount <= 0 || seedCount > 1000) {
      alert('Invalid count. Must be between 1 and 1000.');
      return;
    }
    
    try {
      await seedDummyData(seedDataType, seedCount);
      alert(`Seeding ${seedCount} dummy ${seedDataType} initiated. Check console for results.`);
      setSeedDialogOpen(false);
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
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Admin Control Panel
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage users, tiers, and system data. Use these tools with caution.
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        You are logged in as an administrator. All actions are logged for security purposes.
      </Alert>
      
      <Grid container spacing={3}>
        {/* User Management Card */}
        <Grid item xs={12} md={6} lg={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PeopleIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">User Management</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                View and manage all registered users. Update plan tiers, view signup dates, and manage user access.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • View all users
                • Update plan tiers (Free/Starter/Professional)
                • Search by email or UID
                • Manage user status
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                variant="contained" 
                color="primary"
                onClick={() => navigate('/admin/users')}
                startIcon={<PeopleIcon />}
              >
                Manage Users
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* System Overview Card */}
        <Grid item xs={12} md={6} lg={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DashboardIcon sx={{ mr: 1, color: 'secondary.main' }} />
                <Typography variant="h6">System Overview</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                View system-wide statistics and analytics across all users and data.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Total users and registrations
                • Items, sales, and expenses stats
                • System health monitoring
                • Usage analytics
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                variant="outlined" 
                color="secondary"
                disabled
              >
                Coming Soon
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Data Management Card */}
        <Grid item xs={12} md={6} lg={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <StorageIcon sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="h6">Data Management</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Development tools for seeding dummy data and managing system data.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Seed dummy inventory items
                • Generate test sales data
                • Create sample expenses
                • Data cleanup tools
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                variant="outlined" 
                color="warning"
                onClick={handleSeedItems}
              >
                Seed Data
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Quick Actions Card */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Quick Actions</Typography>
              <Grid container spacing={2}>
                <Grid item>
                  <Button variant="outlined" onClick={handleSetUserTier}>
                    Set Current User Tier
                  </Button>
                </Grid>
                <Grid item>
                  <Button variant="outlined" color="secondary" onClick={() => navigate('/admin/users')}>
                    View All Users
                  </Button>
                </Grid>
              </Grid>
              
              <Box sx={{ 
                mt: 2, 
                p: 2, 
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'grey.50', 
                borderRadius: 1,
                border: `1px solid ${theme.palette.divider}`
              }}>
                <Typography variant="body2" color="text.primary">
                  <strong>Current Session:</strong><br />
                  User ID: {currentUser?.uid}<br />
                  Account Tier: {accountTier}<br />
                  Role: Administrator
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tier Selection Dialog */}
      <Dialog open={tierDialogOpen} onClose={() => setTierDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Set User Account Tier</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Set account tier for user: {currentUser?.uid}
          </Typography>
          <TextField
            select
            fullWidth
            label="Account Tier"
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value as typeof selectedTier)}
            sx={{ mt: 2 }}
          >
            {validTiers.map((tier) => (
              <MenuItem key={tier} value={tier}>
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTierDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmSetUserTier} variant="contained">
            Update Tier
          </Button>
        </DialogActions>
      </Dialog>

      {/* Seed Data Dialog */}
      <Dialog open={seedDialogOpen} onClose={() => setSeedDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Seed Dummy Data</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Data Type"
            value={seedDataType}
            onChange={(e) => setSeedDataType(e.target.value as typeof seedDataType)}
            sx={{ mt: 2, mb: 2 }}
          >
            {validDataTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            type="number"
            fullWidth
            label="Number of Records"
            value={seedCount}
            onChange={(e) => setSeedCount(parseInt(e.target.value) || 0)}
            inputProps={{ min: 1, max: 1000 }}
            helperText="Enter a number between 1 and 1000"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSeedDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmSeedData} variant="contained">
            Seed Data
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPage;
