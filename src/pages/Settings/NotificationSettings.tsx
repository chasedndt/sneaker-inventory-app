import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Switch,
  FormControlLabel,
  Divider,
  useTheme,
  Grid,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  alpha
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SaveIcon from '@mui/icons-material/Save';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

interface NotificationChannel {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  icon: React.ReactNode;
}

interface NotificationSetting {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

const NotificationSettings: React.FC = () => {
  const theme = useTheme();

  // Notification channels state
  const [channels, setChannels] = useState<NotificationChannel[]>([
    {
      id: 'email',
      name: 'Email',
      description: 'Receive notifications through emails.',
      enabled: true,
      icon: <EmailIcon />
    },
    {
      id: 'browser',
      name: 'Browser',
      description: 'Receive notifications through browser.',
      enabled: false,
      icon: <NotificationsIcon />
    }
  ]);

  // Notification settings state
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: 'price-alerts',
      name: 'Price alerts',
      description: 'Get notified when prices change for items in your inventory.',
      enabled: true
    },
    {
      id: 'marketplace-updates',
      name: 'Marketplace updates',
      description: 'Get notified when there are updates to marketplace listings you follow.',
      enabled: true
    },
    {
      id: 'inventory-alerts',
      name: 'Inventory alerts',
      description: 'Get notified when inventory levels reach thresholds you set.',
      enabled: true
    },
    {
      id: 'system-updates',
      name: 'System updates',
      description: 'Get notified about system updates and new features.',
      enabled: false
    },
    {
      id: 'security-alerts',
      name: 'Security alerts',
      description: 'Get notified about security-related events for your account.',
      enabled: true
    }
  ]);

  // Handle channel toggle
  const handleChannelToggle = (channelId: string) => {
    setChannels(channels.map(channel => 
      channel.id === channelId 
        ? { ...channel, enabled: !channel.enabled } 
        : channel
    ));
  };

  // Handle setting toggle
  const handleSettingToggle = (settingId: string) => {
    setSettings(settings.map(setting => 
      setting.id === settingId 
        ? { ...setting, enabled: !setting.enabled } 
        : setting
    ));
  };

  // Handle save settings
  const handleSaveSettings = () => {
    // In a real app, this would save to the backend
    console.log('Saving notification settings:', { channels, settings });
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Notification Channels */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          Notification channels
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Choose how you want to be notified.
        </Typography>

        <List disablePadding>
          {channels.map((channel, index) => (
            <React.Fragment key={channel.id}>
              {index > 0 && <Divider component="li" />}
              <ListItem
                sx={{
                  py: 2,
                  px: 0
                }}
              >
                <Box sx={{ mr: 2, color: 'primary.main' }}>
                  {channel.icon}
                </Box>
                <ListItemText
                  primary={channel.name}
                  secondary={channel.description}
                  primaryTypographyProps={{
                    fontWeight: 'medium'
                  }}
                />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    checked={channel.enabled}
                    onChange={() => handleChannelToggle(channel.id)}
                    color="primary"
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      </Paper>

      {/* Related Updates */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          Related updates
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Choose which updates you want to receive.
        </Typography>

        <List disablePadding>
          {settings.map((setting, index) => (
            <React.Fragment key={setting.id}>
              {index > 0 && <Divider component="li" />}
              <ListItem
                sx={{
                  py: 2,
                  px: 0
                }}
              >
                <ListItemText
                  primary={setting.name}
                  secondary={setting.description}
                  primaryTypographyProps={{
                    fontWeight: 'medium'
                  }}
                />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    checked={setting.enabled}
                    onChange={() => handleSettingToggle(setting.id)}
                    color="primary"
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      </Paper>

      {/* Email Preferences */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          Email preferences
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Customize how you receive email notifications.
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={true}
                  color="primary"
                />
              }
              label="Daily digest email"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
              Receive a daily summary of all your notifications instead of individual emails.
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={false}
                  color="primary"
                />
              }
              label="Marketing emails"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
              Receive promotional emails about new features and special offers.
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleSaveSettings}
        >
          Save preferences
        </Button>
      </Box>

      {/* Info Box */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mt: 3,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: alpha(theme.palette.info.main, 0.05),
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <InfoOutlinedIcon sx={{ mr: 2, color: 'info.main' }} />
        <Typography variant="body2" color="text.secondary">
          Some notifications, such as security alerts and account-related updates, cannot be disabled as they contain important information about your account.
        </Typography>
      </Paper>
    </Box>
  );
};

export default NotificationSettings;
