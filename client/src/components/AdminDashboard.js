// client/src/components/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
// Added query and where for fetching managers
import { collection, getDocs, setDoc, doc, query, where } from "firebase/firestore"; 
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"; 

import { Container, Typography, Grid, TextField, Select, MenuItem, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Box, Alert } from '@mui/material';
import AdminNav from './AdminNav';
// Components used for Admin's simulation view
import ManagerDashboard from './ManagerDashboard';
import AgentDashboard from './AgentDashboard';

function AdminDashboard({ user, onLogout }) {
  // State to control which dashboard view the Admin is looking at
  const [currentView, setCurrentView] = useState('Admin'); 

  // --- User Management State ---
  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]); // <-- NEW STATE: Holds list of Managers
  const [newUser, setNewUser] = useState({ fullName: '', email: '', password: '', role: 'Agent' });
  const [alertState, setAlertState] = useState({ type: '', message: '' });

  // Function to fetch all users and managers from Firestore
  const fetchUsers = async () => {
    // 1. Fetch ALL users for the table display
    const usersCollection = await getDocs(collection(db, "users"));
    setUsers(usersCollection.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    
    // 2. Fetch only MANAGERS for the dropdown list
    const managersQuery = query(collection(db, 'users'), where('role', '==', 'Manager'));
    const managersSnapshot = await getDocs(managersQuery);
    // Store manager UID (id) and their full name
    setManagers(managersSnapshot.docs.map(doc => ({ id: doc.id, fullName: doc.data().fullName })));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Logic to handle manager ID selection and ensure role is 'Agent'
    if (name === 'managerId') {
      setNewUser(prev => ({ 
        ...prev, 
        role: 'Agent',
        [name]: value 
      }));
    } else if (name === 'role') {
        // If role changes, clear managerId if it's no longer 'Agent'
        const updates = { [name]: value };
        if (value !== 'Agent') {
            updates.managerId = '';
        }
        setNewUser(prev => ({ ...prev, ...updates }));
    } else {
        // Normal input update
        setNewUser(prev => ({ ...prev, [name]: value }));
    }
  };

  // --- Core Logic: Add New User ---
  const handleAddUser = async (e) => {
    e.preventDefault();
    setAlertState({ type: '', message: '' });

    // Validation: Manager must be selected if the role is Agent
    if (newUser.role === 'Agent' && !newUser.managerId) {
        setAlertState({ type: 'error', message: 'Please select a manager for the new agent.' });
        return;
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, newUser.email, newUser.password);
      
      const userData = {
        fullName: newUser.fullName,
        role: newUser.role,
        email: newUser.email,
        // CONDITIONAL FIELD: managerId is only included if the role is Agent
        ...(newUser.role === 'Agent' && newUser.managerId && { managerId: newUser.managerId }),
      };
      
      await setDoc(doc(db, "users", userCredential.user.uid), userData); 

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
  
  // --- Core Logic: Send Password Reset Email ---
  const handlePasswordReset = async () => {
    try {
      await sendPasswordResetEmail(auth, user.email);
      setAlertState({ 
          type: 'info', 
          message: `A password reset link has been sent to your email: ${user.email}. Check your inbox.` 
      });
    } catch (error) {
      setAlertState({ 
          type: 'error', 
          message: 'Could not send reset email. Ensure you are online and try again.' 
      });
    }
  };

  // --- FUNCTION TO RENDER THE SELECTED VIEW ---
  const renderDashboardView = () => {
    // Note: When Admin views Manager/Agent dashboards, we pass an isSimulated prop
    if (currentView === 'Manager') {
        return <ManagerDashboard user={{ ...user, role: "Manager", fullName: "Admin (Manager View)" }} onLogout={onLogout} isSimulated={true} />;
    }
    if (currentView === 'Agent') {
        return <AgentDashboard user={{ ...user, role: "Agent", fullName: "Admin (Agent View)" }} onLogout={onLogout} isSimulated={true} />;
    }

    // Default: Admin Tools view
    return (
        <Container 
            component={Paper} 
            elevation={3} 
            sx={{ padding: 4, mt: 3, mb: 4, backgroundColor: 'background.paper' }}
        >
            <Typography variant="h5" gutterBottom sx={{ color: 'primary.dark', fontWeight: 'bold' }}>User Management Tools</Typography>
            
            {alertState.message && (
                <Alert severity={alertState.type} sx={{ mt: 2, mb: 2 }}>
                    {alertState.message}
                </Alert>
            )}

            <Box sx={{ my: 4, p: 3, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'secondary.dark' }}>Add New User</Typography>
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
                        
                        {/* --- NEW: Manager Assignment Dropdown (Visible only for Agents) --- */}
                        {newUser.role === 'Agent' && (
                            <Grid item xs={12} sm={3}>
                                <Select
                                    name="managerId"
                                    value={newUser.managerId || ''}
                                    onChange={handleInputChange}
                                    required
                                    fullWidth
                                    variant="outlined"
                                    displayEmpty
                                >
                                    <MenuItem value="" disabled>Select Manager</MenuItem>
                                    {managers.map((manager) => (
                                        <MenuItem key={manager.id} value={manager.id}>
                                            {manager.fullName}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </Grid>
                        )}
                        {/* The Add button needs to adjust its grid space depending on the dropdown */}
                        <Grid item xs={12} sm={newUser.role === 'Agent' ? 1 : 2}> 
                            <Button type="submit" variant="contained" color="primary" fullWidth sx={{height: '56px'}}>Add</Button>
                        </Grid>
                    </Grid>
                </form>
            </Box>

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
  
  return (
    <Container maxWidth="lg" sx={{ pt: 2, pb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>ELEVATEPLUS Admin</Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="body1" sx={{ mr: 2, display: 'inline' }}>Logged in as: {user.fullName}</Typography>
          
          <Button variant="outlined" color="primary" onClick={handlePasswordReset}>
              Change Password
          </Button>
          
          <Button variant="contained" color="secondary" onClick={onLogout}>
              Logout
          </Button>
        </Box>
      </Box>
      
      <AdminNav currentView={currentView} onViewChange={setCurrentView} />

      {renderDashboardView()}

    </Container>
  );
}

export default AdminDashboard;