import React, { useState, useEffect } from 'react';
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
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SettingsIcon from '@mui/icons-material/Settings';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthReady } from '../../hooks/useAuthReady';
import stripeService, { StripeProducts, SubscriptionStatus } from '../../services/stripeService';

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
  const { authReady } = useAuthReady();

  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [stripeProducts, setStripeProducts] = useState<StripeProducts>({});
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Load Stripe products and subscription status
  useEffect(() => {
    const loadStripeData = async (retryCount = 0) => {
      try {
        setLoading(true);
        setError(null);

        // Load Stripe products and subscription status in parallel
        const [products, status] = await Promise.all([
          stripeService.getProducts(),
          stripeService.getSubscriptionStatus()
        ]);

        console.log('Loaded Stripe products:', products);
        console.log('Loaded subscription status:', status);
        
        setStripeProducts(products);
        setSubscriptionStatus(status);
        setCurrentPlan(status.tier);

        // Check URL parameters for success/cancel messages
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('success') === 'true') {
          setSnackbarMessage('Payment successful! Your subscription has been activated.');
          setSnackbarOpen(true);
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } else if (urlParams.get('canceled') === 'true') {
          setSnackbarMessage('Payment was canceled. You can try again anytime.');
          setSnackbarOpen(true);
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (err) {
        console.error('Failed to load Stripe data:', err);
        
        // Handle specific auth initialization error with retry
        if (err instanceof Error && err.message.includes('Auth getter not initialised') && retryCount < 3) {
          console.log(`Auth not ready, retrying in ${1000 * (retryCount + 1)}ms... (attempt ${retryCount + 1}/3)`);
          setTimeout(() => loadStripeData(retryCount + 1), 1000 * (retryCount + 1));
          return;
        }
        
        setError('Failed to load billing information. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (authReady && currentUser) {
      loadStripeData();
    }
  }, [authReady, currentUser]);

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
        items: '30 items max',
        storage: '1 GB storage',
        users: '1 user',
        events: 'Basic metrics'
      },
      features: [
        { name: 'Basic inventory tracking', included: true },
        { name: 'Basic expenses tracking', included: true },
        { name: 'Community support', included: true },
        { name: 'Record sales', included: false, tooltip: 'Upgrade to track sales and revenue' },
        { name: 'ROI metrics & profit analysis', included: false, tooltip: 'Upgrade to see detailed profit calculations and ROI percentages' },
        { name: 'Advanced analytics', included: false },
        { name: 'Export capabilities', included: false },
        { name: 'Priority support', included: false },
      ]
    },
    {
      id: 'starter',
      name: 'Starter',
      price: stripeProducts?.starter?.monthly_price || 19.00,
      billing: 'monthly',
      description: 'Support your small-scale reselling needs.',
      buttonText: currentPlan === 'starter' ? 'Current plan' : 'Upgrade now',
      highlight: true,
      limits: {
        items: '250 items',
        storage: '5 GB storage',
        users: '1 user',
        events: 'Basic analytics'
      },
      features: [
        { name: 'Everything in Free', included: true },
        { name: 'Record sales & track revenue', included: true },
        { name: 'Up to 250 items', included: true },
        { name: 'ROI metrics & profit analysis', included: true },
        { name: 'Basic analytics dashboard', included: true },
        { name: 'Standard email support', included: true },
        { name: 'Advanced analytics', included: false },
        { name: 'Export capabilities', included: false },
        { name: 'Priority support', included: false },
      ]
    },
    {
      id: 'professional',
      name: 'Professional',
      price: stripeProducts?.professional?.monthly_price || 49.00,
      billing: 'monthly',
      description: 'For serious resellers looking for more capacity, efficiency, and automation.',
      buttonText: currentPlan === 'professional' ? 'Current plan' : 'Upgrade now',
      limits: {
        items: 'Unlimited items',
        storage: '20 GB storage',
        users: '3 users',
        events: 'Advanced analytics'
      },
      features: [
        { name: 'Everything in Starter', included: true },
        { name: 'Unlimited items', included: true },
        { name: 'Advanced analytics dashboard', included: true },
        { name: 'Detailed ROI tracking', included: true },
        { name: 'Export to CSV/PDF', included: true },
        { name: 'Priority email support', included: true },
        { name: 'Bulk operations', included: true },
        { name: 'Advanced reporting', included: true },
      ]
    }
  ];

  // Handle plan change
  const handlePlanChange = async (planId: string) => {
    try {
      console.log('🔵 BillingSettings - Plan change requested:', planId, stripeProducts[planId]);
      console.log('🔵 BillingSettings - Available products:', stripeProducts);
      
      if (planId === 'free') {
        setSnackbarMessage('You are already on the free plan.');
        setSnackbarOpen(true);
        return;
      }

      if (planId === currentPlan) {
        setSnackbarMessage('You are already on this plan.');
        setSnackbarOpen(true);
        return;
      }

      // Get the Stripe product info
      const productInfo = stripeProducts[planId];
      if (!productInfo) {
        console.error('Product info not found for plan:', planId, 'Available products:', stripeProducts);
        setSnackbarMessage('Plan not available. Please try again.');
        setSnackbarOpen(true);
        return;
      }

      console.log('Initiating Stripe checkout for price ID:', productInfo.price_id);
      // Redirect to Stripe Checkout
      await stripeService.redirectToCheckout(productInfo.price_id);
    } catch (error) {
      console.error('Failed to initiate plan change:', error);
      setSnackbarMessage('Failed to process payment. Please try again.');
      setSnackbarOpen(true);
    }
  };

  // Handle billing portal
  const handleBillingPortal = async () => {
    try {
      if (!subscriptionStatus?.has_subscription) {
        setSnackbarMessage('No active subscription found.');
        setSnackbarOpen(true);
        return;
      }

      await stripeService.redirectToBillingPortal();
    } catch (error) {
      console.error('Failed to open billing portal:', error);
      setSnackbarMessage('Failed to open billing portal. Please try again.');
      setSnackbarOpen(true);
    }
  };



  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Show loading state
  if (loading) {
    return (
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Box sx={{ width: '100%' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity="info" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

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
        
        {/* Current subscription info */}
        {subscriptionStatus?.has_subscription && (
          <Box sx={{ mb: 2, p: 2, backgroundColor: alpha(theme.palette.success.main, 0.1), borderRadius: 1 }}>
            <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>
              Active Subscription: {stripeService.getTierDisplayName(subscriptionStatus.tier)}
            </Typography>
            {subscriptionStatus.subscription && (
              <Typography variant="body2" color="text.secondary">
                {subscriptionStatus.subscription.cancel_at_period_end ? 
                  `Cancels on ${stripeService.formatPeriodEndDate(subscriptionStatus.subscription.current_period_end)}` :
                  `Renews on ${stripeService.formatPeriodEndDate(subscriptionStatus.subscription.current_period_end)}`
                }
              </Typography>
            )}
            <Button
              startIcon={<SettingsIcon />}
              onClick={handleBillingPortal}
              sx={{ mt: 1 }}
              size="small"
            >
              Manage Subscription
            </Button>
          </Box>
        )}
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            You are currently on the <strong>{currentPlan?.toUpperCase() || 'FREE'}</strong> plan.
          </Typography>
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
                  /month
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
