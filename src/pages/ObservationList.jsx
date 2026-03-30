import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Avatar, Chip, IconButton, Button, TextField, 
  InputAdornment, FormControl, InputLabel, Select, MenuItem, TablePagination, Tooltip,
  Grid, Divider, CircularProgress
} from '@mui/material';

// --- DATABASE CLIENT ---
import { supabase } from '../supabaseClient';

// Icons
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ForestRoundedIcon from '@mui/icons-material/ForestRounded';
import WaterDropRoundedIcon from '@mui/icons-material/WaterDropRounded';

const ObservationList = () => {
  const [observations, setObservations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);

  const [selectedObs, setSelectedObs] = useState(null);

  // --- 1. FETCH LIVE DATA ---
  useEffect(() => {
    fetchObservations();
  }, []);

  const fetchObservations = async () => {
    try {
      setIsLoading(true);
      
      // Fetch Observations AND join the Profiles table to get the Researcher's Name
      // We use a manual merge to prevent foreign key constraint errors if the DB isn't strictly linked
      const { data: obsData, error: obsError } = await supabase
        .from('observations')
        .select('*')
        .order('created_at', { ascending: false });

      if (obsError) throw obsError;

      const { data: profilesData, error: profError } = await supabase
        .from('app_users')
        .select('id, full_name');

      if (profError) throw profError;

      // Merge the data together
      const mergedData = obsData.map(obs => {
        const profile = profilesData.find(p => p.id === obs.user_id);
        return {
          ...obs,
          explorer_name: profile?.full_name || 'Unknown Explorer',
          explorer_avatar: (profile?.full_name || 'U').substring(0, 2).toUpperCase(),
        };
      });

      setObservations(mergedData);
    } catch (error) {
      console.error('Error fetching logs:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. PIPELINE ACTIONS (Verify & Delete) ---
  const handleVerify = async (id) => {
    try {
      const { error } = await supabase.from('observations').update({ is_verified: true }).eq('id', id);
      if (error) throw error;
      
      // Instantly update UI without refreshing the page
      setObservations(observations.map(obs => obs.id === id ? { ...obs, is_verified: true } : obs));
      if (selectedObs && selectedObs.id === id) setSelectedObs({ ...selectedObs, is_verified: true });
    } catch (error) {
      console.error('Error verifying:', error.message);
      alert('Failed to verify observation.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this field log?")) return;
    try {
      const { error } = await supabase.from('observations').delete().eq('id', id);
      if (error) throw error;
      
      setObservations(observations.filter(obs => obs.id !== id));
      setSelectedObs(null); // Close dossier if open
    } catch (error) {
      console.error('Error deleting:', error.message);
      alert('Failed to delete observation.');
    }
  };

  // --- 3. UI HELPERS ---
  const filteredObservations = observations.filter(obs => {
    const searchString = searchTerm.toLowerCase();
    const matchesSearch = 
      (obs.bird_name || '').toLowerCase().includes(searchString) || 
      (obs.explorer_name || '').toLowerCase().includes(searchString) ||
      (obs.location_name || '').toLowerCase().includes(searchString);
      
    const matchesStatus = 
      filterStatus === 'All' || 
      (filterStatus === 'Verified' && obs.is_verified === true) ||
      (filterStatus === 'Pending' && (obs.is_verified === false || obs.is_verified === null));
      
    return matchesSearch && matchesStatus;
  });

  const paginatedObservations = filteredObservations.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };


  // ==========================================
  // VIEW 1: THE FULL-PAGE DOSSIER
  // ==========================================
  if (selectedObs) {
    const isVerified = selectedObs.is_verified === true;
    
    // Fallback to whichever lat/lng your mobile app successfully saved
    const finalLat = selectedObs.latitude || selectedObs.lat;
    const finalLng = selectedObs.longitude || selectedObs.lng;
    const googleMapsUrl = (finalLat && finalLng) ? `https://www.google.com/maps/search/?api=1&query=${finalLat},${finalLng}` : '#';

    return (
      <Box sx={{ animation: 'fadeIn 0.3s ease-in-out' }}>
        {/* Header Navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 2 }}>
          <IconButton onClick={() => setSelectedObs(null)} sx={{ backgroundColor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', '&:hover': { backgroundColor: '#F8FAFC' } }}>
            <ArrowBackRoundedIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.dark' }}>Field Log Details</Typography>
            <Typography variant="body2" color="text.secondary">Submitted on {formatDate(selectedObs.created_at)}</Typography>
          </Box>
          <Box sx={{ ml: 'auto', display: 'flex', gap: 2 }}>
            <Chip 
              icon={isVerified ? <CheckCircleRoundedIcon fontSize="small"/> : <PendingActionsRoundedIcon fontSize="small"/>} 
              label={isVerified ? 'Verified' : 'Pending Review'} 
              sx={{ 
                backgroundColor: isVerified ? '#E8F5E9' : '#FFF8E1', 
                color: isVerified ? '#2E7D32' : '#F57F17', 
                fontWeight: 700, borderRadius: 2, px: 1, py: 2.5, fontSize: '1rem' 
              }} 
            />
          </Box>
        </Box>

        <Paper sx={{ borderRadius: 4, border: '1px solid #E2E8F0', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <Grid container>
            
            {/* LEFT COLUMN: Data & Identity */}
            <Grid item xs={12} md={6} sx={{ p: 4, borderRight: { md: '1px solid #E2E8F0' } }}>
              <Box 
                component="img"
                src={selectedObs.image_uri || 'https://via.placeholder.com/600x400?text=No+Field+Image+Captured'}
                alt={selectedObs.bird_name}
                sx={{ width: '100%', height: 350, borderRadius: 3, objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', mb: 4 }} 
              />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1 }}>Species Identified</Typography>
                <Chip label={`Count: ${selectedObs.count || 1}`} size="small" color="primary" sx={{ fontWeight: 700 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', mb: 3 }}>{selectedObs.bird_name || 'Unknown Species'}</Typography>
              
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1 }}>Logged By</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.light', fontWeight: 700 }}>{selectedObs.explorer_avatar}</Avatar>
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>{selectedObs.explorer_name}</Typography>
                  <Typography variant="caption" color="text.secondary">Field Researcher</Typography>
                </Box>
              </Box>

              {/* ACTION BUTTONS */}
              <Divider sx={{ my: 3 }} />
              <Box sx={{ display: 'flex', gap: 2 }}>
                {!isVerified && (
                  <Button fullWidth variant="contained" color="success" onClick={() => handleVerify(selectedObs.id)} startIcon={<CheckCircleRoundedIcon />} sx={{ py: 1.5, fontWeight: 700, borderRadius: 2 }}>
                    Approve & Verify
                  </Button>
                )}
                <Button fullWidth variant="outlined" color="error" onClick={() => handleDelete(selectedObs.id)} startIcon={<DeleteOutlineRoundedIcon />} sx={{ py: 1.5, fontWeight: 700, borderRadius: 2 }}>
                  Delete Log
                </Button>
              </Box>
            </Grid>

            {/* RIGHT COLUMN: Ecological Telemetry */}
            <Grid item xs={12} md={6} sx={{ p: 4, backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
              
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1, mb: 2 }}>Location Telemetry</Typography>
              
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', mb: 4, backgroundColor: 'white' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                  <LocationOnRoundedIcon sx={{ color: '#D84315', mt: 0.5 }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Recorded Location</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: 'primary.dark' }}>{selectedObs.location_name || selectedObs.location || 'Unknown Area'}</Typography>
                    <Chip label={`Type: ${selectedObs.type || selectedObs.obs_type || 'Random'}`} size="small" sx={{ mt: 1, fontSize: '0.7rem', fontWeight: 600 }} />
                  </Box>
                </Box>
                
                <Divider sx={{ my: 2, borderStyle: 'dashed' }} />
                
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
                  <ExploreRoundedIcon sx={{ color: '#0277BD', mt: 0.5 }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Exact GPS Coordinates</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: 'monospace', letterSpacing: 1 }}>
                      {finalLat ? `${finalLat.toFixed(6)}, ${finalLng.toFixed(6)}` : 'GPS Data Missing'}
                    </Typography>
                  </Box>
                </Box>

                <Button 
                  variant="contained" fullWidth disabled={!finalLat}
                  href={googleMapsUrl} target="_blank" rel="noopener noreferrer"
                  endIcon={<OpenInNewRoundedIcon />}
                  sx={{ py: 1.5, borderRadius: 2, fontWeight: 700, backgroundColor: '#1E293B', color: 'white', '&:hover': { backgroundColor: '#0F172A' } }}
                >
                  Open in Google Maps
                </Button>
              </Paper>

              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1, mb: 1 }}>Ecological Notes</Typography>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', backgroundColor: 'white', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                
                {selectedObs.habitat_notes && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>HABITAT</Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.primary' }}>"{selectedObs.habitat_notes}"</Typography>
                  </Box>
                )}
                
                {selectedObs.flora && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ForestRoundedIcon fontSize="small" color="success" />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Flora: {selectedObs.flora}</Typography>
                  </Box>
                )}

                {selectedObs.water_body && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WaterDropRoundedIcon fontSize="small" color="info" />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Water Body: {selectedObs.water_body}</Typography>
                  </Box>
                )}

                {selectedObs.notes && (
                  <Box sx={{ mt: 1, p: 2, bgcolor: '#F1F5F9', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>ADDITIONAL NOTES</Typography>
                    <Typography variant="body2">{selectedObs.notes}</Typography>
                  </Box>
                )}
                
                {/* Fallback if all mobile fields are empty */}
                {(!selectedObs.habitat_notes && !selectedObs.flora && !selectedObs.water_body && !selectedObs.notes) && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', mt: 2 }}>
                    No additional ecological notes provided by the researcher.
                  </Typography>
                )}

              </Paper>

            </Grid>
          </Grid>
        </Paper>
      </Box>
    );
  }

  // ==========================================
  // VIEW 2: THE MASTER LEDGER (TABLE)
  // ==========================================
  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.dark', mb: 0.5 }}>Observation Ledger</Typography>
          <Typography variant="body1" color="text.secondary">Review field logs synced from the mobile application.</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button onClick={fetchObservations} variant="contained" color="primary" sx={{ borderRadius: 2, px: 3, fontWeight: 700 }}>
            Refresh Sync
          </Button>
          <Button variant="outlined" color="primary" startIcon={<FileDownloadRoundedIcon />} sx={{ borderRadius: 2, px: 3, fontWeight: 700, backgroundColor: 'white' }}>
            Export CSV
          </Button>
        </Box>
      </Box>

      <Paper sx={{ borderRadius: 4, border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
        
        {/* Toolbar */}
        <Box sx={{ p: 3, borderBottom: '1px solid #E2E8F0', backgroundColor: '#FAFAFA', display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="Search species, explorer, or location..." variant="outlined" size="small"
            value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setPage(0);}}
            sx={{ flexGrow: 1, minWidth: '300px', backgroundColor: 'white', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon color="action" /></InputAdornment> }}
          />
          <FormControl size="small" sx={{ minWidth: 180, backgroundColor: 'white', borderRadius: 2 }}>
            <InputLabel>Status Filter</InputLabel>
            <Select value={filterStatus} label="Status Filter" onChange={(e) => {setFilterStatus(e.target.value); setPage(0);}} sx={{ borderRadius: 2 }}>
              <MenuItem value="All"><em>All Statuses</em></MenuItem>
              <MenuItem value="Pending">Pending Review</MenuItem>
              <MenuItem value="Verified">Verified</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Table */}
        <TableContainer>
          <Table sx={{ minWidth: 900 }}>
            <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Date Logged</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Explorer</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Species Spotted</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Location</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                    <CircularProgress color="primary" />
                    <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>Syncing data from mobile database...</Typography>
                  </TableCell>
                </TableRow>
              ) : paginatedObservations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 10, color: 'text.secondary' }}>
                    No field logs found. Ensure the mobile app has synced successfully.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedObservations.map((obs) => {
                  const isVerified = obs.is_verified === true;
                  return (
                    <TableRow key={obs.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.dark' }}>{formatDate(obs.created_at)}</Typography>
                        <Typography variant="caption" color="text.secondary">Type: {obs.type || obs.obs_type || 'Random'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light', fontSize: '0.875rem', fontWeight: 700 }}>
                            {obs.explorer_avatar}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{obs.explorer_name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{obs.bird_name || 'Unknown'}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Count: {obs.count || 1}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                          <MapRoundedIcon fontSize="small" />
                          <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap>
                            {obs.location_name || obs.location || 'GPS Location'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          icon={isVerified ? <CheckCircleRoundedIcon fontSize="small"/> : <PendingActionsRoundedIcon fontSize="small"/>} 
                          label={isVerified ? 'Verified' : 'Pending'} 
                          size="small" 
                          sx={{ 
                            backgroundColor: isVerified ? '#E8F5E9' : '#FFF8E1', 
                            color: isVerified ? '#2E7D32' : '#F57F17', 
                            fontWeight: 700, borderRadius: 1.5, pl: 0.5 
                          }} 
                        />
                      </TableCell>
                      <TableCell align="right">
                        
                        <Tooltip title="View Field Dossier">
                          <IconButton onClick={() => setSelectedObs(obs)} color="primary" sx={{ mr: 1, backgroundColor: 'rgba(27, 67, 50, 0.05)' }}>
                            <VisibilityRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        {!isVerified && (
                          <Tooltip title="Verify Sighting">
                            <IconButton onClick={() => handleVerify(obs.id)} sx={{ mr: 1, color: '#2E7D32', backgroundColor: '#E8F5E9' }}>
                              <CheckCircleRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        <Tooltip title="Delete Sighting">
                          <IconButton onClick={() => handleDelete(obs.id)} sx={{ color: '#C62828', backgroundColor: '#FFEBEE' }}>
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={filteredObservations.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          sx={{ borderTop: '1px solid #E2E8F0', backgroundColor: '#FAFAFA' }}
        />
      </Paper>
    </Box>
  );
};

export default ObservationList;