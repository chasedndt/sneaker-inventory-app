// src/App.tsx
import React from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import InventoryPage from './pages/InventoryPage';

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
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});

// This is a simplified App component for demonstration
// In a real app, you'd use React Router for navigation between pages
function App() {
  // State to handle which page is currently active
  const [currentPage, setCurrentPage] = React.useState<'dashboard' | 'inventory'>('inventory');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Layout onNavigate={(page) => setCurrentPage(page as 'dashboard' | 'inventory')}>
          {currentPage === 'dashboard' ? <Dashboard /> : <InventoryPage />}
        </Layout>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;