import React from 'react';
import { Box } from '@mui/material';
import Sidebar from '../components/Sidebar';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 3, marginLeft: '240px' }}>
        {children}
      </Box>
    </Box>
  );
};

export default Layout;