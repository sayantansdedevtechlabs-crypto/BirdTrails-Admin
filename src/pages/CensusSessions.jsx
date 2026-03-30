import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Chip, IconButton, Button, TextField, 
  Divider, Grid, CircularProgress, Avatar, Stack, Breadcrumbs, Link
} from '@mui/material';

// --- DATABASE CLIENT ---
import { supabase } from '../supabaseClient'; 

// Icons
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';

const CensusSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [censusObservations, setCensusObservations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('census_sessions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSessions(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewCensusData = async (session) => {
    setIsLoading(true);
    setSelectedSession(session);
    try {
      const { data, error } = await supabase
        .from('observations')
        .select('*')
        .eq('type', 'census');

      if (error) throw error;

      const filtered = data.filter(obs => {
        const cData = obs.census_data || {};
        const sData = obs.session_data || {};
        return (
          cData.session_id === session.id || 
          sData.session_id === session.id ||
          String(cData.session_title).toLowerCase() === String(session.title).toLowerCase() ||
          String(sData.session_title).toLowerCase() === String(session.title).toLowerCase()
        );
      });
      setCensusObservations(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedSession) {
    const pointCounts = censusObservations.filter(o => o.obs_type === 'point_count' || o.census_data?.method === 'point_count');
    const totalCounts = censusObservations.filter(o => o.obs_type === 'random' || o.census_data?.method === 'total_count');

    return (
      <Box sx={{ animation: 'fadeIn 0.3s' }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link component="button" onClick={() => setSelectedSession(null)} color="inherit" underline="hover">Sessions</Link>
          <Typography color="text.primary" sx={{ fontWeight: 600 }}>{selectedSession.title}</Typography>
        </Breadcrumbs>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, alignItems: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.dark' }}>{selectedSession.title}</Typography>
          <Button startIcon={<ArrowBackRoundedIcon />} variant="outlined" onClick={() => setSelectedSession(null)}>Back</Button>
        </Box>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}><Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#F8FAFC' }}><Typography variant="h3" sx={{ fontWeight: 800 }}>{censusObservations.length}</Typography><Typography variant="body2">Total Species</Typography></Paper></Grid>
          <Grid item xs={12} md={4}><Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#F0F9FF' }}><Typography variant="h3" sx={{ fontWeight: 800, color: '#0369a1' }}>{pointCounts.length}</Typography><Typography variant="body2">Point Counts</Typography></Paper></Grid>
          <Grid item xs={12} md={4}><Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#F0FDF4' }}><Typography variant="h3" sx={{ fontWeight: 800, color: '#166534' }}>{totalCounts.length}</Typography><Typography variant="body2">Total Counts</Typography></Paper></Grid>
        </Grid>
        <TableContainer component={Paper} sx={{ borderRadius: 4 }}>
          <Table>
            <TableHead sx={{ bgcolor: '#F1F5F9' }}><TableRow><TableCell sx={{ fontWeight: 700 }}>Bird</TableCell><TableCell sx={{ fontWeight: 700 }}>Count</TableCell><TableCell sx={{ fontWeight: 700 }}>Method</TableCell><TableCell align="right" sx={{ fontWeight: 700 }}>GPS</TableCell></TableRow></TableHead>
            <TableBody>
              {censusObservations.map((obs) => (
                <TableRow key={obs.id}>
                  <TableCell sx={{ fontWeight: 700 }}>{obs.bird_name}</TableCell>
                  <TableCell><Chip label={obs.count || 1} size="small" /></TableCell>
                  <TableCell>{obs.obs_type === 'point_count' ? 'Point' : 'Total'}</TableCell>
                  <TableCell align="right"><IconButton size="small" href={`https://www.google.com/maps?q=${obs.lat},${obs.lng}`} target="_blank"><LocationOnRoundedIcon color="error" /></IconButton></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 4 }}>Census Sessions</Typography>
      <Paper sx={{ borderRadius: 4, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#F8FAFC' }}><TableRow><TableCell sx={{ fontWeight: 700 }}>Event Title</TableCell><TableCell sx={{ fontWeight: 700 }}>Status</TableCell><TableCell align="right" sx={{ fontWeight: 700 }}>Data</TableCell></TableRow></TableHead>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id} hover>
                  <TableCell><Stack direction="row" spacing={2} alignItems="center"><Avatar><AssessmentRoundedIcon /></Avatar><Typography sx={{ fontWeight: 700 }}>{session.title}</Typography></Stack></TableCell>
                  <TableCell><Chip label={session.status} size="small" /></TableCell>
                  <TableCell align="right"><Button variant="contained" size="small" onClick={() => handleViewCensusData(session)}>View Results</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default CensusSessions;