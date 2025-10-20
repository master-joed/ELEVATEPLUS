// client/src/components/AdminDashboard.js
import React, { useState, useEffect } from 'react';
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
  const [newUser, setNewUser] = useState({ fullName: '', email: '', password: '', role: 'Agent', campaignId: '' }); 
  const [alertState, setAlertState] = useState({ type: '', message: '' });
  
  const [editingUser, setEditingUser] = useState(null); 
  const [isModalOpen, setIsModalOpen] = useState(false); 
  
  // --- Campaign/KPI States (Placeholder for next feature) ---
  const [campaigns, setCampaigns] = useState([]);
  const [allKpis] = useState([]); 
  const [selectedCampaignId] = useState('');
  
  // --- ROLE CHECKS ---
  const isSuperAdmin = user.role === 'Super Admin';
  const canManageCampaigns = isSuperAdmin || user.role === 'Admin';


  // Function to fetch all data
  const fetchAllData = async () => {
    // 1. Fetch Users and Managers
    const usersCollection = await getDocs(collection(db, "users"));
    const allUsers = usersCollection.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setUsers(allUsers);
    
    const managerList = allUsers.filter(u => u.role === 'Manager' || u.role === 'Super Admin');
    setManagers(managerList.map(u => ({ id: u.id, fullName: u.fullName, role: u.role })));

    // 2. Fetch Campaigns
    const campaignsSnapshot = await getDocs(collection(db, "campaigns"));
    const campaignList = campaignsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), docId: doc.id }));
    setCampaigns(campaignList);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const requiresManager = (role) => role === 'Agent' || role === 'Admin'; 
  const requiresCampaign = (role) => role === 'Agent' || role === 'Manager' || role === 'Admin'; 

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'role') {
        const updates = { [name]: value };
        if (!requiresManager(value)) updates.managerId = '';
        if (!requiresCampaign(value)) updates.campaignId = '';
        setNewUser(prev => ({ ...prev, ...updates }));
    } else {
        setNewUser(prev => ({ ...prev, [name]: value }));
    }
  };

  // --- Core Logic: Add New User (Super Admin Only) ---
  const handleAddUser = async (e) => {
    e.preventDefault();
    setAlertState({ type: '', message: '' });

    if (!isSuperAdmin) {
        setAlertState({ type: 'error', message: 'Only Super Admins can add new users.' });
        return;
    }
    
    // Validation
    if (requiresManager(newUser.role) && !newUser.managerId) {
        setAlertState({ type: 'error', message: `Please select a manager for the ${newUser.role} role.` });
        return;
    }
    if (requiresCampaign(newUser.role) && !newUser.campaignId) {
        setAlertState({ type: 'error', message: `Please assign a campaign for the ${newUser.role} role.` });
        return;
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, newUser.email, newUser.password);
      
      const userData = {
        fullName: newUser.fullName,
        role: newUser.role,
        email: newUser.email,
        ...(requiresManager(newUser.role) && newUser.managerId && { managerId: newUser.managerId }),
        ...(requiresCampaign(newUser.role) && newUser.campaignId && { campaignId: newUser.campaignId }),
      };
      
      await setDoc(doc(db, "users", userCredential.user.uid), userData); 
      await auth.signOut();
      
      setAlertState({ type: 'success', message: `User ${newUser.email} created successfully! Please log back in.` });

    } catch (err) {
        let message = err.message.includes('auth/email-already-in-use') ? 'Error: This email is already registered.' : 'An unexpected error occurred. Check email and password requirements.';
        setAlertState({ type: 'error', message: message });
    }
  };
  
  const handlePasswordReset = async () => { 
    try {
      await sendPasswordResetEmail(auth, user.email);
      setAlertState({ type: 'info', message: `A password reset link has been sent to your email: ${user.email}. Check your inbox.` });
    } catch (error) {
      setAlertState({ type: 'error', message: 'Could not send reset email. Ensure you are online and try again.' });
    }
  };
  
  // --- Core Logic: Edit User Functions ---
  const handleOpenEdit = (userToEdit) => {
    if (!canManageCampaigns) {
        setAlertState({ type: 'error', message: 'Access Denied: Only Admins and Super Admins can manage user records.' });
        return;
    }
    setEditingUser({
      id: userToEdit.id,
      fullName: userToEdit.fullName, 
      email: userToEdit.email,       
      role: userToEdit.role,
      managerId: userToEdit.managerId || '', 
      campaignId: userToEdit.campaignId || '', 
    });
    setIsModalOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingUser(prev => ({ 
        ...prev, 
        [name]: value,
        ...(name === 'role' && !requiresManager(value) && { managerId: '' }),
        ...(name === 'role' && !requiresCampaign(value) && { campaignId: '' }), 
    }));
  };
  
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setAlertState({ type: '', message: '' });

    if (!canManageCampaigns) {
        setAlertState({ type: 'error', message: 'You do not have permission to perform this update.' });
        return;
    }

    if (isSuperAdmin) {
      if (requiresManager(editingUser.role) && !editingUser.managerId) {
        setAlertState({ type: 'error', message: `Please select a manager for the ${editingUser.role} role.` });
        return;
      }
    }
    
    if (requiresCampaign(editingUser.role) && !editingUser.campaignId) {
      setAlertState({ type: 'error', message: `Please assign a campaign for the ${editingUser.role} role.` });
      return;
    }

    try {
      let updates = {
          campaignId: requiresCampaign(editingUser.role) && editingUser.campaignId ? editingUser.campaignId : null,
      };

      if (isSuperAdmin) {
        updates.role = editingUser.role;
        updates.managerId = requiresManager(editingUser.role) && editingUser.managerId ? editingUser.managerId : null;
      }
      
      const userRef = doc(db, 'users', editingUser.id);
      await setDoc(userRef, updates, { merge: true }); 

      setIsModalOpen(false);
      setEditingUser(null);
      await fetchAllData(); 

      setAlertState({ type: 'success', message: `User ${editingUser.fullName} updated successfully!` });

    } catch (error) {
      setAlertState({ type: 'error', message: `Failed to update user: ${error.message}` });
    }
  };

  // --- KPI MANAGEMENT RENDERING FUNCTION ---
  const renderKpiManagement = () => (
    <Container component={Paper} elevation={3} sx={{ padding: 4, mt: 3, mb: 4, backgroundColor: 'background.paper' }}>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.dark', fontWeight: 'bold' }}>
            Campaign & KPI Management
        </Typography>
        <Alert severity="info">
            The full KPI management functionality is waiting to be built in this section.
        </Alert>
    </Container>
  );

  
  const renderUserManagement = () => {
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

            {/* --- ADD NEW USER SECTION (SUPER ADMIN ONLY) --- */}
            {isSuperAdmin ? (
                <Box sx={{ my: 4, p: 3, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                    <Typography variant="h6" gutterBottom sx={{ color: 'secondary.dark' }}>Add New User</Typography>
                    
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Only Super Admins can add new users and change primary roles/managers.
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
                            
                            {/* Campaign Assignment Dropdown */}
                            {requiresCampaign(newUser.role) && (
                                <Grid item xs={12} sm={3}>
                                    <TextField
                                        select
                                        label="Assign Campaign"
                                        name="campaignId"
                                        value={newUser.campaignId || ''}
                                        onChange={handleInputChange}
                                        required
                                        fullWidth
                                        variant="outlined"
                                        disabled={campaigns.length === 0}
                                    >
                                        <MenuItem value="" disabled>Select Campaign</MenuItem>
                                        {campaigns.map((camp) => (
                                            <MenuItem key={camp.id} value={camp.id}>
                                                {camp.name}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                            )}

                            {/* Manager Assignment Dropdown (Visible for Admin and Agent) */}
                            {requiresManager(newUser.role) && (
                                <Grid item xs={12} sm={3}>
                                    <TextField
                                        select
                                        label={`Select Manager for ${newUser.role}`}
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
                            <Grid item xs={12} sm={1}> 
                                <Button type="submit" variant="contained" color="primary" fullWidth sx={{height: '56px'}}>Add</Button>
                            </Grid>
                        </Grid>
                    </form>
                </Box>
            ) : (
                <Alert severity="warning" sx={{ mt: 4 }}>
                    Only **Super Admins** can add new users and change primary roles/managers. You may proceed to the table below to **Edit** user campaigns.
                </Alert>
            )}

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
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Manager</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Campaign</TableCell> 
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users.map((u) => {
                                const manager = u.managerId ? managers.find(m => m.id === u.managerId) : null;
                                const managerName = manager ? `${manager.fullName}` : 'N/A';
                                const userCampaign = u.campaignId ? campaigns.find(c => c.id === u.campaignId) : null;
                                
                                return (
                                    <TableRow key={u.id} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f9f9f9' } }}>
                                        <TableCell component="th" scope="row">{u.fullName}</TableCell>
                                        <TableCell>{u.email}</TableCell>
                                        <TableCell>{u.role}</TableCell>
                                        <TableCell>{managerName}</TableCell> 
                                        <TableCell>{userCampaign?.name || 'N/A'}</TableCell> 
                                        <TableCell>
                                            <Button variant="outlined" size="small" onClick={() => handleOpenEdit(u)} disabled={!canManageCampaigns}>
                                                Edit
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Container>
    );
  };

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
                              <TextField label="Email" value={editingUser.email} fullWidth disabled variant="filled" />
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
                                  disabled={!isSuperAdmin} // Only Super Admin can change role
                              >
                                  <MenuItem value="Super Admin">Super Admin</MenuItem>
                                  <MenuItem value="Admin">Admin</MenuItem>
                                  <MenuItem value="Manager">Manager</MenuItem>
                                  <MenuItem value="Agent">Agent</MenuItem>
                              </TextField>
                          </Grid>

                          {/* 3. CAMPAIGN ASSIGNMENT DROPDOWN: Admin and Super Admin */}
                          {requiresCampaign(editingUser.role) && (
                            <Grid item xs={12}>
                                <TextField
                                    select
                                    label="Assign Campaign"
                                    name="campaignId"
                                    value={editingUser.campaignId || ''}
                                    onChange={handleEditChange}
                                    required
                                    fullWidth
                                    variant="outlined"
                                    SelectProps={{ displayEmpty: true }}
                                    disabled={!canManageCampaigns} // Enabled for Admin and Super Admin
                                >
                                    <MenuItem value="" disabled>Select Campaign</MenuItem>
                                    {campaigns.map((camp) => (
                                        <MenuItem key={camp.id} value={camp.id}>
                                            {camp.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                          )}
                          
                          {/* 4. MANAGER ASSIGNMENT DROPDOWN: Super Admin Only */}
                          {requiresManager(editingUser.role) && (
                              <Grid item xs={12}>
                                  <TextField
                                      select
                                      label={`Assign Manager for ${editingUser.role}`}
                                      name="managerId"
                                      value={editingUser.managerId || ''}
                                      onChange={handleEditChange}
                                      required
                                      fullWidth
                                      variant="outlined"
                                      SelectProps={{ displayEmpty: true }}
                                      disabled={!isSuperAdmin} // Only Super Admin can change manager
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
                          
                          {/* 5. ACTION BUTTONS */}
                          <Grid item xs={6}>
                              <Button variant="outlined" color="secondary" fullWidth onClick={() => setIsModalOpen(false)}>
                                  Cancel
                              </Button>
                          </Grid>
                          <Grid item xs={6}>
                              <Button type="submit" variant="contained" color="primary" fullWidth disabled={!canManageCampaigns}>
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