import React, { useState } from 'react';
import { 
  Box, 
  List, 
  ListItem, 
  ListItemButton,
  ListItemIcon, 
  ListItemText, 
  Paper, 
  Typography, 
  useTheme,
  Divider,
  Container
} from '@mui/material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PaymentIcon from '@mui/icons-material/Payment';
import SecurityIcon from '@mui/icons-material/Security';
import SettingsIcon from '@mui/icons-material/Settings';

const SettingsLayout: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Define settings menu items
  const menuItems = [
    { 
      title: 'Account', 
      icon: <AccountCircleIcon />, 
      path: '/settings/profile',
      description: 'Manage your account information'
    },
    { 
      title: 'Plans & Billing', 
      icon: <PaymentIcon />, 
      path: '/settings/billing',
      description: 'Manage your subscription and billing details'
    },
    { 
      title: 'Inventory', 
      icon: <SettingsIcon />, 
      path: '/settings/inventory',
      description: 'Configure inventory settings'
    },
    { 
      title: 'Notifications', 
      icon: <NotificationsIcon />, 
      path: '/settings/notifications',
      description: 'Manage notification preferences'
    },
    { 
      title: 'Security', 
      icon: <SecurityIcon />, 
      path: '/settings/security',
      description: 'Update your password and security settings'
    }
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 3, fontWeight: 'bold' }}>
        Settings
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Settings Navigation */}
        <Paper 
          elevation={0} 
          sx={{ 
            width: { xs: '100%', md: 280 },
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            flexShrink: 0
          }}
        >
          <List component="nav" sx={{ p: 1 }}>
            {menuItems.map((item, index) => (
              <ListItemButton 
                key={item.path}
                selected={location.pathname === item.path}
                onClick={() => navigate(item.path)}
                sx={{ 
                  borderRadius: 1,
                  mb: 0.5,
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.08)' 
                      : 'rgba(0, 0, 0, 0.04)',
                    '&:hover': {
                      backgroundColor: theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.12)' 
                        : 'rgba(0, 0, 0, 0.08)',
                    }
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.title} 
                  secondary={item.description}
                  primaryTypographyProps={{ 
                    fontWeight: location.pathname === item.path ? 'bold' : 'normal' 
                  }}
                  secondaryTypographyProps={{
                    sx: { 
                      display: { xs: 'none', sm: 'block' },
                      fontSize: '0.75rem'
                    }
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>

        {/* Content Area */}
        <Box sx={{ flexGrow: 1 }}>
          <Outlet />
        </Box>
      </Box>
    </Container>
  );
};

export default SettingsLayout;
