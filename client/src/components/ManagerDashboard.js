// src/components/ManagerDashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore'; 

import { Container, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Box, Grid, Alert, Select, MenuItem, InputLabel, FormControl } from '@mui/material';
import AgentScoreForm from './AgentScoreForm'; // <-- NEW IMPORT

function ManagerDashboard({ user, onLogout, isSimulated }) {
    const [campaigns, setCampaigns] = useState([]);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [campaignKpis, setCampaignKpis] = useState({});
    const [agents, setAgents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAgent, setSelectedAgent] = useState(null);

    // --- CORE FETCH FUNCTION ---
    const fetchAllManagerData = useCallback(async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Campaigns assigned to this manager (or all campaigns for Admin sim)
            const campaignsSnapshot = await getDocs(collection(db, 'campaigns'));
            const campaignList = campaignsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCampaigns(campaignList);

            // 2. Fetch Campaign-KPI links
            const campaignKpisSnapshot = await getDocs(collection(db, "campaignKpis"));
            const links = {};
            campaignKpisSnapshot.forEach(doc => {
                const data = doc.data();
                if (!links[data.campaignId]) links[data.campaignId] = {};
                links[data.campaignId][data.kpiId] = { isEnabled: data.isEnabled };
            });
            setCampaignKpis(links);

            // Set default campaign selection
            const defaultCampaign = campaignList.find(c => c.id === user.campaignId) || campaignList[0];
            if (defaultCampaign) {
                setSelectedCampaign(defaultCampaign);
                
                // 3. Fetch Agents assigned to the manager's UID and the selected campaign
                const managerUID = user.uid; 
                
                let agentsQuery = query(collection(db, 'users'), where('role', '==', 'Agent'));
                
                if (!isSimulated) {
                    // Filter by manager's UID
                    agentsQuery = query(agentsQuery, where('managerId', '==', managerUID));
                }
                
                // Filter by selected campaign
                agentsQuery = query(agentsQuery, where('campaignId', '==', defaultCampaign.id));

                const snapshot = await getDocs(agentsQuery);
                const agentList = snapshot.docs.map(doc => ({
                    id: doc.id,
                    uid: doc.id,
                    ...doc.data(),
                    overallScore: 'N/A' // This will be calculated/fetched later
                }));
                setAgents(agentList);
            }
        } catch (error) {
            console.error("Error fetching manager data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [isSimulated, user.campaignId, user.uid]);

    useEffect(() => {
        if (!isSimulated && user.uid) {
            fetchAllManagerData();
        } else if (isSimulated) {
            // Admin simulation bypasses data fetching
            setIsLoading(false);
            setAgents([]);
        }
    }, [user, isSimulated, fetchAllManagerData]);

    const handleCampaignChange = (campaignId) => {
        const campaign = campaigns.find(c => c.id === campaignId);
        setSelectedCampaign(campaign);
        // Note: For a production app, you would re-run fetchAllManagerData here
    };

    // --- RENDER CONTENT ---

    // 1. Render the detailed agent view (Coaching/Scores)
    if (selectedAgent) {
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
                    fetchTeamData={fetchAllManagerData} 
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
                            disabled={isLoading || isSimulated}
                        >
                            {campaigns.map((camp) => (
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
            ) : agents.length === 0 && selectedCampaign ? (
                <Alert severity="warning">No agents are assigned to you on the {selectedCampaign.name} campaign.</Alert>
            ) : (
                <TableContainer component={Paper} elevation={3}>
                    <Table>
                        <TableHead sx={{ backgroundColor: 'primary.light' }}>
                            <TableRow>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Agent Name</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Campaign</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Overall Score (1-5)</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {agents.map((agent) => (
                                <TableRow key={agent.id}>
                                    <TableCell component="th" scope="row">{agent.fullName || agent.email}</TableCell>
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