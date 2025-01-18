// src/components/Layout.tsx
import React from 'react';
import { Box } from '@mui/material';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <Box sx={{
      display: 'flex',
      minHeight: '100vh',
      width: '100%',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      bgcolor: '#f8f9fa'
    }}>
      {/* Sidebar Container */}
      <Box sx={{
        width: '240px',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        borderRight: '1px solid #e0e0e0',
        bgcolor: '#fff',
        zIndex: 1200
      }}>
        <Sidebar />
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
