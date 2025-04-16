// src/App.tsx
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, CircularProgress, Box } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Layout Components
import Sidebar from './components/Sidebar';
import Navbar from './components/layout/Navbar';

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
import SettingsPage from './pages/SettingsPage';
import CoplistsPage from './pages/CoplistsPage';

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
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

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#8884d8', // Your primary color from the inventory app
    },
    secondary: {
      main: '#82ca9d', // Your secondary color
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
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
  },
});

// Main App Layout with Sidebar and Content Area
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  
  const handleNavigate = (page: string) => {
    setCurrentPage(page);
  };
  
  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <Box sx={{ width: 240, flexShrink: 0 }}>
        <Sidebar onNavigate={handleNavigate} />
      </Box>
      
      {/* Main Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {children}
      </Box>
    </Box>
  );
};

// Public Layout without Sidebar for auth pages
const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      {children}
    </Box>
  );
};

// AppContent component with routes
const AppContent: React.FC = () => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <>
      <Navbar />
      <Routes>
        {/* Public routes with PublicLayout */}
        <Route path="/login" element={
          <PublicLayout>
            <Login />
          </PublicLayout>
        } />
        <Route path="/signup" element={
          <PublicLayout>
            <Signup />
          </PublicLayout>
        } />
        <Route path="/forgot-password" element={
          <PublicLayout>
            <ForgotPassword />
          </PublicLayout>
        } />
        
        {/* Protected routes with AppLayout */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/inventory" element={
          <ProtectedRoute>
            <AppLayout>
              <InventoryPage />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/sales" element={
          <ProtectedRoute>
            <AppLayout>
              <SalesPage />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/expenses" element={
          <ProtectedRoute>
            <AppLayout>
              <ExpensesPage />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/coplists" element={
          <ProtectedRoute>
            <AppLayout>
              <CoplistsPage />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/settings" element={
          <ProtectedRoute>
            <AppLayout>
              <SettingsPage />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/profile" element={
          <ProtectedRoute>
            <AppLayout>
              <Profile />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        {/* Redirect root to dashboard if logged in, otherwise to login page */}
        <Route path="/" element={
          currentUser ? 
            <Navigate to="/dashboard" replace /> : 
            <Navigate to="/login" replace />
        } />
        
        {/* Catch all route for 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

// Main App component with providers
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;