// src/components/Layout.tsx
import React from 'react';
import { Box, useTheme } from '@mui/material';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  onNavigate: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onNavigate }) => {
  const theme = useTheme();
  
  return (
    <Box sx={{
      display: 'flex',
      minHeight: '100vh',
      width: '100%',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      bgcolor: theme.palette.background.default
    }}>
      {/* Sidebar Container */}
      <Box sx={{
        width: '240px',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        borderRight: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.background.paper,
        zIndex: 1200,
        boxShadow: theme.palette.mode === 'dark' 
          ? 'none' 
          : '1px 0 5px rgba(0,0,0,0.05)'
      }}>
        <Sidebar onNavigate={onNavigate} />
      </Box>

      {/* Main content */}
      <Box sx={{
        flexGrow: 1,
        marginLeft: '240px',
        minHeight: '100vh',
        overflow: 'auto',
        padding: '24px 32px',
      }}>
        <Box sx={{
          maxWidth: '1600px',
          margin: '0 auto',
          width: '100%'
        }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;