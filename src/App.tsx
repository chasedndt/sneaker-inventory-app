// src/App.tsx
import React from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import InventoryPage from './pages/InventoryPage';
import SalesPage from './pages/SalesPage';

// Create a theme instance
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#8884d8',
    },
    secondary: {
      main: '#e57373',
    },
    background: {
      default: '#121212',
      paper: '#1e1e2d',
    },
    text: {
      primary: 'rgba(255, 255, 255, 0.9)',
      secondary: 'rgba(255, 255, 255, 0.7)'
    }
  },
  components: {
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        },
        head: {
          fontWeight: 'bold',
          backgroundColor: '#1e1e2d',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:nth-of-type(odd)': {
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: 'rgba(30, 30, 45, 0.95)',
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '0.75rem',
          fontWeight: 400,
          padding: '8px 12px',
          maxWidth: 220,
          lineHeight: 1.5
        }
      }
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});

// This is a simplified App component for demonstration
// In a real app, you'd use React Router for navigation between pages
function App() {
  // State to handle which page is currently active
  const [currentPage, setCurrentPage] = React.useState<'dashboard' | 'inventory' | 'sales'>('dashboard');

  // Handle navigation between pages
  const handleNavigate = (page: string) => {
    if (page === 'dashboard' || page === 'inventory' || page === 'sales') {
      setCurrentPage(page);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Layout onNavigate={handleNavigate}>
          {currentPage === 'dashboard' && <Dashboard />}
          {currentPage === 'inventory' && <InventoryPage />}
          {currentPage === 'sales' && <SalesPage />}
        </Layout>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;