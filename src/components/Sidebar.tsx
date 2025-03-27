import React, { useState } from 'react';
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
import ShowChartIcon from '@mui/icons-material/ShowChart';
import InventoryIcon from '@mui/icons-material/Inventory';
import SellIcon from '@mui/icons-material/Sell';
import ReceiptIcon from '@mui/icons-material/Receipt';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import SettingsIcon from '@mui/icons-material/Settings';

interface SidebarProps {
  onNavigate: (page: string) => void;
}

type MenuItemType = {
  label: string;
  icon: React.ReactElement;
  value: string;
  dividerAfter?: boolean;
};

const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const theme = useTheme();
  const [activePage, setActivePage] = useState('dashboard');

  // Define menu items
  const menuItems: MenuItemType[] = [
    { label: 'Dashboard', icon: <DashboardIcon />, value: 'dashboard' },
    { label: 'Activity', icon: <ShowChartIcon />, value: 'activity' },
    { label: 'Inventory', icon: <InventoryIcon />, value: 'inventory' },
    { label: 'Sales', icon: <SellIcon />, value: 'sales' },
    { label: 'Expenses', icon: <ReceiptIcon />, value: 'expenses' },
    { label: 'Coplists', icon: <FormatListBulletedIcon />, value: 'coplists' },
    { label: 'Releases', icon: <NewReleasesIcon />, value: 'releases', dividerAfter: true },
    { label: 'Settings', icon: <SettingsIcon />, value: 'settings' },
  ];

  const handleNavigate = (page: string) => {
    setActivePage(page);
    onNavigate(page);
  };

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
            Your Plan: Professional
          </Typography>
        </Box>
      </Box>

      {/* Navigation Menu */}
      <List sx={{ width: '100%', flex: 1, p: 0 }}>
        {menuItems.map((item) => (
          <React.Fragment key={item.value}>
            <ListItem disablePadding>
              <ListItemButton
                selected={activePage === item.value}
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
                    color: activePage === item.value 
                      ? theme.palette.primary.main 
                      : theme.palette.text.secondary,
                    minWidth: 36,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.label} 
                  primaryTypographyProps={{
                    fontSize: '0.9rem',
                    fontWeight: activePage === item.value ? 'medium' : 'regular',
                    color: activePage === item.value 
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