// src/components/LoginPage.js
import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from "firebase/auth";
import { Box, Typography, TextField, Button, Paper, Grid } from '@mui/material';

function LoginPage() {
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      let errorMessage = 'Invalid Email or Password. Please check your credentials.';
      setError(errorMessage);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8f9fa', 
      }}
    >
      <Paper elevation={12} 
        sx={{ 
          padding: 4, 
          width: '100%', 
          maxWidth: 400, 
          textAlign: 'center',
        }}
      >
        <Typography variant="h4" gutterBottom sx={{ color: '#007BFF', fontWeight: 'bold' }}>
          LTVplus <span style={{ color: '#333333' }}>ELEVATEPLUS</span>
        </Typography>

        <Typography variant="h6" gutterBottom sx={{ mb: 4, color: '#495057' }}>
          Coaching App Login
        </Typography>

        <form onSubmit={handleLogin}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField 
                label="Email" 
                variant="outlined" 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
                fullWidth 
              />
            </Grid>
            <Grid item xs={12}>
              <TextField 
                label="Password" 
                variant="outlined" 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                fullWidth 
              />
            </Grid>
            <Grid item xs={12}>
              <Button 
                type="submit" 
                variant="contained" 
                color="primary" 
                fullWidth 
                size="large"
              >
                Login
              </Button>
            </Grid>
          </Grid>
        </form>

        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </Paper>
    </Box>
  );
}

export default LoginPage;