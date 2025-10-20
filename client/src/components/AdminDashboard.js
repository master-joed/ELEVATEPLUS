// client/src/components/AdminDashboard.js
import React, { useState, useEffect } => 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, setDoc, doc, query, where } from "firebase/firestore"; 
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"; 

import { Container, Typography, Grid, TextField, Select, MenuItem, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Box, Alert, Tabs, Tab } from '@mui/material';
import ManagerDashboard from './ManagerDashboard';
import AgentDashboard from './AgentDashboard';

function AdminDashboard({ user, onLogout }) {
  const [currentView, setCurrentView] = useState('Admin'); 
  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]); 
  const [newUser, setNewUser] = useState({ fullName: '', email: '', password: '', role: 'Agent' });
  const [alertState, setAlertState] = useState({ type: '', message: '' });
  
  const [editingUser, setEditingUser] = useState(null); 
  const [isModalOpen, setIsModalOpen] = useState(false); 
  
  // --- Campaign/KPI States (Placeholder) ---
  const [campaigns] = useState([]); // Placeholder for campaign data
  const [allKpis] = useState([]); // Placeholder for KPI data
  const [selectedCampaignId] = useState('');

  // Function to fetch all users and managers (Super Admin, Admin, Manager)
  const fetchUsers = async () => {
    const usersCollection = await getDocs(collection(db, "users"));
    const allUsers = usersCollection.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setUsers(allUsers);
    
    // Filter for potential Managers (Super Admin, Admin, or Manager roles)
    const managerList = allUsers.filter(u => u.role === 'Manager' || u.role === 'Admin' || u.role === 'Super Admin');
    setManagers(managerList.map(u => ({ id: u.id, fullName: u.fullName, role: u.role })));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'managerId') {
      setNewUser(prev => ({ 
        ...prev, 
        role: 'Agent',
        [name]: value 
      }));
    } else if (name === 'role') {
        const updates = { [name]: value };
        if (value !== 'Agent') {
            updates.managerId = '';
        }
        setNewUser(prev => ({ ...prev, ...updates }));
    } else {
        setNewUser(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setAlertState({ type: '', message: '' });

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
  
  const handleOpenEdit = (userToEdit) => {
    setEditingUser({
      id: userToEdit.id,
      fullName: userToEdit.fullName, 
      email: userToEdit.email,       
      role: userToEdit.role,
      managerId: userToEdit.managerId || '', 
    });
    setIsModalOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingUser(prev => ({ 
        ...prev, 
        [name]: value,
        ...(name === 'role' && value !== 'Agent' && { managerId: '' }) 
    }));
  };
  
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setAlertState({ type: '', message: '' });

    if (editingUser.role === 'Agent' && !editingUser.managerId) {
      setAlertState({ type: 'error', message: 'Please select a manager for the agent.' });
      return;
    }

    try {
      const updates = {
        role: editingUser.role,
        ...(editingUser.role === 'Agent' && editingUser.managerId && { managerId: editingUser.managerId }),
        ...(editingUser.role !== 'Agent' && { managerId: null }), 
      };

      const userRef = doc(db, 'users', editingUser.id);
      await setDoc(userRef, updates, { merge: true }); 

      setIsModalOpen(false);
      setEditingUser(null);
      await fetchUsers(); 

      setAlertState({ 
        type: 'success', 
        message: `User ${editingUser.fullName} updated successfully!` 
      });

    } catch (error) {
      setAlertState({ type: 'error', message: `Failed to update user: ${error.message}` });
    }
  };

  // --- RENDERING FUNCTIONS ---
  
  // Placeholder for KPI management tab (will be implemented next)
  const renderKpiManagement = () => (
    <Container component={Paper} elevation={3} sx={{ padding: 4, mt: 3, mb: 4, backgroundColor: 'background.paper' }}>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.dark', fontWeight: 'bold' }}>
            Campaign & KPI Management
        </Typography>
        <Alert severity="info">
            This tab will be built next! You will manage your IT Team's KPIs here.
        </Alert>
    </Container>
  );

  const renderUserManagement = () => (
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
            
            <Alert severity="info" sx={{ mb: 2 }}>
                Super Admins, Admins, and Managers are eligible to manage agents and appear in the dropdown list.
            </Alert>

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
                        <TextField select label="Role" name="role" value={newUser.role} onChange={handleInputChange} required fullWidth variant="outlined">
                            <MenuItem value="Super Admin">Super Admin</MenuItem>
                            <MenuItem value="Admin">Admin</MenuItem>
                            <MenuItem value="Manager">Manager</MenuItem>
                            <MenuItem value="Agent">Agent</MenuItem>
                        </TextField>
                    </Grid>
                    
                    {/* Manager Assignment Dropdown */}
                    {newUser.role === 'Agent' && (
                        <Grid item xs={12} sm={3}>
                            <TextField
                                select
                                label="Select Manager"
                                name="managerId"
                                value={newUser.managerId || ''}
                                onChange={handleInputChange}
                                required
                                fullWidth
                                variant="outlined"
                            >
                                <MenuItem value="" disabled>Select Manager</MenuItem>
                                {managers.map((manager) => (
                                    <MenuItem key={manager.id} value={manager.id}>
                                        {manager.fullName} ({manager.role})
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                    )}
                    <Grid item xs={12} sm={newUser.role === 'Agent' ? 1 : 2}> 
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
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((u) => (
                            <TableRow key={u.id} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f9f9f9' } }}>
                                <TableCell component="th" scope="row">{u.fullName}</TableCell>
                                <TableCell>{u.email}</TableCell>
                                <TableCell>{u.role}</TableCell>
                                <TableCell>
                                    <Button variant="outlined" size="small" onClick={() => handleOpenEdit(u)}>
                                        Edit
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </TableContainer>
            </Box>
        </Container>
  );

  const renderView = () => {
    switch(currentView) {
        case 'Admin':
            return renderUserManagement();
        case 'KPI':
            return renderKpiManagement();
        case 'Manager':
            return <ManagerDashboard user={{ ...user, role: "Manager", fullName: "Admin (Manager View)" }} onLogout={onLogout} isSimulated={true} />;
        case 'Agent':
            return <AgentDashboard user={{ ...user, role: "Agent", fullName: "Admin (Agent View)" }} onLogout={onLogout} isSimulated={true} />;
        default:
            return renderUserManagement();
    }
  }

  // The main return block for the Admin Dashboard component
  return (
    <Container maxWidth="lg" sx={{ pt: 2, pb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>ELEVATEPLUS Admin</Typography>
        
        {/* Header Buttons */}
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
      
      <Box sx={{ width: '100%', bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentView} onChange={(e, val) => setCurrentView(val)} textColor="primary" indicatorColor="primary">
            <Tab value="Admin" label="User Management" />
            <Tab value="KPI" label="Campaigns & KPIs" />
            <Tab value="Manager" label="Manager View" />
            <Tab value="Agent" label="Agent View" />
          </Tabs>
      </Box>

      {renderView()}

      {/* --- EDIT USER MODAL (POPUP FORM) --- */}
      {isModalOpen && editingUser && (
          <Box sx={{
              position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000,
              display: 'flex', justifyContent: 'center', alignItems: 'center'
          }}>
              <Paper elevation={24} sx={{ p: 4, width: 500, maxWidth: '90%', backgroundColor: 'background.paper' }}>
                  <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>Edit User: {editingUser.fullName}</Typography>
                  <form onSubmit={handleUpdateUser}>
                      <Grid container spacing={3}>
                          {/* 1. EMAIL FIELD (Read-Only) */}
                          <Grid item xs={12}>
                              <TextField 
                                  label="Email" 
                                  value={editingUser.email} 
                                  fullWidth 
                                  disabled 
                                  variant="filled" 
                              />
                          </Grid>
                          
                          {/* 2. ROLE DROPDOWN */}
                          <Grid item xs={12}>
                              <TextField
                                  select
                                  label="Role"
                                  name="role"
                                  value={editingUser.role}
                                  onChange={handleEditChange}
                                  required
                                  fullWidth
                                  variant="outlined"
                              >
                                  <MenuItem value="Super Admin">Super Admin</MenuItem>
                                  <MenuItem value="Admin">Admin</MenuItem>
                                  <MenuItem value="Manager">Manager</MenuItem>
                                  <MenuItem value="Agent">Agent</MenuItem>
                              </TextField>
                          </Grid>
                          
                          {/* 3. MANAGER ASSIGNMENT DROPDOWN (Conditional) */}
                          {editingUser.role === 'Agent' && (
                              <Grid item xs={12}>
                                  <TextField
                                      select
                                      label="Assign Manager"
                                      name="managerId"
                                      value={editingUser.managerId || ''}
                                      onChange={handleEditChange}
                                      required
                                      fullWidth
                                      variant="outlined"
                                      SelectProps={{
                                          displayEmpty: true,
                                      }}
                                  >
                                      <MenuItem value="" disabled>Select Manager</MenuItem>
                                      {managers.map((manager) => (
                                          <MenuItem key={manager.id} value={manager.id}>
                                              {manager.fullName} ({manager.role})
                                          </MenuItem>
                                      ))}
                                  </TextField>
                              </Grid>
                          )}
                          
                          {/* 4. ACTION BUTTONS */}
                          <Grid item xs={6}>
                              <Button variant="outlined" color="secondary" fullWidth onClick={() => setIsModalOpen(false)}>
                                  Cancel
                              </Button>
                          </Grid>
                          <Grid item xs={6}>
                              <Button type="submit" variant="contained" color="primary" fullWidth>
                                  Save Changes
                              </Button>
                          </Grid>
                      </Grid>
                  </form>
              </Paper>
          </Box>
      )}
      {/* --- END MODAL --- */}

    </Container>
  );
}

export default AdminDashboard;