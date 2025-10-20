// src/components/ManagerDashboard.js
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore'; 

import { Container, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Box, Grid, Alert } from '@mui/material';

function ManagerDashboard({ user, onLogout, isSimulated }) { 
    const [agents, setAgents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAgent, setSelectedAgent] = useState(null);

    // --- Core Logic: Fetch only Assigned Agents from Firestore ---
    useEffect(() => {
        const fetchAgents = async () => {
            setIsLoading(true);
            try {
                const managerUID = user.uid; 
                
                if (isSimulated || !managerUID) {
                     setAgents([]); 
                     return;
                }

                const agentsQuery = query(
                    collection(db, 'users'), 
                    where('role', '==', 'Agent'),
                    where('managerId', '==', managerUID) 
                );
                const snapshot = await getDocs(agentsQuery);
                
                const agentList = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    csat: 'N/A', 
                    quality: 'N/A', 
                    aht: 'N/A' 
                }));
                setAgents(agentList);
            } catch (error) {
                console.error("Error fetching assigned agents:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (user && user.uid && !isSimulated) { 
            fetchAgents();
        } else if (isSimulated) {
            setIsLoading(false);
            setAgents([]);
        }
    }, [user, isSimulated]); 
    
    // --- Render Content ---

    // 1. Render the detailed agent view (Coaching/Scores)
    if (selectedAgent) {
        return (
            <Container maxWidth="lg" sx={{ pt: 2, pb: 2 }}>
                <Typography variant="h4" gutterBottom sx={{ color: 'primary.dark', fontWeight: 'bold', mb: 4 }}>
                    Agent Performance View
                </Typography>
                <Button variant="outlined" onClick={() => setSelectedAgent(null)} sx={{ mb: 2 }}>
                    ← Back to Team Roster
                </Button>
                
                <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h5">Viewing Agent: {selectedAgent.fullName}</Typography>
                    <Typography variant="body1" color="secondary.dark">Email: {selectedAgent.email}</Typography>
                </Paper>

                {/* --- PLACEHOLDERS FOR NEW FEATURES --- */}
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Paper elevation={3} sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>Add Coaching Log</Typography>
                            <Alert severity="info">Feature: Coaching Log Form goes here.</Alert>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Paper elevation={3} sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>Agent KPI Scores</Typography>
                            <Alert severity="info">Feature: Table to input/view scores goes here.</Alert>
                        </Paper>
                    </Grid>
                </Grid>
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
            
            <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>Your Team Roster</Typography>
            
            {isSimulated && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    This is the **Admin's Simulated Manager View**. No real agent data is loaded.
                </Alert>
            )}

            {isLoading && !isSimulated ? (
                <Alert severity="info">Loading assigned agents...</Alert>
            ) : agents.length === 0 && !isSimulated ? (
                <Alert severity="warning">You have no agents assigned. Please ask an Admin to assign agents to you.</Alert>
            ) : agents.length === 0 && isSimulated ? (
                 <Alert severity="info">Simulated View: Agent list is empty.</Alert>
            ) : (
                <TableContainer component={Paper} elevation={3}>
                    <Table>
                        <TableHead sx={{ backgroundColor: 'primary.light' }}>
                            <TableRow>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Agent Name</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>CSAT</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Quality</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>AHT</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {agents.map((agent) => (
                                <TableRow key={agent.id}>
                                    <TableCell component="th" scope="row">{agent.fullName || agent.email}</TableCell>
                                    <TableCell>{agent.csat}</TableCell>
                                    <TableCell>{agent.quality}</TableCell>
                                    <TableCell>{agent.aht}</TableCell>
                                    <TableCell>
                                        <Button 
                                            variant="contained" 
                                            size="small"
                                            onClick={() => setSelectedAgent(agent)}
                                        >
                                            View & Coach
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Container>
    );
}

export default ManagerDashboard;