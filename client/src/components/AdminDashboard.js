// client/src/components/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
// Added addDoc for simple document creation
import { collection, getDocs, setDoc, doc, query, where, addDoc, updateDoc } from "firebase/firestore"; 
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"; 

import { Container, Typography, Grid, TextField, Select, MenuItem, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Box, Alert, Tabs, Tab, Switch, FormControl, InputLabel } from '@mui/material';
import ManagerDashboard from './ManagerDashboard';
import AgentDashboard from './AgentDashboard';

function AdminDashboard({ user, onLogout }) {
  const [currentView, setCurrentView] = useState('KPI'); 
  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]); 
  const [newUser, setNewUser] = useState({ fullName: '', email: '', password: '', role: 'Agent' });
  const [alertState, setAlertState] = useState({ type: '', message: '' });
  
  const [editingUser, setEditingUser] = useState(null); 
  const [isModalOpen, setIsModalOpen] = useState(false); 
  
  // --- Campaign/KPI States ---
  const [campaigns, setCampaigns] = useState([]);
  const [allKpis, setAllKpis] = useState([]);
  const [campaignKpis, setCampaignKpis] = useState({}); // Stores {campaignId: {kpiId: isEnabled}}
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [newKpi, setNewKpi] = useState({ name: '', type: 'Percentage' });
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignDescription, setNewCampaignDescription] = useState('');


  // --- CORE DATA FETCHING ---
  const fetchAllData = async () => {
    // 1. Fetch Users and Managers (Required for all tabs)
    const usersCollection = await getDocs(collection(db, "users"));
    const allUsers = usersCollection.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setUsers(allUsers);
    const managerList = allUsers.filter(u => u.role === 'Manager' || u.role === 'Super Admin');
    setManagers(managerList.map(u => ({ id: u.id, fullName: u.fullName, role: u.role })));

    // 2. Fetch Campaigns
    const campaignsSnapshot = await getDocs(collection(db, "campaigns"));
    const campaignList = campaignsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCampaigns(campaignList);
    if (!selectedCampaignId && campaignList.length > 0) {
        setSelectedCampaignId(campaignList[0].id);
    }
    
    // 3. Fetch Master KPIs
    const kpisSnapshot = await getDocs(collection(db, "kpis"));
    setAllKpis(kpisSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    // 4. Fetch Campaign-KPI Links
    const campaignKpisSnapshot = await getDocs(collection(db, "campaignKpis"));
    const links = {};
    campaignKpisSnapshot.forEach(doc => {
        const data = doc.data();
        if (!links[data.campaignId]) {
            links[data.campaignId] = {};
        }
        links[data.campaignId][data.kpiId] = { docId: doc.id, isEnabled: data.isEnabled };
    });
    setCampaignKpis(links);
  };

  useEffect(() => {
    fetchAllData();
  }, []);
  
  // --- KPI MANAGEMENT LOGIC ---

  const handleAddCampaign = async (e) => {
    e.preventDefault();
    if (!newCampaignName.trim()) return;

    try {
        await addDoc(collection(db, "campaigns"), { 
            name: newCampaignName.trim(), 
            description: newCampaignDescription.trim() 
        });
        setNewCampaignName('');
        setNewCampaignDescription('');
        await fetchAllData();
        setAlertState({ type: 'success', message: `Campaign '${newCampaignName}' created.` });
    } catch (error) {
        setAlertState({ type: 'error', message: `Failed to add campaign: ${error.message}` });
    }
  };

  const handleAddMasterKpi = async (e) => {
    e.preventDefault();
    if (!newKpi.name.trim()) return;

    try {
        const kpiId = newKpi.name.toUpperCase().replace(/\s/g, '_');
        await setDoc(doc(db, "kpis", kpiId), { 
            name: newKpi.name.trim(), 
            type: newKpi.type 
        });
        setNewKpi({ name: '', type: 'Percentage' });
        await fetchAllData();
        setAlertState({ type: 'success', message: `${newKpi.name} added to master KPI list.` });
    } catch (error) {
        setAlertState({ type: 'error', message: `Failed to add KPI: ${error.message}` });
    }
  };

  const handleToggleKpi = async (kpiId, isChecked) => {
    const linkQuery = query(
        collection(db, 'campaignKpis'), 
        where('campaignId', '==', selectedCampaignId),
        where('kpiId', '==', kpiId)
    );
    const snapshot = await getDocs(linkQuery);

    try {
        if (isChecked) {
            // ENABLE: Add the link document
            if (snapshot.empty) {
                await addDoc(collection(db, 'campaignKpis'), { // Use addDoc for auto-ID
                    campaignId: selectedCampaignId,
                    kpiId: kpiId,
                    isEnabled: true,
                });
            } else {
                // If it exists but was disabled, update it
                const docRef = doc(db, 'campaignKpis', snapshot.docs[0].id);
                await updateDoc(docRef, { isEnabled: true });
            }
        } else {
            // DISABLE: Set isEnabled to false
            if (!snapshot.empty) {
                 const docRef = doc(db, 'campaignKpis', snapshot.docs[0].id);
                 await updateDoc(docRef, { isEnabled: false });
            }
        }
        await fetchAllData(); 
        setAlertState({ type: 'success', message: `KPI toggled successfully.` });
    } catch (error) {
        setAlertState({ type: 'error', message: `Failed to toggle KPI: ${error.message}` });
    }
  };


  // --- USER MANAGEMENT LOGIC (Previous Steps) ---
  const requiresManager = (role) => role === 'Agent' || role === 'Admin'; 

  const handleInputChange = (e) => { /* ... (Existing handleInputChange) ... */
    const { name, value } = e.target;
    if (name === 'managerId') {
      setNewUser(prev => ({ 
        ...prev, 
        [name]: value,
        role: prev.role === 'Admin' ? 'Admin' : 'Agent', 
      }));
    } else if (name === 'role') {
        const updates = { [name]: value };
        if (!requiresManager(value)) {
            updates.managerId = '';
        }
        setNewUser(prev => ({ ...prev, ...updates }));
    } else {
        setNewUser(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddUser = async (e) => { /* ... (Existing handleAddUser) ... */
    e.preventDefault();
    setAlertState({ type: '', message: '' });

    if (requiresManager(newUser.role) && !newUser.managerId) {
        setAlertState({ type: 'error', message: `Please select a manager for the ${newUser.role} role.` });
        return;
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, newUser.email, newUser.password);
      
      const userData = {
        fullName: newUser.fullName,
        role: newUser.role,
        email: newUser.email,
        ...(requiresManager(newUser.role) && newUser.managerId && { managerId: newUser.managerId }),
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
  
  const handlePasswordReset = async () => { /* ... (Existing handlePasswordReset) ... */
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
  
  const handleOpenEdit = (userToEdit) => { /* ... (Existing handleOpenEdit) ... */
    setEditingUser({
      id: userToEdit.id,
      fullName: userToEdit.fullName, 
      email: userToEdit.email,       
      role: userToEdit.role,
      managerId: userToEdit.managerId || '', 
    });
    setIsModalOpen(true);
  };

  const handleEditChange = (e) => { /* ... (Existing handleEditChange) ... */
    const { name, value } = e.target;
    setEditingUser(prev => ({ 
        ...prev, 
        [name]: value,
        ...(name === 'role' && !requiresManager(value) && { managerId: '' }) 
    }));
  };
  
  const handleUpdateUser = async (e) => { /* ... (Existing handleUpdateUser) ... */
    e.preventDefault();
    setAlertState({ type: '', message: '' });

    if (requiresManager(editingUser.role) && !editingUser.managerId) {
      setAlertState({ type: 'error', message: `Please select a manager for the ${editingUser.role} role.` });
      return;
    }

    try {
      const updates = {
        role: editingUser.role,
        ...(requiresManager(editingUser.role) && editingUser.managerId && { managerId: editingUser.managerId }),
        ...(!requiresManager(editingUser.role) && { managerId: null }), 
      };

      const userRef = doc(db, 'users', editingUser.id);
      await setDoc(userRef, updates, { merge: true }); 

      setIsModalOpen(false);
      setEditingUser(null);
      await fetchAllData(); // Use fetchAllData

      setAlertState({ 
        type: 'success', 
        message: `User ${editingUser.fullName} updated successfully!` 
      });

    } catch (error) {
      setAlertState({ type: 'error', message: `Failed to update user: ${error.message}` });
    }
  };

  // --- KPI MANAGEMENT RENDERING FUNCTION ---
  
  const renderKpiManagement = () => {
    const currentCampaign = campaigns.find(c => c.id === selectedCampaignId);
    
    return (
        <Container component={Paper} elevation={3} sx={{ padding: 4, mt: 3, mb: 4, backgroundColor: 'background.paper' }}>
            <Typography variant="h5" gutterBottom sx={{ color: 'primary.dark', fontWeight: 'bold' }}>Campaign & KPI Management</Typography>
            
            {/* --- Alert Messages for KPI Tab --- */}
            {alertState.message && (
                <Alert severity={alertState.type} sx={{ mt: 2, mb: 2 }}>
                    {alertState.message}
                </Alert>
            )}

            <Grid container spacing={4} sx={{ mt: 2 }}>
                
                {/* --- 1. Create New Campaign --- */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={1} sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom color="secondary.dark">Create New Campaign/Team</Typography>
                        <form onSubmit={handleAddCampaign}>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <TextField label="Campaign Name (e.g., IT Team Support)" value={newCampaignName} onChange={(e) => setNewCampaignName(e.target.value)} fullWidth variant="outlined" required/>
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField label="Description" value={newCampaignDescription} onChange={(e) => setNewCampaignDescription(e.target.value)} fullWidth variant="outlined"/>
                                </Grid>
                                <Grid item xs={12}>
                                    <Button type="submit" variant="contained" color="secondary" fullWidth>
                                        Add Campaign
                                    </Button>
                                </Grid>
                            </Grid>
                        </form>
                    </Paper>
                </Grid>
                
                {/* --- 2. Add New Master KPI --- */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={1} sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom color="secondary.dark">Add New Master KPI</Typography>
                        <form onSubmit={handleAddMasterKpi}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <TextField label="KPI Name (e.g., AHT, CSAT)" value={newKpi.name} onChange={(e) => setNewKpi({ ...newKpi, name: e.target.value })} fullWidth variant="outlined" required/>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField select label="Data Type" value={newKpi.type} onChange={(e) => setNewKpi({ ...newKpi, type: e.target.value })} fullWidth variant="outlined" required>
                                        <MenuItem value="Percentage">Percentage</MenuItem>
                                        <MenuItem value="Rating (1-5)">Rating (1-5)</MenuItem>
                                        <MenuItem value="Time (HH:MM)">Time (HH:MM)</MenuItem>
                                        <MenuItem value="Currency">Currency (Sales)</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid item xs={12}>
                                    <Button type="submit" variant="contained" color="primary" fullWidth>
                                        Add Master KPI
                                    </Button>
                                </Grid>
                            </Grid>
                        </form>
                    </Paper>
                </Grid>

            </Grid>
            
            <Box sx={{ mt: 5, p: 3, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Typography variant="h5" gutterBottom color="primary.dark" sx={{mb: 3}}>
                    Enable/Disable KPIs for Campaign
                </Typography>
                 
                <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel id="campaign-select-label">Select Campaign</InputLabel>
                    <Select labelId="campaign-select-label" label="Select Campaign" value={selectedCampaignId} onChange={(e) => setSelectedCampaignId(e.target.value)} fullWidth disabled={campaigns.length === 0}>
                        {campaigns.map((camp) => (
                            <MenuItem key={camp.id} value={camp.id}>
                                {camp.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {selectedCampaignId && (
                    <TableContainer component={Paper} elevation={3}>
                        <Table>
                            <TableHead sx={{ backgroundColor: 'primary.light' }}>
                                <TableRow>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>KPI Name</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Data Type</TableCell>
                                    <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Enabled</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {allKpis.map((kpi) => {
                                    const link = campaignKpis[selectedCampaignId]?.[kpi.id];
                                    const isEnabled = link?.isEnabled || false;

                                    return (
                                        <TableRow key={kpi.id}>
                                            <TableCell>{kpi.name}</TableCell>
                                            <TableCell>{kpi.type}</TableCell>
                                            <TableCell align="center">
                                                <Switch
                                                    checked={isEnabled}
                                                    onChange={(e) => handleToggleKpi(kpi.id, e.target.checked)}
                                                    color="success"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
                {!selectedCampaignId && campaigns.length > 0 && (
                    <Alert severity="info">Please select a campaign to manage its KPIs.</Alert>
                )}
                {campaigns.length === 0 && <Alert severity="warning">Please create a campaign first.</Alert>}
            </Box>
        </Container>
    );
  };
  
  // --- USER MANAGEMENT RENDERING (PREVIOUSLY CORRECTED) ---

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
                Only Super Admins and Managers are assignable to Agents and Admins.
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
                    
                    {/* Manager Assignment Dropdown (Visible for Admin and Agent) */}
                    {(newUser.role === 'Agent' || newUser.role === 'Admin') && (
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
                    <Grid item xs={12} sm={requiresManager(newUser.role) ? 1 : 2}> 
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
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Manager</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((u) => {
                            const manager = u.managerId ? managers.find(m => m.id === u.managerId) : null;
                            const managerName = manager ? `${manager.fullName} (${manager.role})` : 'N/A';
                            
                            return (
                                <TableRow key={u.id} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f9f9f9' } }}>
                                    <TableCell component="th" scope="row">{u.fullName}</TableCell>
                                    <TableCell>{u.email}</TableCell>
                                    <TableCell>{u.role}</TableCell>
                                    <TableCell>{managerName}</TableCell> 
                                    <TableCell>
                                        <Button variant="outlined" size="small" onClick={() => handleOpenEdit(u)}>
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
                          {(editingUser.role === 'Agent' || editingUser.role === 'Admin') && (
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