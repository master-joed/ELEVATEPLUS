// src/components/AgentScoreForm.js
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { 
    Typography, Box, Grid, TextField, Button, Paper, Alert, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow 
} from '@mui/material';

function AgentScoreForm({ agent, campaignKpis, fetchTeamData }) {
    const [kpiScores, setKpiScores] = useState({});
    const [targets, setTargets] = useState({});
    const [weights, setWeights] = useState({});
    const [actionPlan, setActionPlan] = useState('');
    const [alert, setAlert] = useState(null);

    // --- FIX: Robustly filter KPIs that are ENABLED for the agent's campaign ---
    const enabledKpis = Object.entries(campaignKpis[agent.campaignId] || {})
        .filter(([, data]) => data && data.isEnabled === true) // Ensure isEnabled is explicitly boolean true
        .map(([kpiId]) => ({ id: kpiId }));
    // ------------------------------------------------------------------------

    const [kpiDetails, setKpiDetails] = useState([]);
    const [overallScore, setOverallScore] = useState(null);

    // Fetch the detailed KPI names and types from the master list
    useEffect(() => {
        const fetchKpiDetails = async () => {
            const kpiIds = enabledKpis.map(k => k.id);
            if (kpiIds.length === 0) {
                setKpiDetails([]);
                return;
            }
            try {
                // We must split the query if there are more than 10 KPIs, but for now, a single query is fine.
                const q = query(collection(db, 'kpis'), where('id', 'in', kpiIds));
                const snapshot = await getDocs(q);
                const details = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setKpiDetails(details);
            } catch (error) {
                console.error("Error fetching KPI details:", error);
            }
        };
        fetchKpiDetails();
    }, [agent.campaignId, enabledKpis.length]); // Dependency on the length of enabledKpis

    // Calculate Overall Score (1-5) based on inputs
    useEffect(() => {
        const calculateScore = () => {
            let totalWeightedScore = 0;
            let totalWeight = 0;

            kpiDetails.forEach(kpi => {
                const score = parseFloat(kpiScores[kpi.name] || 0);
                const weight = parseFloat(weights[kpi.name] || 0);
                const target = parseFloat(targets[kpi.name] || 0);

                if (weight > 0) {
                    let normalizedScore = 0;
                    
                    if (kpi.type === 'Percentage' || kpi.type === 'Currency') {
                        normalizedScore = target > 0 ? (score / target) : 0;
                    } else if (kpi.type === 'Rating (1-5)') {
                        normalizedScore = score / 5; 
                    }
                    
                    normalizedScore = Math.min(normalizedScore, 1.2); 

                    totalWeightedScore += normalizedScore * weight;
                    totalWeight += weight;
                }
            });

            if (totalWeight > 0) {
                const weightedAverage = totalWeightedScore / totalWeight;
                const finalRating = Math.min(5, Math.max(1, weightedAverage * 4 + 1)); 
                setOverallScore(finalRating.toFixed(2));
            } else {
                setOverallScore(null);
            }
        };

        calculateScore();
    }, [kpiScores, targets, weights, kpiDetails]);

    const handleScoreSubmit = async (e) => {
        e.preventDefault();
        setAlert(null);

        const totalWeightCheck = kpiDetails.reduce((sum, kpi) => sum + parseFloat(weights[kpi.name] || 0), 0);
        if (totalWeightCheck === 0) {
            setAlert({ type: 'error', message: 'Please set weight for at least one KPI.' });
            return;
        }

        try {
            // 1. Add Coaching Log
            await addDoc(collection(db, 'coachingLogs'), {
                agentId: agent.id,
                coachId: auth.currentUser.uid,
                coachName: auth.currentUser.displayName || auth.currentUser.email, // Use email if name is null
                date: new Date(),
                actionPlan: actionPlan || 'No formal action plan recorded.',
                overallRating: parseFloat(overallScore),
                campaignId: agent.campaignId,
            });
            
            // 2. Add KPI Scores
            kpiDetails.forEach(async (kpi) => {
                if (kpiScores[kpi.name]) {
                    await addDoc(collection(db, 'agentScores'), {
                        agentId: agent.id,
                        kpiId: kpi.id,
                        score: parseFloat(kpiScores[kpi.name]),
                        target: parseFloat(targets[kpi.name] || 0),
                        weight: parseFloat(weights[kpi.name] || 0),
                        date: new Date(),
                        campaignId: agent.campaignId,
                    });
                }
            });

            setAlert({ type: 'success', message: `Scores and Coaching Log saved successfully! Overall Score: ${overallScore}` });
            setActionPlan('');
            if (fetchTeamData) {
                fetchTeamData();
            }

        } catch (error) {
            console.error("Submission error:", error);
            setAlert({ type: 'error', message: `Submission failed: ${error.message}` });
        }
    };

    return (
        <Paper elevation={3} sx={{ p: 4, mt: 3 }}>
            <Typography variant="h5" color="primary" gutterBottom>KPI Scoring & Coaching Log</Typography>
            
            {alert && <Alert severity={alert.type} sx={{ mb: 2 }}>{alert.message}</Alert>}

            {kpiDetails.length === 0 ? (
                <Alert severity="warning">
                    No KPIs are currently **Enabled** for the **{agent.campaignId}** campaign. Please contact an Admin and ensure KPIs are toggled ON.
                </Alert>
            ) : (
                <form onSubmit={handleScoreSubmit}>
                    <TableContainer component={Paper} sx={{ mb: 4 }}>
                        <Table size="small">
                            <TableHead sx={{ backgroundColor: 'primary.light' }}>
                                <TableRow>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>KPI</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Data Type</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Score Input</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Target</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Weight (%)</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {kpiDetails.map((kpi) => (
                                    <TableRow key={kpi.id}>
                                        <TableCell>{kpi.name}</TableCell>
                                        <TableCell>{kpi.type}</TableCell>
                                        <TableCell>
                                            <TextField
                                                size="small"
                                                type="number"
                                                value={kpiScores[kpi.name] || ''}
                                                onChange={(e) => setKpiScores({ ...kpiScores, [kpi.name]: e.target.value })}
                                                required
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <TextField
                                                size="small"
                                                type="number"
                                                value={targets[kpi.name] || ''}
                                                onChange={(e) => setTargets({ ...targets, [kpi.name]: e.target.value })}
                                                required
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <TextField
                                                size="small"
                                                type="number"
                                                value={weights[kpi.name] || ''}
                                                onChange={(e) => setWeights({ ...weights, [kpi.name]: e.target.value })}
                                                required
                                                inputProps={{ max: 100 }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Grid container spacing={3}>
                        <Grid item xs={12} md={8}>
                            <TextField
                                label="Coaching Notes / Action Plan"
                                multiline
                                rows={4}
                                fullWidth
                                value={actionPlan}
                                onChange={(e) => setActionPlan(e.target.value)}
                                variant="outlined"
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Paper elevation={1} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <Typography variant="h6">Overall Rating (1-5):</Typography>
                                <Typography variant="h3" color={overallScore >= 4 ? 'success.main' : overallScore >= 3 ? 'warning.main' : 'error'}>
                                    {overallScore || 'N/A'}
                                </Typography>
                                <Button type="submit" variant="contained" color="primary" fullWidth>
                                    Submit Scores & Log
                                </Button>
                            </Paper>
                        </Grid>
                    </Grid>
                </form>
            )}
        </Paper>
    );
}

export default AgentScoreForm;