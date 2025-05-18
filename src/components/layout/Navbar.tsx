// src/components/layout/Navbar.tsx
import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  IconButton, 
  Menu, 
  MenuItem, 
  Avatar, 
  Tooltip, 
  useTheme,
  Button,
  Badge,
  // InputBase import removed
  Select,
  SelectChangeEvent,
  FormControl,
  InputLabel,
  Divider,
  ListItemIcon,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  Popover,
  Switch,
  Collapse,
  Alert,
  ListItem,
  List,
  ListItemText,
  ListItemButton
} from '@mui/material';
import { alpha, styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';

// Icons
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
// SearchIcon import removed
import NotificationsIcon from '@mui/icons-material/Notifications';
import MailIcon from '@mui/icons-material/Mail';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LanguageIcon from '@mui/icons-material/Language';
import HelpIcon from '@mui/icons-material/Help';
import FeedbackIcon from '@mui/icons-material/Feedback';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// Styled components removed - search functionality moved to individual pages

interface NavbarProps {
  currentUser?: User | null;
  toggleSidebar?: () => void;
  isMobile?: boolean;
  sidebarOpen?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ 
  currentUser, 
  toggleSidebar, 
  isMobile = false, 
  sidebarOpen = true 
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { darkMode, toggleDarkMode } = useSettings();
  
  // State for various menus
  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState<null | HTMLElement>(null);
  const [messagesAnchorEl, setMessagesAnchorEl] = useState<null | HTMLElement>(null);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [quickActionsAnchorEl, setQuickActionsAnchorEl] = useState<null | HTMLElement>(null);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState<boolean>(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const [feedbackText, setFeedbackText] = useState<string>('');
  
  // Calculate menu states
  const profileOpen = Boolean(profileAnchorEl);
  const notificationsOpen = Boolean(notificationsAnchorEl);
  const messagesOpen = Boolean(messagesAnchorEl);
  const quickActionsOpen = Boolean(quickActionsAnchorEl);

  // Mock notification and message counts
  const notificationCount = 3;
  const messageCount = 2;
  
  // Handle menu openings
  const handleProfileMenu = (event: React.MouseEvent<HTMLElement>) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleNotificationsMenu = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationsAnchorEl(event.currentTarget);
  };

  const handleMessagesMenu = (event: React.MouseEvent<HTMLElement>) => {
    setMessagesAnchorEl(event.currentTarget);
  };

  const handleQuickActionsMenu = (event: React.MouseEvent<HTMLElement>) => {
    setQuickActionsAnchorEl(event.currentTarget);
  };

  // Handle menu closings
  const handleCloseProfile = () => {
    setProfileAnchorEl(null);
  };

  const handleCloseNotifications = () => {
    setNotificationsAnchorEl(null);
  };

  const handleCloseMessages = () => {
    setMessagesAnchorEl(null);
  };

  const handleCloseQuickActions = () => {
    setQuickActionsAnchorEl(null);
  };

  // Authentication actions
  const handleLogout = async () => {
    handleCloseProfile();
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const handleProfile = () => {
    handleCloseProfile();
    navigate('/profile');
  };

  const handleSettings = () => {
    handleCloseProfile();
    navigate('/settings');
  };

  // Navigation actions
  const handleNavigate = (path: string) => {
    navigate(`/${path}`);
  };

  // Feedback dialog handlers
  const handleOpenFeedback = () => {
    handleCloseProfile();
    setFeedbackDialogOpen(true);
    setFeedbackSubmitted(false);
    setFeedbackText('');
  };

  const handleCloseFeedback = () => {
    setFeedbackDialogOpen(false);
  };

  const handleSubmitFeedback = () => {
    // In a real app, you would send this to your backend
    console.log('Feedback submitted:', feedbackText);
    setFeedbackSubmitted(true);
    // Close dialog after a delay
    setTimeout(() => {
      setFeedbackDialogOpen(false);
      setFeedbackText('');
    }, 2000);
  };

  // Mock notifications data
  const notifications = [
    { id: 1, message: 'New sale recorded for Nike 9FIFTY Cap', time: '2 mins ago' },
    { id: 2, message: 'Inventory update completed', time: '1 hour ago' },
    { id: 3, message: 'Your account subscription will renew in 3 days', time: 'Yesterday' },
  ];

  // Mock messages data
  const messages = [
    { id: 1, from: 'Support Team', message: 'Your ticket has been resolved', time: '30 mins ago' },
    { id: 2, from: 'System', message: 'Backup completed successfully', time: '2 hours ago' },
  ];

  return (
    <AppBar 
      position="static" 
      color="primary" 
      sx={{ 
        boxShadow: 'none',
        zIndex: theme.zIndex.drawer + 1,
        borderRadius: 0
      }}
    >
      <Toolbar>
        {isMobile && (
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={toggleSidebar}
            edge="start"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
        )}

        <Typography variant="h6" component="div" sx={{ 
          display: { xs: 'none', sm: 'block' },
          flexGrow: 1 
        }}>
          Hypelist
        </Typography>

        {/* Search Bar removed as each page has its own search functionality */}

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {/* Navigation buttons on larger screens */}
          <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
            <Button color="inherit" onClick={() => handleNavigate('dashboard')}>
              Dashboard
            </Button>
            <Button color="inherit" onClick={() => handleNavigate('inventory')}>
              Inventory
            </Button>
            <Button color="inherit" onClick={() => handleNavigate('sales')}>
              Sales
            </Button>
            <Button color="inherit" onClick={() => handleNavigate('expenses')}>
              Expenses
            </Button>
          </Box>

          {/* Quick Actions Menu */}
          <Tooltip title="Quick Actions">
            <IconButton
              color="inherit"
              onClick={handleQuickActionsMenu}
              sx={{ ml: 1 }}
            >
              <Badge badgeContent={0} color="error">
                <SettingsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton
              color="inherit"
              onClick={handleNotificationsMenu}
              sx={{ ml: 1 }}
            >
              <Badge badgeContent={notificationCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Messages */}
          <Tooltip title="Messages">
            <IconButton
              color="inherit"
              onClick={handleMessagesMenu}
              sx={{ ml: 1 }}
            >
              <Badge badgeContent={messageCount} color="error">
                <MailIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Dark mode toggle */}
          <Tooltip title={darkMode ? "Switch to light mode" : "Switch to dark mode"}>
            <IconButton onClick={toggleDarkMode} color="inherit" sx={{ ml: 1 }}>
              {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>
          
          {/* User menu */}
          {currentUser && (
            <>
              <Tooltip title="Account settings">
                <IconButton
                  onClick={handleProfileMenu}
                  size="small"
                  sx={{ ml: 2 }}
                  aria-controls={profileOpen ? 'account-menu' : undefined}
                  aria-haspopup="true"
                  aria-expanded={profileOpen ? 'true' : undefined}
                >
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32,
                      bgcolor: theme.palette.primary.dark 
                    }}
                  >
                    {currentUser.displayName 
                      ? currentUser.displayName.charAt(0).toUpperCase() 
                      : currentUser.email
                      ? currentUser.email.charAt(0).toUpperCase()
                      : 'U'}
                  </Avatar>
                </IconButton>
              </Tooltip>
              <Menu
                id="account-menu"
                anchorEl={profileAnchorEl}
                open={profileOpen}
                onClose={handleCloseProfile}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{
                  sx: {
                    mt: 1.5,
                    minWidth: 200,
                    boxShadow: theme.shadows[3],
                    '& .MuiMenuItem-root': {
                      px: 2,
                      py: 1,
                    }
                  }
                }}
              >
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {currentUser.displayName || 'User'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {currentUser.email}
                  </Typography>
                </Box>
                <Divider />
                <MenuItem onClick={handleProfile}>
                  <ListItemIcon>
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  My Profile
                </MenuItem>
                <MenuItem onClick={handleSettings}>
                  <ListItemIcon>
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  Settings
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleOpenFeedback}>
                  <ListItemIcon>
                    <FeedbackIcon fontSize="small" />
                  </ListItemIcon>
                  Send Feedback
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  Logout
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Toolbar>

      {/* Notifications Menu */}
      <Popover
        id="notifications-menu"
        anchorEl={notificationsAnchorEl}
        open={notificationsOpen}
        onClose={handleCloseNotifications}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            mt: 1.5,
            width: 320,
            maxHeight: 400,
            overflow: 'auto',
            boxShadow: theme.shadows[3],
          }
        }}
      >
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle1" fontWeight="medium">
            Notifications
          </Typography>
        </Box>
        <List sx={{ p: 0 }}>
          {notifications.map((notification) => (
            <ListItemButton 
              key={notification.id} 
              sx={{ 
                p: 2, 
                borderBottom: `1px solid ${theme.palette.divider}`,
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                }
              }}
            >
              <ListItemText 
                primary={notification.message}
                secondary={notification.time}
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItemButton>
          ))}
        </List>
        <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'center' }}>
          <Button 
            size="small" 
            onClick={handleCloseNotifications}
            sx={{ textTransform: 'none' }}
          >
            View all notifications
          </Button>
        </Box>
      </Popover>

      {/* Messages Menu */}
      <Popover
        id="messages-menu"
        anchorEl={messagesAnchorEl}
        open={messagesOpen}
        onClose={handleCloseMessages}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            mt: 1.5,
            width: 320,
            maxHeight: 400,
            overflow: 'auto',
            boxShadow: theme.shadows[3],
          }
        }}
      >
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle1" fontWeight="medium">
            Messages
          </Typography>
        </Box>
        <List sx={{ p: 0 }}>
          {messages.map((message) => (
            <ListItemButton 
              key={message.id} 
              sx={{ 
                p: 2, 
                borderBottom: `1px solid ${theme.palette.divider}`,
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                }
              }}
            >
              <ListItemText 
                primary={
                  <Typography variant="body2" fontWeight="medium">
                    {message.from}
                  </Typography>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" noWrap>
                      {message.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {message.time}
                    </Typography>
                  </Box>
                }
              />
            </ListItemButton>
          ))}
        </List>
        <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'center' }}>
          <Button 
            size="small" 
            onClick={handleCloseMessages}
            sx={{ textTransform: 'none' }}
          >
            View all messages
          </Button>
        </Box>
      </Popover>

      {/* Quick Actions Menu */}
      <Menu
        id="quick-actions-menu"
        anchorEl={quickActionsAnchorEl}
        open={quickActionsOpen}
        onClose={handleCloseQuickActions}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            mt: 1.5,
            minWidth: 180,
            boxShadow: theme.shadows[3],
          }
        }}
      >
        <MenuItem onClick={() => { handleCloseQuickActions(); handleNavigate('inventory'); }}>
          <ListItemIcon>
            <DashboardIcon fontSize="small" />
          </ListItemIcon>
          View Inventory
        </MenuItem>
        <MenuItem onClick={() => { handleCloseQuickActions(); handleNavigate('sales'); }}>
          <ListItemIcon>
            <ExitToAppIcon fontSize="small" />
          </ListItemIcon>
          Record Sale
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { handleCloseQuickActions(); handleNavigate('settings'); }}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>
        <MenuItem onClick={() => { handleCloseQuickActions(); handleNavigate('help'); }}>
          <ListItemIcon>
            <HelpIcon fontSize="small" />
          </ListItemIcon>
          Help Center
        </MenuItem>
      </Menu>

      {/* Feedback Dialog */}
      <Dialog 
        open={feedbackDialogOpen}
        onClose={handleCloseFeedback}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ m: 0, p: 2 }}>
          <Typography variant="h6">Send Feedback</Typography>
          <IconButton
            aria-label="close"
            onClick={handleCloseFeedback}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Collapse in={feedbackSubmitted}>
            <Alert 
              icon={<CheckCircleIcon fontSize="inherit" />} 
              severity="success"
              sx={{ mb: 2 }}
            >
              Thank you for your feedback!
            </Alert>
          </Collapse>
          <TextField
            autoFocus
            label="Your feedback"
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            disabled={feedbackSubmitted}
            placeholder="Tell us what you think about Hypelist..."
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseFeedback}
            color="inherit"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitFeedback}
            color="primary"
            variant="contained"
            disabled={!feedbackText.trim() || feedbackSubmitted}
          >
            {feedbackSubmitted ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleIcon sx={{ mr: 1, fontSize: 16 }} />
                Submitted
              </Box>
            ) : 'Submit Feedback'}
          </Button>
        </DialogActions>
      </Dialog>
    </AppBar>
  );
};

export default Navbar;