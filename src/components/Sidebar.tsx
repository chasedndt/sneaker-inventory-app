// src/components/Sidebar.tsx
import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  useTheme,
  alpha
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import SellIcon from '@mui/icons-material/Sell';
import ReceiptIcon from '@mui/icons-material/Receipt';

import SettingsIcon from '@mui/icons-material/Settings';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'; // For Admin
import { useAuthReady } from '../hooks/useAuthReady';

interface SidebarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

type MenuItemType = {
  label: string;
  icon: React.ReactElement;
  value: string;
  dividerAfter?: boolean;
};

const Sidebar: React.FC<SidebarProps> = ({ onNavigate, currentPage }) => {
  const theme = useTheme();
  const { currentUser, authReady } = useAuthReady();
  const accountTier = currentUser?.accountTier || 'free';

  // Define menu items
  let menuItems: MenuItemType[] = [ // Changed to let to allow modification
    { label: 'Dashboard', icon: <DashboardIcon />, value: 'dashboard' },
    { label: 'Inventory', icon: <InventoryIcon />, value: 'inventory' },
    { label: 'Sales', icon: <SellIcon />, value: 'sales' },
    { label: 'Expenses', icon: <ReceiptIcon />, value: 'expenses', dividerAfter: true },
    { label: 'Settings', icon: <SettingsIcon />, value: 'settings' },
  ];

  // Conditionally add Admin link if user is an admin
  if (currentUser && accountTier === 'admin') {
    menuItems.push({ label: 'Admin', icon: <AdminPanelSettingsIcon />, value: 'admin', dividerAfter: false });
  }

  const handleNavigate = (page: string) => {
    onNavigate(page);
  };

  // Return early if not authenticated or auth not ready
  if (!authReady || !currentUser) {
    return null;
  }

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: theme.palette.mode === 'dark' ? '#1a1a2e' : '#f8f9fa',
      borderRight: `1px solid ${theme.palette.divider}`,
    }}>
      {/* App Logo and Title */}
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center', 
        borderBottom: `1px solid ${theme.palette.divider}`
      }}>
        <Box 
          sx={{ 
            width: 40, 
            height: 40, 
            borderRadius: '50%', 
            bgcolor: '#8884d8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            mr: 2
          }}
        >
          H
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            Hypelist
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Your Plan: {accountTier ? accountTier.charAt(0).toUpperCase() + accountTier.slice(1) : 'Free'}
          </Typography>
        </Box>
      </Box>

      {/* Navigation Menu */}
      <List sx={{ width: '100%', flex: 1, p: 0 }}>
        {menuItems.map((item) => (
          <React.Fragment key={item.value}>
            <ListItem disablePadding>
              <ListItemButton
                selected={currentPage === item.value}
                onClick={() => handleNavigate(item.value)}
                sx={{
                  py: 1.5,
                  px: 2,
                  borderRadius: 0,
                  '&.Mui-selected': {
                    bgcolor: 'transparent',
                    borderLeft: `3px solid ${theme.palette.primary.main}`,
                    '& .MuiListItemIcon-root': {
                      color: theme.palette.primary.main,
                    },
                    '& .MuiListItemText-primary': {
                      color: theme.palette.primary.main,
                      fontWeight: 'medium',
                    },
                  },
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    // Important: Clip the hover effect to the button boundaries
                    overflow: 'hidden',
                  },
                }}
              >
                <ListItemIcon 
                  sx={{
                    color: currentPage === item.value 
                      ? theme.palette.primary.main 
                      : theme.palette.text.secondary,
                    minWidth: 36,
                    display: 'flex', 
                    alignItems: 'center'
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.label} 
                  primaryTypographyProps={{
                    fontSize: '0.9rem',
                    fontWeight: currentPage === item.value ? 'medium' : 'regular',
                    color: currentPage === item.value 
                      ? theme.palette.primary.main 
                      : theme.palette.text.primary,
                  }}
                />
              </ListItemButton>
            </ListItem>
            {item.dividerAfter && <Divider sx={{ my: 1 }} />}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};

export default Sidebar;