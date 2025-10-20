// src/components/ManagerDashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
// Note the removal of 'where' on the initial query, handled by compound queries later
import { collection, query, getDocs, where, and } from 'firebase/firestore'; 

import { 
    Container, Typography, Button, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Paper, Box, Grid, Alert, Select, MenuItem, InputLabel, FormControl 
} from '@mui/material';

import AgentScoreForm from './AgentScoreForm'; 

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
            const userIsManagerOrSuperAdmin = user.role === 'Manager' || user.role === 'Super Admin';
            
            // 1. Fetch Campaigns 
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

            const defaultCampaign = campaignList[0];
            if (defaultCampaign) {
                setSelectedCampaign(defaultCampaign);
                
                const managerUID = user.uid; 
                
                let agentList = [];
                
                // --- FIX: Fetch Agents AND Admins assigned to this Manager/SuperAdmin ---
                
                if (!isSimulated && userIsManagerOrSuperAdmin) {
                    
                    // Firestore does not allow OR queries on different values for the same field (e.g., role == 'Agent' OR role == 'Admin').
                    // We must execute two separate queries and merge the results.

                    const baseFilter = [
                        where('managerId', '==', managerUID),
                        where('campaignId', '==', defaultCampaign.id)
                    ];
                    
                    // Query 1: Get all assigned AGENTS
                    const agentsQuery = query(
                        collection(db, 'users'),
                        where('role', '==', 'Agent'),
                        ...baseFilter
                    );

                    // Query 2: Get all assigned ADMINS (IT Team members)
                    const adminsQuery = query(
                        collection(db, 'users'),
                        where('role', '==', 'Admin'),
                        ...baseFilter
                    );
                    
                    const [agentsSnapshot, adminsSnapshot] = await Promise.all([
                        getDocs(agentsQuery),
                        getDocs(adminsQuery)
                    ]);
                    
                    agentList = [
                        ...agentsSnapshot.docs.map(doc => ({ id: doc.id, uid: doc.id, ...doc.data(), overallScore: 'N/A' })),
                        ...adminsSnapshot.docs.map(doc => ({ id: doc.id, uid: doc.id, ...doc.data(), overallScore: 'N/A' }))
                    ];
                }
                
                setAgents(agentList);
            }
        } catch (error) {
            console.error("Error fetching manager data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [isSimulated, user.campaignId, user.uid, user.role]); 

    useEffect(() => {
        if (user && user.uid && user.role !== 'Admin') { 
            fetchAllManagerData();
        } else if (isSimulated) {
            setIsLoading(false);
            setAgents([]);
        }
    }, [user, isSimulated, fetchAllManagerData]);

    const handleCampaignChange = (campaignId) => {
        // TODO: Re-fetch agents assigned to this manager/campaign upon selection
        const campaign = campaigns.find(c => c.id === campaignId);
        setSelectedCampaign(campaign);
    };

    // --- RENDER CONTENT ---
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
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Agent/Admin Name</TableCell> {/* UPDATED */}
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Role</TableCell> {/* NEW */}
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Campaign</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Overall Score (1-5)</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {agents.map((agent) => (
                                <TableRow key={agent.id}>
                                    <TableCell component="th" scope="row">{agent.fullName || agent.email}</TableCell>
                                    <TableCell>{agent.role}</TableCell> {/* NEW */}
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