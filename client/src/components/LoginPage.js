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
      // Firebase errors are detailed, so we clean up the message for the user
      let errorMessage = err.message.includes('auth/invalid-credential') 
                         ? 'Invalid Email or Password. Please try again.' 
                         : 'An unexpected error occurred during login.';
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
        // Optional: Sets a dark background for the whole page if App.css is mostly removed
        backgroundColor: '#1a1a1a', 
      }}
    >
      <Paper elevation={12} 
        sx={{ 
          padding: 4, 
          width: '100%', 
          maxWidth: 400, 
          textAlign: 'center',
          backgroundColor: '#2e2e2e',
        }}
      >
        <Typography variant="h4" gutterBottom sx={{ color: 'white', mb: 4 }}>
          ELEVATEPLUS Login
        </Typography>

        <form onSubmit={handleLogin}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField 
                label="Email" 
                variant="filled" 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
                fullWidth 
                sx={{ input: { color: 'white' } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField 
                label="Password" 
                variant="filled" 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                fullWidth 
                sx={{ input: { color: 'white' } }}
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