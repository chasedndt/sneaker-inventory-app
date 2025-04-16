// src/components/layout/Navbar.tsx
import React, { useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  AccountCircle as AccountIcon,
  Logout as LogoutIcon,
  Login as LoginIcon,
  PersonAdd as PersonAddIcon,
  Inventory as InventoryIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import LogoutButton from '../Auth/LogoutButton';

const Navbar: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State for mobile drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // State for user menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const userMenuOpen = Boolean(anchorEl);
  
  // Toggle drawer
  const toggleDrawer = (open: boolean) => () => {
    setDrawerOpen(open);
  };
  
  // Handle user menu click
  const handleUserMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  // Handle user menu close
  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };
  
  // Handle navigation
  const handleNavigation = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
    handleUserMenuClose();
  };
  
  // Check if a path is active
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Navigation items
  const navigationItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: <DashboardIcon />,
      requiresAuth: true
    },
    {
      label: 'Inventory',
      path: '/inventory',
      icon: <InventoryIcon />,
      requiresAuth: true
    },
    {
      label: 'Settings',
      path: '/settings',
      icon: <SettingsIcon />,
      requiresAuth: true
    }
  ];
  
  // Filtered navigation items based on auth status
  const filteredNavItems = navigationItems.filter(item => {
    return !item.requiresAuth || (item.requiresAuth && currentUser);
  });

  // App logo section
  const LogoSection = () => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer'
      }}
      onClick={() => navigate('/')}
    >
      <Typography
        variant="h6"
        component="div"
        sx={{
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        Hypelist
      </Typography>
    </Box>
  );

  // Desktop navigation section
  const DesktopNav = () => (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      {filteredNavItems.map((item) => (
        <Button
          key={item.path}
          color="inherit"
          component={RouterLink}
          to={item.path}
          sx={{
            mx: 1,
            fontWeight: isActive(item.path) ? 'bold' : 'normal',
            borderBottom: isActive(item.path) ? '2px solid white' : 'none',
            borderRadius: 0,
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }
          }}
        >
          {item.label}
        </Button>
      ))}
    </Box>
  );

  // Auth section (login/signup or user menu)
  const AuthSection = () => {
    if (currentUser) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title="Account settings">
            <IconButton
              onClick={handleUserMenuClick}
              size="small"
              aria-controls={userMenuOpen ? 'account-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={userMenuOpen ? 'true' : undefined}
              sx={{ ml: 2 }}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.dark' }}>
                {currentUser.email?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
            </IconButton>
          </Tooltip>
          
          <Menu
            id="account-menu"
            anchorEl={anchorEl}
            open={userMenuOpen}
            onClose={handleUserMenuClose}
            PaperProps={{
              sx: {
                width: 200,
                mt: 1.5,
                boxShadow: theme.shadows[4],
                borderRadius: 2
              }
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2" noWrap>
                {currentUser.email}
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={() => handleNavigation('/profile')}>
              <ListItemIcon>
                <AccountIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Profile</ListItemText>
            </MenuItem>
            <MenuItem>
              <ListItemIcon>
                <LogoutIcon fontSize="small" color="error" />
              </ListItemIcon>
              <LogoutButton
                variant="text"
                color="error"
                iconOnly={false}
                showConfirmDialog={false}
              />
            </MenuItem>
          </Menu>
        </Box>
      );
    }
    
    return (
      <Box sx={{ display: 'flex' }}>
        <Button
          color="inherit"
          component={RouterLink}
          to="/login"
          sx={{ 
            fontWeight: isActive('/login') ? 'bold' : 'normal',
            borderBottom: isActive('/login') ? '2px solid white' : 'none',
            borderRadius: 0,
            mx: 1
          }}
        >
          Login
        </Button>
        <Button
          variant="contained"
          color="secondary"
          component={RouterLink}
          to="/signup"
          sx={{
            fontWeight: isActive('/signup') ? 'bold' : 'normal',
            ml: 1
          }}
        >
          Sign Up
        </Button>
      </Box>
    );
  };

  // Mobile drawer content
  const DrawerContent = () => (
    <Box
      sx={{ width: 250 }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Hypelist
        </Typography>
      </Box>
      <Divider />
      
      {currentUser && (
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ mr: 2, bgcolor: 'primary.dark' }}>
              {currentUser.email?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
            <Box>
              <Typography variant="subtitle2" noWrap sx={{ maxWidth: 180 }}>
                {currentUser.email}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
      
      <Divider />
      
      <List>
        {filteredNavItems.map((item) => (
          <ListItemButton
            key={item.path}
            onClick={() => handleNavigation(item.path)}
            selected={isActive(item.path)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      
      <Divider />
      
      {currentUser ? (
        <List>
          <ListItemButton onClick={() => handleNavigation('/profile')}>
            <ListItemIcon><AccountIcon /></ListItemIcon>
            <ListItemText primary="Profile" />
          </ListItemButton>
          <ListItem>
            <ListItemIcon><LogoutIcon color="error" /></ListItemIcon>
            <LogoutButton
              variant="text"
              color="error"
              iconOnly={false}
              showConfirmDialog={false}
            />
          </ListItem>
        </List>
      ) : (
        <List>
          <ListItemButton onClick={() => handleNavigation('/login')}>
            <ListItemIcon><LoginIcon /></ListItemIcon>
            <ListItemText primary="Login" />
          </ListItemButton>
          <ListItemButton onClick={() => handleNavigation('/signup')}>
            <ListItemIcon><PersonAddIcon /></ListItemIcon>
            <ListItemText primary="Sign Up" />
          </ListItemButton>
        </List>
      )}
    </Box>
  );

  return (
    <>
      <AppBar position="static" color="primary" elevation={4}>
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={toggleDrawer(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <LogoSection />
          
          <Box sx={{ flexGrow: 1 }} />
          
          {!isMobile && <DesktopNav />}
          
          <Box sx={{ flexGrow: 1 }} />
          
          <AuthSection />
        </Toolbar>
      </AppBar>
      
      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
      >
        <DrawerContent />
      </Drawer>
    </>
  );
};

export default Navbar;