// src/components/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, setDoc, doc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";

import { Container, Typography, Grid, TextField, Select, MenuItem, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Box, Alert } from '@mui/material';

function AdminDashboard({ user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ fullName: '', email: '', password: '', role: 'Agent' });
  const [alertState, setAlertState] = useState({ type: '', message: '' });

  // Function to fetch all users from Firestore
  const fetchUsers = async () => {
    const usersCollection = await getDocs(collection(db, "users"));
    setUsers(usersCollection.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInputChange = (e) => {
    setNewUser({ ...newUser, [e.target.name]: e.target.value });
  };

  // Logic to add a new user securely
  const handleAddUser = async (e) => {
    e.preventDefault();
    setAlertState({ type: '', message: '' });

    try {
      // 1. Create the new user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, newUser.email, newUser.password);
      
      // 2. Create the user document in Firestore to store their role
      await setDoc(doc(db, "users", userCredential.user.uid), {
        fullName: newUser.fullName,
        role: newUser.role,
        email: newUser.email,
      });

      // 3. IMPORTANT: Sign the new user out immediately (required for Spark Plan)
      await auth.signOut();
      
      // Show success message and redirect the admin to log back in
      setAlertState({ 
          type: 'success', 
          message: `User ${newUser.email} created successfully! Please log back in.` 
      });

    } catch (err) {
        // Handle Firebase errors (e.g., email already in use)
        let message = err.message.includes('auth/email-already-in-use') 
                        ? 'Error: This email is already registered.' 
                        : 'An unexpected error occurred. Check email and password requirements.';
        setAlertState({ type: 'error', message: message });
    }
  };

  return (
    <Container 
        component={Paper} 
        elevation={6} 
        sx={{ padding: 4, mt: 4, mb: 4, backgroundColor: 'background.paper' }}
    >
      <Typography variant="h4" gutterBottom sx={{ color: 'primary.dark', fontWeight: 'bold' }}>Admin Dashboard</Typography>
      <Typography variant="h6" color="secondary" gutterBottom>Welcome, {user.fullName}!</Typography>
      
      <Button variant="outlined" color="secondary" onClick={onLogout} sx={{ mb: 3 }}>
          Logout
      </Button>

      {/* --- Alert Messages --- */}
      {alertState.message && (
          <Alert severity={alertState.type} sx={{ mt: 2, mb: 2 }}>
              {alertState.message}
          </Alert>
      )}

      {/* --- ADD NEW USER SECTION --- */}
      <Box sx={{ my: 4, p: 3, border: '1px solid #e0e0e0', borderRadius: 1 }}>
        <Typography variant="h5" gutterBottom sx={{ color: 'secondary.dark' }}>Add New User</Typography>
        <form onSubmit={handleAddUser}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField 
                label="Full Name" 
                name="fullName" 
                value={newUser.fullName} 
                onChange={handleInputChange} 
                required 
                fullWidth 
                variant="outlined" 
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField 
                label="Email" 
                name="email" 
                type="email" 
                value={newUser.email} 
                onChange={handleInputChange} 
                required 
                fullWidth 
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField 
                label="Password" 
                name="password" 
                type="password" 
                value={newUser.password} 
                onChange={handleInputChange} 
                required 
                fullWidth 
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Select
                name="role"
                value={newUser.role}
                onChange={handleInputChange}
                required
                fullWidth
                variant="outlined"
              >
                <MenuItem value="Agent">Agent</MenuItem>
                <MenuItem value="Manager">Manager</MenuItem>
                <MenuItem value="Admin">Admin</MenuItem>
              </Select>
            </Grid>
            <Grid item xs={12} sm={1}>
              <Button type="submit" variant="contained" color="primary" fullWidth sx={{height: '56px'}}>Add</Button>
            </Grid>
          </Grid>
        </form>
      </Box>

      {/* --- MANAGE USERS TABLE --- */}
      <Box sx={{ my: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ color: 'secondary.dark' }}>Manage Users</Typography>
        <TableContainer component={Paper} elevation={3}>
          <Table sx={{ minWidth: 650 }} aria-label="user table">
            <TableHead sx={{ backgroundColor: 'primary.light' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Full Name</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Email</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Role</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f9f9f9' } }}>
                  <TableCell component="th" scope="row">{u.fullName}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.role}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Container>
  );
}

export default AdminDashboard;