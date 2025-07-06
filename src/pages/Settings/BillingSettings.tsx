import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  useTheme,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  alpha,
  Tooltip
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useAuth } from '../../contexts/AuthContext';

// Plan feature types
interface PlanFeature {
  name: string;
  included: boolean;
  tooltip?: string;
}

// Plan interface
interface Plan {
  id: string;
  name: string;
  price: number;
  billing: 'monthly' | 'yearly';
  description: string;
  features: PlanFeature[];
  highlight?: boolean;
  comingSoon?: boolean;
  buttonText: string;
  limits: {
    items: string;
    storage: string;
    users: string;
    events: string;
  };
}

const BillingSettings: React.FC = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');
  const [currentPlan, setCurrentPlan] = useState<string>('free');

  // Define plans
  const plans: Plan[] = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      billing: 'monthly',
      description: 'Basic inventory tracking for individuals.',
      buttonText: 'Current plan',
      limits: {
        items: '50 items / month',
        storage: '1 GB storage',
        users: '1 user',
        events: 'Economy scans'
      },
      features: [
        { name: 'Access to all basic features', included: true },
        { name: 'Basic inventory tracking', included: true },
        { name: 'Limited analytics', included: true },
        { name: 'Community support', included: true },
        { name: 'Advanced analytics', included: false },
        { name: 'Priority support', included: false },
        { name: 'Bulk operations', included: false },
        { name: 'API access', included: false },
      ]
    },
    {
      id: 'starter',
      name: 'Starter',
      price: billing === 'monthly' ? 19 : 190,
      billing: billing,
      description: 'Support your small-scale reselling needs.',
      buttonText: 'Upgrade now',
      highlight: true,
      limits: {
        items: '500 items / month',
        storage: '5 GB storage',
        users: '1 user',
        events: 'Priority scans'
      },
      features: [
        { name: 'Everything in Free', included: true },
        { name: 'Advanced inventory tracking', included: true },
        { name: 'Basic analytics', included: true },
        { name: 'Email support', included: true },
        { name: 'Bulk import/export', included: true },
        { name: 'Advanced analytics', included: false },
        { name: 'Priority support', included: false },
        { name: 'API access', included: false },
      ]
    },
    {
      id: 'professional',
      name: 'Professional',
      price: billing === 'monthly' ? 49 : 490,
      billing: billing,
      description: 'For serious resellers looking for more capacity, efficiency, and automation.',
      buttonText: 'Upgrade now',
      limits: {
        items: '2000 items / month',
        storage: '20 GB storage',
        users: '3 users',
        events: 'Priority scans'
      },
      features: [
        { name: 'Everything in Starter', included: true },
        { name: 'Advanced analytics', included: true },
        { name: 'Priority support', included: true },
        { name: 'Bulk operations', included: true },
        { name: 'API access', included: true },
        
        { name: 'White-label exports', included: true },
                { name: 'Advanced integrations', included: true },
      ]
    }
  ];

  // Handle plan change
  const handlePlanChange = (planId: string) => {
    // For now, show an alert about the plan change
    // In the next phase, this will integrate with Stripe payment processing
    if (planId === 'free') {
      alert('You are already on the free plan.');
      return;
    }
    
    const selectedPlan = plans.find(p => p.id === planId);
    if (selectedPlan) {
      const message = `Plan upgrade to ${selectedPlan.name} ($${selectedPlan.price}/${selectedPlan.billing}) will be implemented in the next phase with Stripe payment processing.`;
      alert(message);
      console.log(`Plan change requested: ${planId}`, selectedPlan);
    }
  };

  // Toggle billing period
  const toggleBilling = () => {
    setBilling(billing === 'monthly' ? 'yearly' : 'monthly');
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
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
          Choose the right plan for your business
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            You are currently on the <strong>{currentPlan.toUpperCase()}</strong> plan.
            {billing === 'yearly' && ' Save 15% with yearly billing.'}
          </Typography>
          
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
            <Typography 
              variant="body2" 
              color={billing === 'monthly' ? 'primary' : 'text.secondary'}
              sx={{ fontWeight: billing === 'monthly' ? 'bold' : 'normal' }}
            >
              Monthly
            </Typography>
            
            <Button 
              variant="outlined"
              size="small"
              onClick={toggleBilling}
              sx={{ 
                mx: 1,
                minWidth: 0,
                borderRadius: 4,
                px: 1,
                borderColor: theme.palette.primary.main,
                '&:hover': {
                  borderColor: theme.palette.primary.dark,
                }
              }}
            >
              <Box 
                sx={{ 
                  width: 40,
                  height: 20,
                  borderRadius: 10,
                  position: 'relative',
                  bgcolor: billing === 'yearly' ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.2),
                  transition: 'background-color 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  px: 0.5
                }}
              >
                <Box 
                  sx={{ 
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: 'white',
                    position: 'absolute',
                    left: billing === 'yearly' ? 'calc(100% - 18px)' : '2px',
                    transition: 'left 0.3s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }}
                />
              </Box>
            </Button>
            
            <Typography 
              variant="body2" 
              color={billing === 'yearly' ? 'primary' : 'text.secondary'}
              sx={{ fontWeight: billing === 'yearly' ? 'bold' : 'normal' }}
            >
              Yearly (Save 15%)
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Plan Cards */}
      <Grid container spacing={2}>
        {plans.map((plan) => (
          <Grid item xs={12} sm={6} md={3} key={plan.id}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                height: '100%',
                borderRadius: 2,
                border: plan.highlight 
                  ? `2px solid ${theme.palette.primary.main}` 
                  : `1px solid ${theme.palette.divider}`,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.1)',
                }
              }}
            >
              {plan.highlight && (
                <Chip
                  label="Best value"
                  color="primary"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: -12,
                    right: 20,
                    fontWeight: 'bold',
                  }}
                />
              )}
              
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                {plan.name}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 2 }}>
                <Typography variant="h4" component="span" sx={{ fontWeight: 'bold' }}>
                  ${plan.price}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  /{billing}
                </Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 0 }}>
                {plan.description}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              {/* Plan limits */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Limits
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      {plan.limits.items}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      {plan.limits.storage}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      {plan.limits.users}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      {plan.limits.events}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
              
              {/* Features list */}
              <Box sx={{ flexGrow: 1, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Features
                </Typography>
                <List dense disablePadding>
                  {plan.features.map((feature, index) => (
                    <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 30 }}>
                        {feature.included ? (
                          <CheckIcon fontSize="small" color="success" />
                        ) : (
                          <CloseIcon fontSize="small" color="disabled" />
                        )}
                      </ListItemIcon>
                      <ListItemText 
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography 
                              variant="body2" 
                              color={feature.included ? 'text.primary' : 'text.disabled'}
                            >
                              {feature.name}
                            </Typography>
                            {feature.tooltip && (
                              <Tooltip title={feature.tooltip} arrow>
                                <InfoOutlinedIcon 
                                  fontSize="small" 
                                  sx={{ ml: 0.5, width: 16, height: 16, color: 'text.secondary' }} 
                                />
                              </Tooltip>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
              
              <Button
                variant={plan.id === currentPlan ? "outlined" : "contained"}
                color="primary"
                fullWidth
                disabled={plan.id === currentPlan || plan.comingSoon}
                onClick={() => handlePlanChange(plan.id)}
                sx={{ 
                  mt: 'auto',
                  textTransform: 'none',
                  fontWeight: 'bold'
                }}
              >
                {plan.buttonText}
              </Button>
              
              {plan.comingSoon && (
                <Typography variant="caption" align="center" sx={{ mt: 1, display: 'block' }}>
                  Coming soon
                </Typography>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Additional Information */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mt: 3,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: alpha(theme.palette.primary.main, 0.05)
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <InfoOutlinedIcon sx={{ mr: 2, color: theme.palette.primary.main }} />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Need a custom plan?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Contact our sales team for custom pricing and features tailored to your business needs.
            </Typography>
          </Box>
          <Button 
            variant="outlined" 
            color="primary" 
            sx={{ ml: 'auto', textTransform: 'none' }}
          >
            Contact Sales
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default BillingSettings;
