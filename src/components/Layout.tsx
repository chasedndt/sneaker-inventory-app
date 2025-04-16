// src/components/Layout.tsx
import React from 'react';
import { Box, useTheme } from '@mui/material';
import Sidebar from './Sidebar';
import Navbar from './layout/Navbar';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  onNavigate: (page: string) => void;
  currentPage: string;
}

const Layout: React.FC<LayoutProps> = ({ children, onNavigate, currentPage }) => {
  const theme = useTheme();
  const { currentUser } = useAuth();

  if (!currentUser) {
    // If not authenticated, just show the children without layout
    // This should never happen since we use ProtectedRoute, but adding as a safeguard
    return <>{children}</>;
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <Box sx={{ width: 240, flexShrink: 0 }}>
        <Sidebar onNavigate={onNavigate} currentPage={currentPage} />
      </Box>
      
      {/* Main Content */}
      <Box sx={{ 
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <Navbar currentUser={currentUser} />
        <Box sx={{ 
          flexGrow: 1,
          overflow: 'auto',
          backgroundColor: theme.palette.background.default 
        }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;