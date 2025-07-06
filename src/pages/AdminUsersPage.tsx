import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  SelectChangeEvent
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import { useAuth } from '../contexts/AuthContext';
import { useAuthReady } from '../hooks/useAuthReady';
import { api } from '../services/api';

interface User {
  uid: string;
  email: string;
  display_name?: string;
  email_verified: boolean;
  disabled: boolean;
  created_at?: number;
  signup_date?: string;
  last_sign_in?: number;
  is_admin: boolean;
  planTier: 'free' | 'starter' | 'professional';
  custom_claims?: any;
}

type PlanTier = 'free' | 'starter' | 'professional';

const AdminUsersPage: React.FC = () => {
  const { accountTier } = useAuth();
  const { authReady, currentUser } = useAuthReady();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPlanTier, setNewPlanTier] = useState<PlanTier>('free');
  const [updating, setUpdating] = useState(false);

  // Load users on component mount
  useEffect(() => {
    if (authReady && accountTier === 'admin') {
      loadUsers();
    }
  }, [authReady, accountTier]);

  // Filter users based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(
        user =>
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.uid.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.display_name && user.display_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredUsers(filtered);
    }
  }, [users, searchTerm]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.authenticatedFetch('http://127.0.0.1:5000/api/admin/users');
      if (!response.ok) {
        throw new Error(`Failed to load users: ${response.status}`);
      }
      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      console.error('Error loading users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp?: number | string) => {
    if (!timestamp) return 'N/A';
    
    // Handle both timestamp and ISO string formats
    const date = typeof timestamp === 'number' 
      ? new Date(timestamp * 1000) // Firebase timestamps are in seconds
      : new Date(timestamp);
    
    if (isNaN(date.getTime())) return 'N/A';
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getPlanTierColor = (tier: PlanTier) => {
    switch (tier) {
      case 'free': return 'default';
      case 'starter': return 'primary';
      case 'professional': return 'success';
      default: return 'default';
    }
  };

  const getPlanTierLabel = (tier: PlanTier) => {
    switch (tier) {
      case 'free': return 'Free';
      case 'starter': return 'Starter';
      case 'professional': return 'Professional';
      default: return tier;
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setNewPlanTier(user.planTier);
    setEditDialogOpen(true);
  };

  const handleUpdatePlanTier = async () => {
    if (!selectedUser) return;

    try {
      setUpdating(true);
      const response = await api.authenticatedFetch(`http://127.0.0.1:5000/api/admin/users/${selectedUser.uid}/plan-tier`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planTier: newPlanTier
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update plan tier' }));
        throw new Error(errorData.error || 'Failed to update plan tier');
      }

      // Update the user in the local state
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.uid === selectedUser.uid
            ? { ...user, planTier: newPlanTier }
            : user
        )
      );

      setEditDialogOpen(false);
      setSelectedUser(null);
    } catch (err: any) {
      console.error('Error updating plan tier:', err);
      setError(err.message || 'Failed to update plan tier');
    } finally {
      setUpdating(false);
    }
  };

  const handleCloseDialog = () => {
    setEditDialogOpen(false);
    setSelectedUser(null);
    setError(null);
  };

  if (!authReady) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
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
          Access Denied. This page is for administrators only.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        User Management
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        View and manage all registered users and their plan tiers.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="Search by email, UID, or name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            variant="outlined"
            size="small"
            sx={{ flexGrow: 1 }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
          <Button
            variant="outlined"
            onClick={loadUsers}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Paper>

      {/* Users Table */}
      <TableContainer component={Paper} sx={{ backgroundColor: 'background.paper' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'action.hover' }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'action.hover' }}>UID</TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'action.hover' }}>Display Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'action.hover' }}>Signup Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'action.hover' }}>Plan Tier</TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'action.hover' }}>Admin</TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'action.hover' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'action.hover' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ color: 'text.primary', py: 4 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ color: 'text.primary', py: 4 }}>
                  {searchTerm ? 'No users found matching your search.' : 'No users found.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow 
                  key={user.uid}
                  sx={{ 
                    '&:nth-of-type(odd)': { backgroundColor: 'action.hover' },
                    '&:hover': { backgroundColor: 'action.selected' }
                  }}
                >
                  <TableCell sx={{ color: 'text.primary' }}>{user.email}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8em', color: 'text.secondary' }}>
                      {user.uid}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ color: 'text.primary' }}>{user.display_name || 'N/A'}</TableCell>
                  <TableCell sx={{ color: 'text.primary' }}>{formatDate(user.created_at)}</TableCell>
                  <TableCell>
                    <Chip
                      label={getPlanTierLabel(user.planTier)}
                      color={getPlanTierColor(user.planTier)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {user.is_admin ? (
                      <Chip label="Admin" color="warning" size="small" />
                    ) : (
                      <Chip label="User" color="default" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.disabled ? 'Disabled' : 'Active'}
                      color={user.disabled ? 'error' : 'success'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleEditUser(user)}
                      title="Edit Plan Tier"
                      sx={{ color: 'text.primary' }}
                    >
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Plan Tier Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Update Plan Tier for {selectedUser?.email}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Plan Tier</InputLabel>
              <Select
                value={newPlanTier}
                label="Plan Tier"
                onChange={(e: SelectChangeEvent) => setNewPlanTier(e.target.value as PlanTier)}
              >
                <MenuItem value="free">Free</MenuItem>
                <MenuItem value="starter">Starter</MenuItem>
                <MenuItem value="professional">Professional</MenuItem>
              </Select>
            </FormControl>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Current Plan: <strong>{getPlanTierLabel(selectedUser?.planTier || 'free')}</strong>
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              User will see the new tier restrictions immediately after this change.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleUpdatePlanTier}
            variant="contained"
            disabled={updating || newPlanTier === selectedUser?.planTier}
          >
            {updating ? <CircularProgress size={20} /> : 'Update Plan Tier'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminUsersPage; 