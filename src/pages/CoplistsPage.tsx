// src/pages/CoplistsPage.tsx
import React from 'react';
import { Box, Typography, Paper, useTheme } from '@mui/material';

const CoplistsPage: React.FC = () => {
  const theme = useTheme();
  
  return (
    <Box sx={{ 
      p: { xs: 2, md: 3 },
      maxWidth: '1600px',
      margin: '0 auto',
      width: '100%'
    }}>
      <Typography 
        variant="h5" 
        sx={{ 
          mb: 3, 
          fontWeight: 600,
          color: theme.palette.mode === 'dark' ? 'white' : 'text.primary',
        }}
      >
        Coplists
      </Typography>
      
      <Paper sx={{ 
        p: 4, 
        borderRadius: 2,
        bgcolor: theme.palette.background.paper,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px'
      }}>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          Coming Soon
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center">
          The Coplists feature is currently under development. 
          This page will allow you to create and manage lists of items you want to purchase.
        </Typography>
      </Paper>
    </Box>
  );
};

export default CoplistsPage;