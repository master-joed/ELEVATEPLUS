// src/components/AdminNav.js
import React from 'react';
import { Box, Tabs, Tab } from '@mui/material';

function AdminNav({ currentView, onViewChange }) {
  const handleChange = (event, newValue) => {
    onViewChange(newValue);
  };

  return (
    <Box sx={{ width: '100%', bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
      <Tabs value={currentView} onChange={handleChange} textColor="primary" indicatorColor="primary">
        <Tab value="Admin" label="Admin Tools" />
        <Tab value="Manager" label="Manager View" />
        <Tab value="Agent" label="Agent View" />
      </Tabs>
    </Box>
  );
}

export default AdminNav;