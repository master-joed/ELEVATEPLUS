// src/components/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, setDoc, doc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";

// Import all required components
import { Container, Typography, Grid, TextField, Select, MenuItem, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Box, Alert } from '@mui/material';
import AdminNav from './AdminNav'; // <-- NEW
import ManagerDashboard from './ManagerDashboard'; // <-- NEW
import AgentDashboard from './AgentDashboard'; // <-- NEW

function AdminDashboard({ user, onLogout }) {
  // State to control which dashboard view the Admin is looking at
  const [currentView, setCurrentView] = useState('Admin'); 

  // --- EXISTING USER MANAGEMENT LOGIC ---
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ fullName: '', email: '', password: '', role: 'Agent' });
  const [alertState, setAlertState] = useState({ type: '', message: '' });

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

  const handleAddUser = async (e) => {
    e.preventDefault();
    setAlertState({ type: '', message: '' });

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, newUser.email, newUser.password);
      
      await setDoc(doc(db, "users", userCredential.user.uid), {
        fullName: newUser.fullName,
        role: newUser.role,
        email: newUser.email,
      });

      await auth.signOut();
      
      setAlertState({ 
          type: 'success', 
          message: `User ${newUser.email} created successfully! Please log back in.` 
      });

    } catch (err) {
        let message = err.message.includes('auth/email-already-in-use') 
                        ? 'Error: This email is already registered.' 
                        : 'An unexpected error occurred. Check email and password requirements.';
        setAlertState({ type: 'error', message: message });
    }
  };
  
  // --- FUNCTION TO RENDER THE SELECTED VIEW ---
  const renderDashboardView = () => {
    if (currentView === 'Manager') {
        // Pass the Admin's user object to simulate a manager session if needed, or simply render the Manager view.
        return <ManagerDashboard user={{ fullName: "Admin (Manager View)", role: "Manager" }} onLogout={onLogout} />;
    }
    if (currentView === 'Agent') {
        // Render a generic Agent View
        return <AgentDashboard user={{ fullName: "Admin (Agent View)", role: "Agent" }} onLogout={onLogout} />;
    }

    // Default: Render the Admin Tools view
    return (
        <Container 
            component={Paper} 
            elevation={3} 
            sx={{ padding: 4, mt: 3, mb: 4, backgroundColor: 'background.paper' }}
        >
            <Typography variant="h5" gutterBottom sx={{ color: 'primary.dark', fontWeight: 'bold' }}>User Management</Typography>
            
            {/* --- Alert Messages --- */}
            {alertState.message && (
                <Alert severity={alertState.type} sx={{ mt: 2, mb: 2 }}>
                    {alertState.message}
                </Alert>
            )}

            {/* --- ADD NEW USER SECTION --- */}
            <Box sx={{ my: 4, p: 3, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'secondary.dark' }}>Add New User</Typography>
                {/* ... (Your existing Add User Form JSX) ... */}
                <form onSubmit={handleAddUser}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={3}>
                        <TextField label="Full Name" name="fullName" value={newUser.fullName} onChange={handleInputChange} required fullWidth variant="outlined" />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                        <TextField label="Email" name="email" type="email" value={newUser.email} onChange={handleInputChange} required fullWidth variant="outlined"/>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                        <TextField label="Password" name="password" type="password" value={newUser.password} onChange={handleInputChange} required fullWidth variant="outlined"/>
                        </Grid>
                        <Grid item xs={12} sm={2}>
                        <Select name="role" value={newUser.role} onChange={handleInputChange} required fullWidth variant="outlined">
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
                <Typography variant="h6" gutterBottom sx={{ color: 'secondary.dark' }}>Manage Users</Typography>
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
  };
  
  // The main return block for the Admin Dashboard component
  return (
    <Container maxWidth="lg" sx={{ pt: 2, pb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>ELEVATEPLUS Admin</Typography>
        <Box>
            <Typography variant="body1" sx={{ mr: 2, display: 'inline' }}>Logged in as: {user.fullName}</Typography>
            <Button variant="contained" color="secondary" onClick={onLogout}>Logout</Button>
        </Box>
      </Box>
      
      <AdminNav currentView={currentView} onViewChange={setCurrentView} />

      {renderDashboardView()}

    </Container>
  );
}

export default AdminDashboard;