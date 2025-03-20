// src/components/Sidebar.tsx
import React, { useState } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Avatar,
  Divider,
  useTheme
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

interface SidebarProps {
  onNavigate: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const theme = useTheme();
  const [activePage, setActivePage] = useState<string>('inventory');
  
  const mainMenuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: 'dashboard' },
    { text: 'Activity', icon: <ActivityIcon />, path: 'activity' },
    { text: 'Inventory', icon: <InventoryIcon />, path: 'inventory' },
    { text: 'Sales', icon: <SalesIcon />, path: 'sales' },
    { text: 'Coplists', icon: <CoplistsIcon />, path: 'coplists' },
    { text: 'Releases', icon: <ReleasesIcon />, path: 'releases' },
    { text: 'Expenses', icon: <ExpensesIcon />, path: 'expenses' }
  ];

  const settingsMenuItems = [
    { text: 'Settings', icon: <SettingsIcon />, path: 'settings' }
  ];
  
  const handleNavigate = (path: string) => {
    setActivePage(path);
    onNavigate(path);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ mr: 2, bgcolor: theme.palette.primary.main }}>H</Avatar>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Hypelist
            </Typography>
            <Typography variant="caption" color="primary">
              Your Plan: Professional
            </Typography>
          </Box>
        </Box>
      </Box>
      <Divider />
      
      <List sx={{ flexGrow: 1 }}>
        {mainMenuItems.map((item) => (
          <ListItem 
            key={item.text}
            button
            selected={activePage === item.path}
            onClick={() => handleNavigate(item.path)}
            sx={{ 
              borderRadius: 1,
              mx: 1,
              mb: 0.5,
              cursor: 'pointer',
              position: 'relative',
              zIndex: 1,
              '&.Mui-selected': {
                bgcolor: theme.palette.mode === 'dark' 
                  ? 'rgba(136, 132, 216, 0.15)' 
                  : 'rgba(25, 118, 210, 0.08)',
                '&:hover': {
                  bgcolor: theme.palette.mode === 'dark' 
                    ? 'rgba(136, 132, 216, 0.25)' 
                    : 'rgba(25, 118, 210, 0.12)',
                }
              },
              '&:hover': {
                bgcolor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : 'rgba(0, 0, 0, 0.04)',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: 1,
                    pointerEvents: 'none',
                    zIndex: -1,
                  }
              }
            }}
          >
            <ListItemIcon sx={{ 
              color: activePage === item.path 
                ? theme.palette.primary.main 
                : theme.palette.text.secondary 
            }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.text} 
              primaryTypographyProps={{
                fontWeight: activePage === item.path ? 'bold' : 'normal',
                color: activePage === item.path 
                  ? theme.palette.primary.main 
                  : theme.palette.text.primary
              }}
            />
          </ListItem>
        ))}
      </List>
      
      <Divider />
      
      <List>
        {settingsMenuItems.map((item) => (
          <ListItem 
            key={item.text}
            button
            selected={activePage === item.path}
            onClick={() => handleNavigate(item.path)}
            sx={{ 
              borderRadius: 1,
              mx: 1,
              mb: 0.5,
              cursor: 'pointer',
              '&.Mui-selected': {
                bgcolor: theme.palette.mode === 'dark' 
                  ? 'rgba(136, 132, 216, 0.15)' 
                  : 'rgba(25, 118, 210, 0.08)',
              },
              '&:hover': {
                bgcolor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : 'rgba(0, 0, 0, 0.04)',
              }
            }}
          >
            <ListItemIcon sx={{ 
              color: activePage === item.path 
                ? theme.palette.primary.main 
                : theme.palette.text.secondary 
            }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.text}
              primaryTypographyProps={{
                fontWeight: activePage === item.path ? 'bold' : 'normal',
                color: activePage === item.path 
                  ? theme.palette.primary.main 
                  : theme.palette.text.primary
              }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default Sidebar;