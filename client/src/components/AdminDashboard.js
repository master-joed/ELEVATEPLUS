// src/components/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, setDoc, doc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";

// --- Import MUI Components ---
import { Container, Typography, Grid, TextField, Select, MenuItem, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Box } from '@mui/material';

function AdminDashboard({ user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ fullName: '', email: '', password: '', role: 'Agent' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch all users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      const usersCollection = await getDocs(collection(db, "users"));
      setUsers(usersCollection.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchUsers();
  }, []);

  const handleInputChange = (e) => {
    setNewUser({ ...newUser, [e.target.name]: e.target.value });
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // 1. Create the new user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, newUser.email, newUser.password);
      
      // 2. Create the user document in Firestore to store their role
      await setDoc(doc(db, "users", userCredential.user.uid), {
        fullName: newUser.fullName,
        role: newUser.role,
        email: newUser.email,
      });

      // 3. IMPORTANT: Sign the new user out immediately
      await auth.signOut();
      
      // We will show a success message before the page redirects to login.
      setSuccess(`User ${newUser.email} created successfully! Please log back in.`);

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Container component={Paper} elevation={3} sx={{ padding: 4, mt: 4, backgroundColor: '#2e2e2e', color: 'white' }}>
      <Typography variant="h4" gutterBottom>Admin Dashboard</Typography>
      <Typography variant="h6" color="primary" gutterBottom>Welcome, {user.fullName}!</Typography>
      
      <Button variant="outlined" color="secondary" onClick={onLogout} sx={{ mb: 3 }}>Logout</Button>

      {/* --- ADD NEW USER SECTION --- */}
      <Box sx={{ my: 4, p: 3, border: '1px solid #555', borderRadius: 1 }}>
        <Typography variant="h5" gutterBottom>Add New User</Typography>
        <form onSubmit={handleAddUser}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={3}>
              <TextField 
                label="Full Name" 
                name="fullName" 
                value={newUser.fullName} 
                onChange={handleInputChange} 
                required 
                fullWidth 
                variant="filled" 
                sx={{ input: { color: 'white' } }} 
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
                variant="filled"
                sx={{ input: { color: 'white' } }}
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
                variant="filled"
                sx={{ input: { color: 'white' } }}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Select
                name="role"
                value={newUser.role}
                onChange={handleInputChange}
                required
                fullWidth
                variant="filled"
                sx={{ color: 'white' }}
              >
                <MenuItem value="Agent">Agent</MenuItem>
                <MenuItem value="Manager">Manager</MenuItem>
                <MenuItem value="Admin">Admin</MenuItem>
              </Select>
            </Grid>
            <Grid item xs={12} sm={1}>
              <Button type="submit" variant="contained" color="success" fullWidth>Add</Button>
            </Grid>
          </Grid>
        </form>
        {error && <Typography color="error" sx={{ mt: 2 }}>Error: {error}</Typography>}
        {success && <Typography color="success.main" sx={{ mt: 2 }}>{success}</Typography>}
      </Box>

      {/* --- MANAGE USERS TABLE --- */}
      <Box sx={{ my: 4 }}>
        <Typography variant="h5" gutterBottom>Manage Users</Typography>
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="simple table">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#424242' }}>
                <TableCell sx={{ color: 'white' }}>Full Name</TableCell>
                <TableCell sx={{ color: 'white' }}>Email</TableCell>
                <TableCell sx={{ color: 'white' }}>Role</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
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