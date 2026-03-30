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
      console.error("Error fetching sessions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- FETCH OBSERVATIONS FOR SELECTED CENSUS ---
  const handleViewCensusData = async (session) => {
    setIsLoading(true);
    setSelectedSession(session);
    try {
      // Step 1: Fetch ALL observations where type is 'census'
      // We do the filtering in JavaScript to be 100% sure we catch the data
      const { data, error } = await supabase
        .from('observations')
        .select('*')
        .eq('type', 'census');

      if (error) throw error;

      // Step 2: Improved Filter Logic
      const filtered = data.filter(obs => {
        // We check both session_data and census_data (your schema has both)
        const cData = obs.census_data || {};
        const sData = obs.session_data || {};
        
        // Match by Session ID (BigInt/UUID) OR Session Title (String)
        // This handles cases where the mobile app stores the Name instead of the ID
        return (
          cData.session_id === session.id || 
          sData.session_id === session.id ||
          String(cData.session_title).toLowerCase() === String(session.title).toLowerCase() ||
          String(sData.session_title).toLowerCase() === String(session.title).toLowerCase()
        );
      });

      setCensusObservations(filtered);
    } catch (err) {
      console.error("Error fetching census logs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedSession) {
    // Categorizing based on your mobile app logic (obs_type or census_data method)
    const pointCounts = censusObservations.filter(o => 
        o.obs_type === 'point_count' || 
        o.census_data?.method === 'point_count' || 
        o.type === 'point_count'
    );
    
    const totalCounts = censusObservations.filter(o => 
        o.obs_type === 'random' || 
        o.census_data?.method === 'total_count' || 
        o.type === 'census'
    );

    return (
      <Box sx={{ animation: 'fadeIn 0.3s' }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link component="button" onClick={() => setSelectedSession(null)} color="inherit" underline="hover">
            Sessions
          </Link>
          <Typography color="text.primary" sx={{ fontWeight: 600 }}>{selectedSession.title}</Typography>
        </Breadcrumbs>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.dark' }}>{selectedSession.title}</Typography>
            <Typography variant="body1" color="text.secondary">Integrated Field Data for this Event</Typography>
          </Box>
          <Button startIcon={<ArrowBackRoundedIcon />} variant="outlined" onClick={() => setSelectedSession(null)} sx={{ borderRadius: 2 }}>
            Back to List
          </Button>
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: 4, textAlign: 'center', border: '1px solid #E2E8F0', bgcolor: '#F8FAFC' }}>
              <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.main' }}>{censusObservations.length}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Total Bird Entries</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: 4, textAlign: 'center', border: '1px solid #E2E8F0', bgcolor: '#F0F9FF' }}>
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#0369a1' }}>{pointCounts.length}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Point Count Stations</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: 4, textAlign: 'center', border: '1px solid #E2E8F0', bgcolor: '#F0FDF4' }}>
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#166534' }}>{totalCounts.length}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Total Area Counts</Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* DATA TABLE */}
        <TableContainer component={Paper} sx={{ borderRadius: 4, border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#F1F5F9' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Bird Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Count</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Habitat / Flora</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Method</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Map</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5 }}><CircularProgress size={24} /></TableCell></TableRow>
              ) : censusObservations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                    <Typography color="text.secondary">No field data is currently linked to this Session Title or ID.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                censusObservations.map((obs) => (
                  <TableRow key={obs.id} hover>
                    <TableCell sx={{ fontWeight: 700, color: 'primary.dark' }}>{obs.bird_name}</TableCell>
                    <TableCell><Chip label={obs.count || 1} size="small" sx={{ fontWeight: 800 }} /></TableCell>
                    <TableCell sx={{ maxWidth: 300 }}>
                        <Typography variant="body2" noWrap>{obs.habitat_notes || obs.notes || 'No notes'}</Typography>
                        <Typography variant="caption" color="text.secondary">{obs.flora && `Flora: ${obs.flora}`}</Typography>
                    </TableCell>
                    <TableCell>
                       <Chip 
                         label={obs.obs_type === 'point_count' ? 'Point Station' : 'Total Count'} 
                         variant="outlined" size="small" 
                         sx={{ fontSize: '0.65rem', fontWeight: 700 }} 
                       />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" href={`https://www.google.com/maps?q=${obs.lat || obs.latitude},${obs.lng || obs.longitude}`} target="_blank">
                        <LocationOnRoundedIcon color="error" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.3s' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.dark' }}>Census Sessions</Typography>
        <Typography variant="body1" color="text.secondary">Select an event to view synchronized data from the mobile app.</Typography>
      </Box>

      <Paper sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Event Title</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Current Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Field Data</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar sx={{ bgcolor: 'primary.main' }}><AssessmentRoundedIcon /></Avatar>
                      <Typography sx={{ fontWeight: 700 }}>{session.title}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip label={session.status} size="small" color={session.status === 'Active' ? 'success' : 'default'} sx={{ fontWeight: 700 }} />
                  </TableCell>
                  <TableCell align="right">
                    <Button 
                        variant="contained" 
                        size="small" 
                        onClick={() => handleViewCensusData(session)}
                        sx={{ borderRadius: 2, fontWeight: 700 }}
                    >
                      View Results
                    </Button>
                  </TableCell>
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