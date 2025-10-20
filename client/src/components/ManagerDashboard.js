// src/components/ManagerDashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, query, getDocs, where } from 'firebase/firestore'; 

import { 
    Container, Typography, Button, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Paper, Box, Grid, Alert, Select, MenuItem, InputLabel, FormControl 
} from '@mui/material';

import AgentScoreForm from './AgentScoreForm'; 

function ManagerDashboard({ user, onLogout, isSimulated }) {
    const [campaigns, setCampaigns] = useState([]);
    const [managedCampaigns, setManagedCampaigns] = useState([]); 
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [campaignKpis, setCampaignKpis] = useState({});
    const [agents, setAgents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAgent, setSelectedAgent] = useState(null);

    // --- CORE FETCH FUNCTION ---
    const fetchAllManagerData = useCallback(async (currentCampaignId) => {
        setIsLoading(true);
        try {
            const managerUID = user.uid; 
            
            // 1. Fetch ALL Campaigns and determine which ones this manager is assigned to
            const campaignsSnapshot = await getDocs(collection(db, 'campaigns'));
            const campaignList = campaignsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            const managed = campaignList.filter(c => c.managerIds?.includes(managerUID));
            setManagedCampaigns(managed);
            setCampaigns(campaignList); 

            // Set default campaign selection (or use the campaign passed to the function)
            const campaignToLoad = managed.find(c => c.id === currentCampaignId) || managed[0];
            
            let agentList = [];
            if (campaignToLoad) {
                // FIX: Update the selected campaign state here to ensure the latest campaign is always selected.
                if (selectedCampaign?.id !== campaignToLoad.id) {
                     setSelectedCampaign(campaignToLoad);
                }

                // 2. Fetch Campaign-KPI links
                const campaignKpisSnapshot = await getDocs(collection(db, "campaignKpis"));
                const links = {};
                campaignKpisSnapshot.forEach(doc => {
                    const data = doc.data();
                    if (!links[data.campaignId]) links[data.campaignId] = {};
                    links[data.campaignId][data.kpiId] = { isEnabled: data.isEnabled };
                });
                setCampaignKpis(links);

                // 3. Fetch Agents (Admins/Agents) assigned to the selected campaign
                if (!isSimulated) {
                    const usersQuery = query(collection(db, 'users'), where('campaignId', '==', campaignToLoad.id));
                    const snapshot = await getDocs(usersQuery);

                    agentList = snapshot.docs
                        .map(doc => ({ id: doc.id, uid: doc.id, ...doc.data(), overallScore: 'N/A' }))
                        .filter(u => 
                            (u.role === 'Agent' || u.role === 'Admin') && 
                            u.managerId === managerUID
                        );
                    setAgents(agentList);
                }
            } else {
                setSelectedCampaign(null);
                setAgents([]);
            }
            
        } catch (error) {
            console.error("Error fetching manager data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [isSimulated, user.uid, user.role, selectedCampaign]); 

    // Initial fetch on component mount and when user changes
    useEffect(() => {
        if (user && user.uid && (user.role === 'Manager' || user.role === 'Super Admin')) { 
            // FIX: Only call with a campaign ID if one is already selected, preventing initial state loop
            fetchAllManagerData(selectedCampaign?.id); 
        } else if (isSimulated) {
            setIsLoading(false);
            setAgents([]);
        }
    }, [user, isSimulated]); // Removed fetchAllManagerData and selectedCampaign from deps array

    // Handler for campaign dropdown change
    const handleCampaignChange = (campaignId) => {
        const campaign = campaigns.find(c => c.id === campaignId);
        // FIX: Rerun the entire fetch process with the new campaign ID
        fetchAllManagerData(campaignId); 
    };

    // --- RENDER CONTENT ---
    if (selectedAgent) {
        // ... (Render Coach Agent Form) ...
        return (
            <Container maxWidth="lg" sx={{ pt: 2, pb: 2 }}>
                <Typography variant="h4" gutterBottom sx={{ color: 'primary.dark', fontWeight: 'bold', mb: 4 }}>
                    Coach Agent: {selectedAgent.fullName}
                </Typography>
                <Button variant="outlined" onClick={() => setSelectedAgent(null)} sx={{ mb: 2 }}>
                    ← Back to Team Roster
                </Button>
                
                <AgentScoreForm 
                    agent={selectedAgent} 
                    campaignKpis={campaignKpis} 
                    fetchTeamData={() => fetchAllManagerData(selectedCampaign?.id)} // Rerun fetch on submit
                />
            </Container>
        );
    }

    // 2. Render the Team Roster (Default View)
    return (
        <Container maxWidth="lg" sx={{ pt: 2, pb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>Manager Dashboard</Typography>
                <Box>
                    <Typography variant="body1" sx={{ mr: 2, display: 'inline' }}>Team Lead: {user.fullName}</Typography>
                    {!isSimulated && <Button variant="contained" color="secondary" onClick={onLogout}>Logout</Button>}
                </Box>
            </Box>
            
            <Grid container spacing={3} sx={{ mt: 4, mb: 2 }}>
                <Grid item xs={12} sm={6}>
                    <Typography variant="h5">Team Roster</Typography>
                </Grid>
                <Grid item xs={12} sm={6} sx={{ textAlign: 'right' }}>
                    <FormControl variant="outlined" sx={{ width: '100%', maxWidth: 300 }}>
                        <InputLabel>Select Campaign</InputLabel>
                        <Select
                            value={selectedCampaign?.id || ''}
                            onChange={(e) => handleCampaignChange(e.target.value)}
                            label="Select Campaign"
                            disabled={isLoading || isSimulated || managedCampaigns.length === 0}
                        >
                            {managedCampaigns.map((camp) => (
                                <MenuItem key={camp.id} value={camp.id}>
                                    {camp.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>
            
            {isLoading && !isSimulated ? (
                <Alert severity="info">Loading team data...</Alert>
            ) : managedCampaigns.length === 0 && !isSimulated ? (
                <Alert severity="warning">You are not assigned to manage any campaigns. Please contact a Super Admin.</Alert>
            ) : agents.length === 0 && selectedCampaign ? (
                <Alert severity="warning">No team members are assigned to the {selectedCampaign.name} campaign.</Alert>
            ) : (
                <TableContainer component={Paper} elevation={3}>
                    <Table>
                        <TableHead sx={{ backgroundColor: 'primary.light' }}>
                            <TableRow>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Team Member</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Role</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Campaign</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Overall Score (1-5)</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {agents.map((agent) => (
                                <TableRow key={agent.id}>
                                    <TableCell component="th" scope="row">{agent.fullName || agent.email}</TableCell>
                                    <TableCell>{agent.role}</TableCell>
                                    <TableCell>{selectedCampaign?.name}</TableCell>
                                    <TableCell>
                                        <Typography color={agent.overallScore >= 4 ? 'success.main' : agent.overallScore >= 3 ? 'warning.main' : 'error'}>
                                            {agent.overallScore}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Button 
                                            variant="contained" 
                                            size="small"
                                            onClick={() => setSelectedAgent(agent)}
                                        >
                                            Coach Agent
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
            
            {isSimulated && <Alert severity="warning" sx={{ mt: 2 }}>This is the Admin's Simulated Manager View. Data is not fully loaded.</Alert>}
        </Container>
    );
}

export default ManagerDashboard;