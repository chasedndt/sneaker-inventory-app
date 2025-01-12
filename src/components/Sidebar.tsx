// src/components/Sidebar.tsx
import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Avatar,
  Divider
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Timeline as ActivityIcon,
  Inventory as InventoryIcon,
  AttachMoney as SalesIcon,
  List as CoplistsIcon,
  NewReleases as ReleasesIcon,
  Receipt as ExpensesIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

const drawerWidth = 240;

const Sidebar: React.FC = () => {
  const mainMenuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Activity', icon: <ActivityIcon />, path: '/activity' },
    { text: 'Inventory', icon: <InventoryIcon />, path: '/inventory' },
    { text: 'Sales', icon: <SalesIcon />, path: '/sales' },
    { text: 'Coplists', icon: <CoplistsIcon />, path: '/coplists' },
    { text: 'Releases', icon: <ReleasesIcon />, path: '/releases' },
    { text: 'Expenses', icon: <ExpensesIcon />, path: '/expenses' }
  ];

  const settingsMenuItems = [
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' }
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          bgcolor: '#f5f5f5',
          borderRight: '1px solid #e0e0e0'
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ mr: 2, bgcolor: '#1976d2' }}>T</Avatar>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Hello Tranton
            </Typography>
            <Typography variant="caption" color="primary">
              Your Plan: Professional
            </Typography>
          </Box>
        </Box>
      </Box>
      <Divider />
      <List>
        {mainMenuItems.map((item) => (
          <ListItem 
            key={item.text}
            sx={{ 
              cursor: 'pointer',
              '&:hover': {
                bgcolor: 'rgba(25, 118, 210, 0.08)'
              }
            }}
          >
            <ListItemIcon sx={{ color: 'primary.main' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        {settingsMenuItems.map((item) => (
          <ListItem 
            key={item.text}
            sx={{ 
              cursor: 'pointer',
              '&:hover': {
                bgcolor: 'rgba(25, 118, 210, 0.08)'
              }
            }}
          >
            <ListItemIcon sx={{ color: 'primary.main' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};

export default Sidebar;
