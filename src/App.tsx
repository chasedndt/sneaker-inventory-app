// src/App.tsx
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, CircularProgress, Box } from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

// Auth Components
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import ForgotPassword from './components/Auth/ForgotPassword';
import Profile from './components/Auth/Profile';

// Main App Components
import Dashboard from './pages/Dashboard';
import InventoryPage from './pages/InventoryPage';
import SalesPage from './pages/SalesPage';
import ExpensesPage from './pages/ExpensesPage';

import AdminPage from './pages/AdminPage'; // Import AdminPage
import AdminUsersPage from './pages/AdminUsersPage';

// Settings Pages
import SettingsLayout from './pages/Settings/SettingsLayout';
import ProfileSettings from './pages/Settings/ProfileSettings';
import BillingSettings from './pages/Settings/BillingSettings';
import NotificationSettings from './pages/Settings/NotificationSettings';
import SecuritySettings from './pages/Settings/SecuritySettings';
import InventorySettings from './pages/Settings/InventorySettings';

// Layout Components
import Layout from './components/Layout';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { useAuthReady } from './hooks/useAuthReady';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, authReady } = useAuthReady();
  
  if (!authReady) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

// AppContent component that combines the router with settings
const AppContent: React.FC = () => {
  const { darkMode } = useSettings();
  const [currentPage, setCurrentPage] = useState<string>('dashboard');

  // Create theme based on current darkMode setting
  const theme = React.useMemo(() => createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#8884d8',
      },
      secondary: {
        main: '#82ca9d',
      },
      background: {
        default: darkMode ? '#121212' : '#f5f5f5',
        paper: darkMode ? '#1e1e2d' : '#ffffff',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            '&:hover': {
              overflow: 'hidden',
            },
          },
        },
      },
    },
  }), [darkMode]);

  // Layout-wrapped routes to maintain consistent UI
  const LayoutWrapper = () => {
    const location = useLocation();
    const navigate = useNavigate();
    
    // Extract the current page from the path
    React.useEffect(() => {
      const path = location.pathname.slice(1) || 'dashboard';
      setCurrentPage(path);
    }, [location]);
    
    // Navigation handler for sidebar
    const handleNavigate = (page: string) => {
      navigate(`/${page}`);
      setCurrentPage(page);
    };

    return (
      <Layout onNavigate={handleNavigate} currentPage={currentPage}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          
          {/* Settings Routes */}
          <Route path="/settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to="/settings/profile" replace />} />
            <Route path="profile" element={<ProfileSettings />} />
            <Route path="billing" element={<BillingSettings />} />
            <Route path="inventory" element={<InventorySettings />} />
            <Route path="notifications" element={<NotificationSettings />} />
            <Route path="security" element={<SecuritySettings />} />
          </Route>
          
          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute><AdminUsersPage /></ProtectedRoute>} />
          
          <Route path="/profile" element={<Profile />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Protected routes */}
            <Route path="/*" element={
              <ProtectedRoute>
                <LayoutWrapper />
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </LocalizationProvider>
    </ThemeProvider>
  );
};

// Main App component with all providers
function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;