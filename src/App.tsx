// src/App.tsx
import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import InventoryPage from './pages/InventoryPage';
import SalesPage from './pages/SalesPage';
import ExpensesPage from './pages/ExpensesPage';
import SettingsPage from './pages/SettingsPage';
import CoplistsPage from './pages/CoplistsPage';
import { SettingsProvider, useSettings } from './context/SettingsContext';

// AppContent component that uses the settings context
const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const { darkMode } = useSettings();

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
  }), [darkMode]); // Important: re-create theme when darkMode changes

  // Log when theme changes for debugging
  useEffect(() => {
    console.log("Theme updated, darkMode:", darkMode);
  }, [darkMode, theme]);

  // Handle navigation
  const handleNavigate = (page: string) => {
    setCurrentPage(page);
  };

  // Render the current page
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'inventory':
        return <InventoryPage />;
      case 'sales':
        return <SalesPage />;
      case 'expenses':
        return <ExpensesPage />;
      case 'settings':
        return <SettingsPage />;
      case 'coplists':
        return <CoplistsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Layout onNavigate={handleNavigate}>
          {renderPage()}
        </Layout>
      </LocalizationProvider>
    </ThemeProvider>
  );
};

// Main App component with providers
function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}

export default App;