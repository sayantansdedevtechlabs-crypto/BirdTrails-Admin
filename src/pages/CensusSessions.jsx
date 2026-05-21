import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Chip, IconButton, Button, TextField, 
  Divider, Grid, CircularProgress, Avatar, Stack, Breadcrumbs, Link, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Stepper, Step, StepLabel, List, ListItem, ListItemAvatar, ListItemText, Checkbox, Tabs, Tab
} from '@mui/material';

// --- MAP LIBRARIES ---
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- IMPORT THE BOUNDARY DATA ---
import { EKW_BOUNDARY } from './ekwBoundary'; 

// --- DATABASE CLIENT ---
import { supabase } from '../supabaseClient'; // Adjust path if needed

// Icons
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import EmojiNatureRoundedIcon from '@mui/icons-material/EmojiNatureRounded';
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import AssignmentLateRoundedIcon from '@mui/icons-material/AssignmentLateRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';

// --- CUSTOM MAP MARKERS ---
const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const endIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const birdIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const ekwPolygonCoords = EKW_BOUNDARY && EKW_BOUNDARY.length > 0 
  ? EKW_BOUNDARY.map(pt => [pt.latitude, pt.longitude]) 
  : [];

const CensusSessions = () => {
  const [pendingSessions, setPendingSessions] = useState([]);
  const [completedSessions, setCompletedSessions] = useState([]);
  const [appUsers, setAppUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [birdDirectoryImages, setBirdDirectoryImages] = useState({});
  const [mainTab, setMainTab] = useState(0); 

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [isAssigning, setIsAssigning] = useState(false);
  
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    methodology: 'point_count',
    locations: [], // Kept as empty array so database schema doesn't break
    assigned_users: [],
    instructions: ''
  });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ➤ REMOVED MAP SELECTION STEP
  const steps = ['Event Details', 'Methodology', 'Assign Team', 'Review & Dispatch'];

  useEffect(() => {
    fetchSessions();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await supabase.from('app_users').select('id, full_name');
      if (data) setAppUsers(data);
    } catch (e) {
      console.error("Failed to load users", e);
    }
  };

  const fetchSessions = async () => {
    try {
      setIsLoading(true);

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('survey_assignments')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (assignmentsError) throw assignmentsError;

      const { data: profilesData } = await supabase.from('app_users').select('id, full_name');
      const { data: ptLogs } = await supabase.from('point_count_logs').select('*');
      const { data: tcLogs } = await supabase.from('total_count_logs').select('*');
      
      const dispatchGroups = {};

      assignmentsData.forEach(assignment => {
        const profile = profilesData?.find(p => p.id === assignment.user_id);
        const explorer_name = profile?.full_name || 'Unknown Explorer';
        
        const groupId = assignment.dispatch_id || assignment.id; 

        let logs = [];
        if (assignment.status === 'completed') {
           if (assignment.methodology === 'point_count') {
              logs = ptLogs?.filter(log => log.assignment_id === assignment.id) || [];
           } else if (assignment.methodology === 'total_count') {
              logs = tcLogs?.filter(log => log.assignment_id === assignment.id) || [];
           }
        }

        if (!dispatchGroups[groupId]) {
           dispatchGroups[groupId] = {
              ...assignment,
              group_id: groupId,
              team: [], 
              all_logs: [] 
           };
        }

        dispatchGroups[groupId].team.push({
           id: assignment.id,
           name: explorer_name,
           status: assignment.status,
           completed_at: assignment.completed_at
        });

        if (logs.length > 0) {
           dispatchGroups[groupId].all_logs.push(...logs);
        }
      });

      const pending = [];
      const completed = [];

      Object.values(dispatchGroups).forEach(group => {
         const isFullyCompleted = group.team.every(member => member.status === 'completed');
         group.display_status = isFullyCompleted ? 'completed' : 'pending';

         if (isFullyCompleted) {
            completed.push(group);
         } else {
            pending.push(group);
         }
      });

      setPendingSessions(pending);
      setCompletedSessions(completed);

    } catch (err) {
      console.error('Error fetching sessions:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (session) => {
    setSessionToDelete(session);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    setIsDeleting(true);

    try {
      const idsToDelete = sessionToDelete.team.map(member => member.id);
      
      const { error } = await supabase.from('survey_assignments').delete().in('id', idsToDelete);
      if (error) throw error;

      if (selectedSession && selectedSession.group_id === sessionToDelete.group_id) {
        setSelectedSession(null);
      }

      setIsDeleteDialogOpen(false);
      setSessionToDelete(null);
      fetchSessions(); 
    } catch (e) {
      console.error("Deletion Error:", e);
      alert(`Failed to delete: ${e.message || 'Unknown Error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // ➤ UPDATED STEP VALIDATION LOGIC
  const handleNextStep = () => {
    if (activeStep === 0 && !assignmentForm.title.trim()) return alert("Please enter an Event Title.");
    if (activeStep === 2 && assignmentForm.assigned_users.length === 0) return alert("Please select at least one researcher.");

    setActiveStep((prev) => prev + 1);
  };

  const handleBackStep = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleUserToggle = (userId) => {
    const currentIndex = assignmentForm.assigned_users.indexOf(userId);
    const newChecked = [...assignmentForm.assigned_users];
    if (currentIndex === -1) newChecked.push(userId);
    else newChecked.splice(currentIndex, 1);
    setAssignmentForm({ ...assignmentForm, assigned_users: newChecked });
  };

  const handleAssignSession = async () => {
    setIsAssigning(true);
    try {
      const sharedDispatchId = `dispatch_${Date.now()}`;

      const payloads = assignmentForm.assigned_users.map(userId => ({
        title: assignmentForm.title,
        methodology: assignmentForm.methodology,
        user_id: userId,
        status: 'pending',
        target_route: assignmentForm.locations, // Will naturally be [] now
        instructions: assignmentForm.instructions,
        dispatch_id: sharedDispatchId 
      }));

      const { error } = await supabase.from('survey_assignments').insert(payloads);
      if (error) throw error;

      setIsAssignModalOpen(false);
      setAssignmentForm({ title: '', methodology: 'point_count', locations: [], assigned_users: [], instructions: '' });
      setActiveStep(0);
      setMainTab(1); 
      fetchSessions(); 

    } catch (e) {
      alert(`Database Error: ${e.message || e.details || 'Unknown Error'}`);
    } finally {
      setIsAssigning(false);
    }
  };

  useEffect(() => {
    const fetchDirectoryImages = async () => {
      setBirdDirectoryImages({});
      if (!selectedSession || selectedSession.display_status === 'pending') return;
      
      let speciesToFetch = [];
      const sessionLogs = selectedSession.all_logs || [];

      sessionLogs.forEach(logRow => {
         const birdData = logRow.bird_data || [];
         birdData.forEach(bird => {
             let rawName = bird.species || bird.birdName || bird.name;
             if (rawName) speciesToFetch.push(rawName.trim().toLowerCase().replace(/\b\w/g, char => char.toUpperCase()));
         });
      });

      speciesToFetch = [...new Set(speciesToFetch)].filter(Boolean);
      if (speciesToFetch.length > 0) {
         const { data } = await supabase.from('birds').select('common_name, image_url').in('common_name', speciesToFetch); 
         if (data) {
            const imageMap = {};
            data.forEach(bird => { if (bird.image_url) imageMap[bird.common_name] = bird.image_url; });
            setBirdDirectoryImages(imageMap);
         }
      }
    };
    fetchDirectoryImages();
  }, [selectedSession]);

  let extractedBirdRecords = [];
  let totalIndividuals = 0;
  const speciesCounts = {};
  let dominantSpecies = 'N/A';
  let maxCount = 0;
  let validRoutePoints = [];
  let hasRouteData = false;
  let mapCenter = [22.56, 88.43];

  if (selectedSession) {
    validRoutePoints = Array.isArray(selectedSession.target_route) ? selectedSession.target_route : [];
    hasRouteData = validRoutePoints.length >= 2;
    if (validRoutePoints.length > 0) mapCenter = [validRoutePoints[0].lat, validRoutePoints[0].lng];

    if (selectedSession.display_status === 'completed' && selectedSession.all_logs) {
        selectedSession.all_logs.forEach(logRow => {
            const birdArray = logRow.bird_data || [];
            birdArray.forEach(bird => {
                const count = parseInt(bird.count) || 1;
                totalIndividuals += count;
                
                let rawName = bird.species || bird.birdName || bird.name || 'Unknown Species';
                let cleanName = rawName.trim().toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
                
                speciesCounts[cleanName] = (speciesCounts[cleanName] || 0) + count;
                
                extractedBirdRecords.push({
                    species: cleanName,
                    count: count,
                    lat: bird.lat || logRow.target_lat || null,
                    lng: bird.lng || logRow.target_lng || null,
                    logger: logRow.user_id 
                });
            });
        });

        Object.entries(speciesCounts).forEach(([species, count]) => {
          if (count > maxCount) { maxCount = count; dominantSpecies = species; }
        });
    }
  }

  const displaySessions = mainTab === 0 ? completedSessions : pendingSessions;

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-in-out', position: 'relative' }}>
      
      {selectedSession ? (
        <Box>
          <Breadcrumbs sx={{ mb: 2 }}>
            <Link component="button" onClick={() => setSelectedSession(null)} color="inherit" underline="hover" sx={{ fontWeight: 600 }}>
              Session Management
            </Link>
            <Typography color="primary.main" sx={{ fontWeight: 700 }}>
               {selectedSession.display_status === 'pending' ? 'Assignment Details' : 'Session Analytics'}
            </Typography>
          </Breadcrumbs>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, alignItems: 'center' }}>
            <Box>
               <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.dark', textTransform: 'capitalize' }}>
                 {selectedSession.title}
               </Typography>
               <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                 {selectedSession.display_status === 'pending' ? 'Dispatched to ' : 'Completed by '} 
                 <b>{selectedSession.team.length > 1 ? `Team of ${selectedSession.team.length}` : selectedSession.team[0].name}</b> on {new Date(selectedSession.created_at).toLocaleDateString()}
               </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
               <Button startIcon={<DeleteOutlineRoundedIcon />} variant="outlined" color="error" onClick={() => handleDeleteClick(selectedSession)} sx={{ borderRadius: 2, fontWeight: 700 }}>
                  {selectedSession.display_status === 'pending' ? "Cancel Assignment" : "Delete Event"}
               </Button>
               <Button startIcon={<ArrowBackRoundedIcon />} variant="outlined" onClick={() => setSelectedSession(null)} sx={{ borderRadius: 2, fontWeight: 700 }}>
                  Back to List
               </Button>
            </Box>
          </Box>

          {selectedSession.display_status === 'pending' ? (
             <Grid container spacing={4} sx={{ mb: 4 }}>
               {/* Show Map only if there happens to be legacy route data */}
               {validRoutePoints.length > 0 && (
                 <Grid item xs={12}>
                    <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid #E2E8F0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1 }}>
                         <LocationOnRoundedIcon sx={{ color: '#0369a1' }} />
                         <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A' }}>Assigned Target Area (Legacy)</Typography>
                      </Box>
                      <Box sx={{ height: 450, bgcolor: '#E2E8F0', position: 'relative', zIndex: 0 }}>
                        <MapContainer center={mapCenter} zoom={14} scrollWheelZoom={true} touchZoom={true} style={{ height: '100%', width: '100%' }}>
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OpenStreetMap' />
                          {ekwPolygonCoords.length > 0 && (
                            <Polygon positions={ekwPolygonCoords} pathOptions={{ color: '#0369a1', fillColor: 'transparent', weight: 2, dashArray: '5, 5' }} interactive={false} />
                          )}
                          {hasRouteData ? (
                            <>
                              <Polyline positions={validRoutePoints.map(pt => [pt.lat, pt.lng])} color="#059669" weight={5} opacity={0.8} />
                              <Marker position={[validRoutePoints[0].lat, validRoutePoints[0].lng]} icon={startIcon}><Popup>Route Start</Popup></Marker>
                              <Marker position={[validRoutePoints[validRoutePoints.length - 1].lat, validRoutePoints[validRoutePoints.length - 1].lng]} icon={endIcon}><Popup>Route End</Popup></Marker>
                            </>
                          ) : (
                            <Marker position={[validRoutePoints[0].lat, validRoutePoints[0].lng]} icon={startIcon}>
                              <Popup>Assigned Target Point</Popup>
                            </Marker>
                          )}
                        </MapContainer>
                      </Box>
                    </Paper>
                 </Grid>
               )}
               
               <Grid item xs={12} md={7}>
                  <Paper sx={{ p: 4, height: '100%', borderRadius: 4, bgcolor: '#FFFBEB', border: '1px solid #FDE68A', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <AssignmentLateRoundedIcon sx={{ color: '#D97706', fontSize: 32 }} />
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#92400E' }}>Dispatch Overview</Typography>
                        <Typography variant="body2" sx={{ color: '#B45309' }}>Waiting for team members to complete the assignment.</Typography>
                      </Box>
                    </Box>
                    <Divider sx={{ my: 2, borderColor: '#FDE68A' }} />
                    <Box sx={{ flexGrow: 1 }}>
                       <Typography variant="caption" sx={{ fontWeight: 700, color: '#B45309' }}>SURVEY METHOD:</Typography>
                       <Typography sx={{ mb: 3, color: '#92400E', fontWeight: 600, textTransform: 'uppercase' }}>{selectedSession.methodology.replace('_', ' ')}</Typography>
                       <Typography variant="caption" sx={{ fontWeight: 700, color: '#B45309' }}>DISPATCH NOTES:</Typography>
                       <Typography sx={{ mt: 0.5, color: '#92400E', fontStyle: 'italic', bgcolor: '#FEF3C7', p: 2, borderRadius: 2 }}>"{selectedSession.instructions || 'No specific instructions provided.'}"</Typography>
                    </Box>
                  </Paper>
               </Grid>

               <Grid item xs={12} md={5}>
                  <Paper sx={{ p: 3, height: '100%', borderRadius: 4, border: '1px solid #E2E8F0', bgcolor: '#F8FAFC' }}>
                     <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', mb: 2 }}>
                        Team Progress ({selectedSession.team.filter(m => m.status === 'completed').length}/{selectedSession.team.length})
                     </Typography>
                     
                     <Stack spacing={1.5}>
                        {selectedSession.team.map((member) => (
                           <Box key={member.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: '#fff', borderRadius: 2, border: '1px solid #E2E8F0' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                 <Avatar sx={{ width: 30, height: 30, fontSize: 13, bgcolor: member.status === 'completed' ? '#16A34A' : '#94A3B8' }}>
                                    {member.name.substring(0,2).toUpperCase()}
                                 </Avatar>
                                 <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
                                    {member.name}
                                 </Typography>
                              </Box>
                              <Chip 
                                 size="small" 
                                 label={member.status.toUpperCase()} 
                                 color={member.status === 'completed' ? 'success' : 'warning'} 
                                 sx={{ fontWeight: 800, fontSize: '0.65rem' }} 
                              />
                           </Box>
                        ))}
                     </Stack>
                  </Paper>
               </Grid>

             </Grid>
          ) : (
            <>
              {/* COMPLETED SESSIONS ANALYTICS DASHBOARD */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={3}>
                   <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#F8FAFC', display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: '#E2E8F0', color: '#475569', width: 56, height: 56 }}><AssessmentRoundedIcon fontSize="large" /></Avatar>
                      <Box>
                         <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>{extractedBirdRecords.length}</Typography>
                         <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Logs</Typography>
                      </Box>
                   </Paper>
                </Grid>
                <Grid item xs={12} md={3}>
                   <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #C7D2FE', bgcolor: '#EEF2FF', display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: '#E0E7FF', color: '#4F46E5', width: 56, height: 56 }}><EmojiNatureRoundedIcon fontSize="large" /></Avatar>
                      <Box>
                         <Typography variant="h4" sx={{ fontWeight: 800, color: '#312E81' }}>{totalIndividuals}</Typography>
                         <Typography variant="caption" sx={{ fontWeight: 700, color: '#4F46E5', textTransform: 'uppercase' }}>Total Individuals</Typography>
                      </Box>
                   </Paper>
                </Grid>
                <Grid item xs={12} md={3}>
                   <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #BBF7D0', bgcolor: '#F0FDF4', display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: '#DCFCE7', color: '#16A34A', width: 56, height: 56 }}><TimelineRoundedIcon fontSize="large" /></Avatar>
                      <Box>
                         <Typography variant="h4" sx={{ fontWeight: 800, color: '#14532D' }}>{Object.keys(speciesCounts).length}</Typography>
                         <Tooltip title="The total number of distinct species recorded during this session (Species Richness).">
                           <Typography variant="caption" sx={{ fontWeight: 700, color: '#16A34A', textTransform: 'uppercase', cursor: 'help', borderBottom: '1px dashed #16A34A' }}>
                             Distinct Species
                           </Typography>
                         </Tooltip>
                      </Box>
                   </Paper>
                </Grid>
                <Grid item xs={12} md={3}>
                   <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #FED7AA', bgcolor: '#FFF7ED', display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: '#FFEDD5', color: '#EA580C', width: 56, height: 56 }}><PeopleAltRoundedIcon fontSize="large" /></Avatar>
                      <Box>
                         <Typography variant="h6" sx={{ fontWeight: 800, color: '#9A3412', lineHeight: 1.2 }}>{dominantSpecies}</Typography>
                         <Typography variant="caption" sx={{ fontWeight: 700, color: '#EA580C', textTransform: 'uppercase' }}>Dominant Species</Typography>
                      </Box>
                   </Paper>
                </Grid>
              </Grid>

              <Grid container spacing={4}>
                <Grid item xs={12}>
                  <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid #E2E8F0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1 }}>
                       <PublicRoundedIcon sx={{ color: '#0369a1' }} />
                       <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A' }}>Panoramic Geographical Spread</Typography>
                    </Box>
                    <Box sx={{ height: 450, bgcolor: '#E2E8F0', position: 'relative', zIndex: 0 }}>
                      <MapContainer center={mapCenter} zoom={15} scrollWheelZoom={true} touchZoom={true} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OpenStreetMap' />
                        {ekwPolygonCoords.length > 0 && (
                          <Polygon positions={ekwPolygonCoords} pathOptions={{ color: '#0369a1', fillColor: 'transparent', weight: 2, dashArray: '5, 5' }} interactive={false} />
                        )}
                        {/* Map validRoutePoints if they exist (for line transect representation) */}
                        {hasRouteData && (
                          <>
                            <Polyline positions={validRoutePoints.map(pt => [pt.lat, pt.lng])} color="#059669" weight={5} opacity={0.8} />
                            <Marker position={[validRoutePoints[0].lat, validRoutePoints[0].lng]} icon={startIcon}><Popup>Route Start</Popup></Marker>
                            <Marker position={[validRoutePoints[validRoutePoints.length - 1].lat, validRoutePoints[validRoutePoints.length - 1].lng]} icon={endIcon}><Popup>Route End</Popup></Marker>
                          </>
                        )}
                        {/* Map Individual Bird Logs */}
                        {extractedBirdRecords.map((r, idx) => {
                          if (!r.lat || !r.lng) return null; 
                          return (
                            <Marker key={idx} position={[r.lat, r.lng]} icon={birdIcon}>
                              <Popup><strong>{r.species}</strong><br/>Count: {r.count}</Popup>
                            </Marker>
                          );
                        })}
                      </MapContainer>
                    </Box>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                    <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                       <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A' }}>Raw Aggregated Team Logs</Typography>
                    </Box>
                    <TableContainer sx={{ maxHeight: 600 }}>
                      <Table stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#F1F5F9' }}>Species</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#F1F5F9' }}>Count</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#F1F5F9' }}>Method</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#F1F5F9' }}>GPS Location</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {extractedBirdRecords.length === 0 ? (
                             <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6, color: '#64748B' }}>No bird logs found.</TableCell></TableRow>
                          ) : (
                             extractedBirdRecords.map((r, i) => (
                                 <TableRow key={i} hover>
                                   <TableCell sx={{ fontWeight: 600, color: 'primary.dark' }}>
                                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                       <Avatar src={birdDirectoryImages[r.species]} sx={{ width: 32, height: 32, bgcolor: '#F1F5F9' }} />
                                       <Typography variant="body1" sx={{ fontWeight: 700 }}>{r.species}</Typography>
                                     </Box>
                                   </TableCell>
                                   <TableCell><Chip label={r.count} size="medium" sx={{ fontWeight: 700, bgcolor: '#EEF2FF', color: '#4F46E5' }} /></TableCell>
                                   <TableCell>
                                     <Chip label={selectedSession.methodology.replace('_', ' ')} size="small" variant="outlined" sx={{ fontWeight: 600, color: '#0369a1', borderColor: '#bae6fd', textTransform: 'capitalize' }} />
                                   </TableCell>
                                   <TableCell align="right">
                                     {r.lat && r.lng ? (
                                       <Tooltip title="View Pin on Google Maps">
                                         <Button size="small" variant="outlined" href={`https://www.google.com/maps/search/?api=1&query=$${r.lat},${r.lng}`} target="_blank" startIcon={<LocationOnRoundedIcon />} sx={{ color: '#EF4444', borderColor: '#FECACA', '&:hover': { bgcolor: '#FEF2F2', borderColor: '#EF4444' } }}>
                                           View on Maps
                                         </Button>
                                       </Tooltip>
                                     ) : (
                                       <Typography variant="caption" color="text.secondary">No Coordinates</Typography>
                                     )}
                                   </TableCell>
                                 </TableRow>
                               ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>
              </Grid>
            </>
          )}
        </Box>
      ) : (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box>
               <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, color: 'primary.dark' }}>Session Management</Typography>
               <Typography variant="body1" sx={{ color: 'text.secondary' }}>Monitor, audit, and assign structured survey events.</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
               <Button onClick={fetchSessions} variant="outlined" color="primary" sx={{ borderRadius: 2, px: 3, fontWeight: 700, bgcolor: 'white' }}>
                 Refresh
               </Button>
               <Button 
                 onClick={() => { setActiveStep(0); setIsAssignModalOpen(true); }} 
                 variant="contained" color="primary" 
                 startIcon={<AddRoundedIcon />} 
                 sx={{ borderRadius: 2, px: 3, fontWeight: 700 }}
               >
                 Assign New Session
               </Button>
            </Box>
          </Box>
          
          <Paper sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fff' }}>
              <Tabs value={mainTab} onChange={(e, val) => setMainTab(val)} textColor="primary" indicatorColor="primary" sx={{ px: 2 }}>
                <Tab icon={<CheckCircleRoundedIcon sx={{ mr: 1 }}/>} iconPosition="start" label={`Completed Events (${completedSessions.length})`} sx={{ fontWeight: 700, py: 2.5 }} />
                <Tab icon={<AssignmentLateRoundedIcon sx={{ mr: 1 }}/>} iconPosition="start" label={`Pending Assignments (${pendingSessions.length})`} sx={{ fontWeight: 700, py: 2.5 }} />
              </Tabs>
            </Box>

            {isLoading ? (
              <Box sx={{ p: 10, textAlign: 'center' }}><CircularProgress /></Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Session Overview</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displaySessions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 6, color: '#64748B' }}>
                           {mainTab === 0 ? "No completed sessions available." : "No pending assignments right now."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      displaySessions.map((session) => {
                        const isPoint = session.methodology === 'point_count';
                        const isAssigned = session.display_status === 'pending';
                        
                        return (
                          <TableRow key={session.group_id} hover sx={{ borderLeft: isAssigned ? '4px solid #F59E0B' : '4px solid transparent' }}>
                            <TableCell>
                              <Stack direction="row" spacing={2} alignItems="center">
                                <Avatar sx={{ bgcolor: isAssigned ? '#FEF3C7' : (isPoint ? '#EEF2FF' : '#F0FDF4'), color: isAssigned ? '#D97706' : (isPoint ? '#4F46E5' : '#166534') }}>
                                   <AssessmentRoundedIcon />
                                </Avatar>
                                <Box>
                                  <Typography sx={{ fontWeight: 700, color: '#0F172A', textTransform: 'capitalize' }}>
                                    {session.title || `${session.methodology.replace('_', ' ')}`}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    {isAssigned ? `Assigned to Team of ${session.team.length}` : `Completed by Team of ${session.team.length}`}
                                  </Typography>
                                </Box>
                              </Stack>
                            </TableCell>
                            <TableCell>
                               <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {new Date(session.created_at).toLocaleDateString()}
                               </Typography>
                            </TableCell>
                            <TableCell>
                              {isAssigned ? (
                                <Chip label="PENDING" size="small" sx={{ fontWeight: 700, bgcolor: '#FEF3C7', color: '#D97706' }} />
                              ) : (
                                <Chip label="COMPLETED" size="small" sx={{ fontWeight: 700, bgcolor: '#DCFCE7', color: '#166534' }} />
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Button 
                                  variant={isAssigned ? "outlined" : "contained"} 
                                  size="small" color={isAssigned ? "warning" : "primary"}
                                  onClick={() => setSelectedSession(session)}
                                  sx={{ borderRadius: 2, fontWeight: 700, boxShadow: 'none' }}
                                >
                                  {isAssigned ? "View Details" : "View Dashboard"}
                                </Button>
                                <Tooltip title={isAssigned ? "Cancel Assignment" : "Delete Session"}>
                                  <IconButton 
                                    size="small" 
                                    onClick={() => handleDeleteClick(session)}
                                    sx={{ color: '#EF4444', bgcolor: '#FEF2F2', '&:hover': { bgcolor: '#FEE2E2' } }}
                                  >
                                    <DeleteOutlineRoundedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Box>
      )}

      {/* DISPATCH WIZARD */}
      <Dialog open={isAssignModalOpen} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4, height: '80vh', display: 'flex', flexDirection: 'column' } }}>
        <DialogTitle sx={{ p: 3, pb: 2, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.dark' }}>Dispatch New Session</Typography>
          <Typography variant="body2" color="text.secondary">Create a structured survey task and assign it to your field researchers.</Typography>
        </DialogTitle>
        
        <Box sx={{ px: 4, py: 3, borderBottom: '1px solid #E2E8F0' }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}><StepLabel>{label}</StepLabel></Step>
            ))}
          </Stepper>
        </Box>

        <DialogContent sx={{ p: 4, flexGrow: 1, overflowY: 'auto' }}>
          {activeStep === 0 && (
            <Box sx={{ animation: 'fadeIn 0.3s' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Name this Survey Event</Typography>
              <TextField label="Event Title / Area Name" placeholder="e.g. Winter Wetlands North Block" fullWidth value={assignmentForm.title} onChange={(e) => setAssignmentForm({...assignmentForm, title: e.target.value})} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            </Box>
          )}
          {activeStep === 1 && (
            <Box sx={{ animation: 'fadeIn 0.3s' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Select Survey Methodology</Typography>
              <Grid container spacing={2}>
                {[
                  { value: 'point_count', title: 'Point Count', desc: 'Researcher remains stationary at a specific point for a set duration.' },
                  { value: 'total_count', title: 'Line Transect / Total Count', desc: 'Researcher walks a specific continuous path while counting.' },
                  
                ].map((method) => (
                  <Grid item xs={12} md={4} key={method.value}>
                    <Paper elevation={0} onClick={() => setAssignmentForm({...assignmentForm, methodology: method.value})} sx={{ p: 3, height: '100%', cursor: 'pointer', borderRadius: 3, border: '2px solid', borderColor: assignmentForm.methodology === method.value ? 'primary.main' : '#E2E8F0', bgcolor: assignmentForm.methodology === method.value ? '#F0F9FF' : 'white', '&:hover': { borderColor: 'primary.main' } }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, color: assignmentForm.methodology === method.value ? 'primary.dark' : 'text.primary' }}>{method.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{method.desc}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
          {/* MAP SELECTION STEP COMPLETELY REMOVED */}
          {activeStep === 2 && (
            <Box sx={{ animation: 'fadeIn 0.3s' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Assign to Researchers</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Select one or multiple team members to receive this task.</Typography>
              <Paper variant="outlined" sx={{ borderRadius: 3, maxHeight: 300, overflow: 'auto' }}>
                <List disablePadding>
                  {appUsers.map((user, index) => {
                    const isSelected = assignmentForm.assigned_users.includes(user.id);
                    return (
                      <React.Fragment key={user.id}>
                        <ListItem button onClick={() => handleUserToggle(user.id)} sx={{ bgcolor: isSelected ? '#F0F9FF' : 'transparent' }}>
                          <ListItemAvatar><Avatar sx={{ bgcolor: isSelected ? 'primary.main' : 'grey.300' }}>{user.full_name.substring(0, 2).toUpperCase()}</Avatar></ListItemAvatar>
                          <ListItemText primary={<Typography sx={{ fontWeight: 600 }}>{user.full_name}</Typography>} />
                          <Checkbox edge="end" checked={isSelected} disableRipple />
                        </ListItem>
                        {index < appUsers.length - 1 && <Divider />}
                      </React.Fragment>
                    );
                  })}
                </List>
              </Paper>
            </Box>
          )}
          {activeStep === 3 && (
            <Box sx={{ animation: 'fadeIn 0.3s' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Final Instructions & Dispatch</Typography>
              <TextField label="Specific Instructions or Protocol Notes (Optional)" multiline rows={4} placeholder="e.g. Focus exclusively on counting migratory waterfowl in the northern perimeter. Start before 6:00 AM." fullWidth value={assignmentForm.instructions} onChange={(e) => setAssignmentForm({...assignmentForm, instructions: e.target.value})} sx={{ mb: 4, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              <Paper sx={{ p: 3, bgcolor: '#F8FAFC', borderRadius: 3, border: '1px solid #E2E8F0' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.dark', mb: 2 }}>DISPATCH SUMMARY</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}><Typography variant="caption" color="text.secondary">TITLE</Typography><Typography sx={{ fontWeight: 600 }}>{assignmentForm.title}</Typography></Grid>
                  <Grid item xs={6}><Typography variant="caption" color="text.secondary">METHOD</Typography><Typography sx={{ fontWeight: 600, textTransform: 'capitalize' }}>{assignmentForm.methodology.replace('_', ' ')}</Typography></Grid>
                  <Grid item xs={6}><Typography variant="caption" color="text.secondary">LOCATION</Typography><Typography sx={{ fontWeight: 600 }}>Defined by Researcher On-site</Typography></Grid>
                  <Grid item xs={6}><Typography variant="caption" color="text.secondary">TEAM</Typography><Typography sx={{ fontWeight: 600 }}>{assignmentForm.assigned_users.length} members assigned</Typography></Grid>
                </Grid>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #E2E8F0', bgcolor: '#F8FAFC' }}>
          <Button disabled={activeStep === 0 || isAssigning} onClick={handleBackStep} sx={{ fontWeight: 700, mr: 'auto' }}>Back</Button>
          <Button onClick={() => setIsAssignModalOpen(false)} disabled={isAssigning} sx={{ fontWeight: 700, color: 'text.secondary' }}>Cancel</Button>
          {activeStep === steps.length - 1 ? (
            <Button onClick={handleAssignSession} variant="contained" color="primary" disabled={isAssigning} startIcon={isAssigning ? <CircularProgress size={20} color="inherit" /> : <SendRoundedIcon />} sx={{ fontWeight: 700, borderRadius: 2, px: 4 }}>
              {isAssigning ? 'Dispatching...' : 'Confirm Dispatch'}
            </Button>
          ) : (
            <Button onClick={handleNextStep} variant="contained" sx={{ fontWeight: 700, borderRadius: 2, px: 4 }}>Next Step</Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog 
        open={isDeleteDialogOpen} 
        onClose={() => !isDeleting && setIsDeleteDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: '#DC2626', fontWeight: 800 }}>
           <WarningRoundedIcon fontSize="large" />
           {sessionToDelete && sessionToDelete.display_status === 'pending' ? 'Cancel Pending Assignment?' : 'Delete Completed Session?'}
        </DialogTitle>
        <DialogContent>
           <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1 }}>
              {sessionToDelete && sessionToDelete.display_status === 'pending'
                 ? "Are you sure you want to cancel this pending assignment? This will instantly remove it from the assigned researchers' devices."
                 : "Are you sure you want to permanently delete this completed session and all its associated bird logs? This action cannot be undone."
              }
           </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
           <Button onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting} sx={{ fontWeight: 700, color: 'text.secondary' }}>Keep It</Button>
           <Button onClick={confirmDeleteSession} variant="contained" color="error" disabled={isDeleting} startIcon={isDeleting ? <CircularProgress size={20} color="inherit" /> : <DeleteOutlineRoundedIcon />} sx={{ fontWeight: 700, borderRadius: 2, bgcolor: '#DC2626', '&:hover': { bgcolor: '#B91C1C' } }}>
             {isDeleting ? 'Deleting...' : (sessionToDelete && sessionToDelete.display_status === 'pending' ? 'Yes, Cancel Assignment' : 'Yes, Delete Session')}
           </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default CensusSessions;