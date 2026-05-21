import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Avatar, Chip, IconButton, Button, TextField, 
  InputAdornment, FormControl, InputLabel, Select, MenuItem, TablePagination, Tooltip,
  Grid, Divider, CircularProgress, Tabs, Tab 
} from '@mui/material';

// --- MAP LIBRARIES ---
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded'; 
import VisibilityIcon from '@mui/icons-material/Visibility'; 
import FormatListNumberedRoundedIcon from '@mui/icons-material/FormatListNumberedRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded'; 
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded'; 
import SatelliteRoundedIcon from '@mui/icons-material/SatelliteRounded'; 

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

const ObservationList = () => {
  const [observations, setObservations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [activeTab, setActiveTab] = useState(0); 
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);

  const [selectedObs, setSelectedObs] = useState(null);
  const [birdDirectoryImages, setBirdDirectoryImages] = useState({});

  const [feedbackText, setFeedbackText] = useState('');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

  useEffect(() => {
    fetchObservations();
  }, []);

  useEffect(() => {
    setFeedbackText('');
  }, [selectedObs]);

  const fetchObservations = async () => {
    try {
      setIsLoading(true);
      const { data: obsData, error: obsError } = await supabase.from('observations').select('*').order('created_at', { ascending: false });
      if (obsError) throw obsError;

      const { data: profilesData, error: profError } = await supabase.from('app_users').select('id, full_name');
      if (profError) throw profError;

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

  useEffect(() => {
    const fetchDirectoryImages = async () => {
      setBirdDirectoryImages({});
      if (!selectedObs) return;

      let speciesToFetch = [];

      if (selectedObs.bird_name) speciesToFetch.push(selectedObs.bird_name);

      const obsType = selectedObs.type || selectedObs.obs_type || 'random';
      const isCensusDetail = obsType === 'census' || obsType === 'point_count' || obsType === 'total_count';

      if (isCensusDetail && selectedObs.census_data) {
        try {
          const rawData = typeof selectedObs.census_data === 'string' ? JSON.parse(selectedObs.census_data) : selectedObs.census_data;
          let records = [];
          if (Array.isArray(rawData)) records = rawData;
          else if (rawData && typeof rawData === 'object') {
            records = rawData.logs || rawData.records || rawData.birds || Object.values(rawData).find(v => Array.isArray(v)) || [rawData];
          }
          records.forEach(r => {
             const bName = r.birdName || r.bird_name || r.species || r.name;
             if (bName) speciesToFetch.push(bName);
          });
        } catch(e) { console.error("Could not parse census data for images"); }
      }

      speciesToFetch = [...new Set(speciesToFetch)].filter(Boolean);

      if (speciesToFetch.length > 0) {
         const { data, error } = await supabase.from('birds').select('common_name, image_url').in('common_name', speciesToFetch); 
         if (!error && data) {
            const imageMap = {};
            data.forEach(bird => { if (bird.image_url) imageMap[bird.common_name] = bird.image_url; });
            setBirdDirectoryImages(imageMap);
         }
      }
    };
    fetchDirectoryImages();
  }, [selectedObs]);

  const handleVerify = async (id) => {
    try {
      const { error } = await supabase.from('observations').update({ is_verified: true }).eq('id', id);
      if (error) throw error;
      setObservations(observations.map(obs => obs.id === id ? { ...obs, is_verified: true } : obs));
      if (selectedObs && selectedObs.id === id) setSelectedObs({ ...selectedObs, is_verified: true });
    } catch (error) {
      alert('Failed to verify observation.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this field log?")) return;
    try {
      const { error } = await supabase.from('observations').delete().eq('id', id);
      if (error) throw error;
      setObservations(observations.filter(obs => obs.id !== id));
      setSelectedObs(null); 
    } catch (error) {
      alert('Failed to delete observation.');
    }
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim() || !selectedObs) return;
    setIsSendingFeedback(true);
    try {
      const newMsg = {
        observation_id: selectedObs.id,
        user_id: selectedObs.user_id,
        sender_type: 'admin',
        text: feedbackText.trim(),
        is_read: false
      };
      const { error: msgError } = await supabase.from('feedback_messages').insert([newMsg]);
      if (msgError) throw msgError;

      const { error: obsError } = await supabase.from('observations').update({ needs_feedback: true, feedback_status: 'answered' }).eq('id', selectedObs.id);
      if (obsError) throw obsError;

      setObservations(prev => prev.map(o => o.id === selectedObs.id ? { ...o, needs_feedback: true, feedback_status: 'answered' } : o));
      setSelectedObs({ ...selectedObs, needs_feedback: true, feedback_status: 'answered' });
      setFeedbackText('');
      alert("Feedback transmitted to the researcher's mobile device!");
    } catch (error) {
      alert("Failed to send feedback. Please check your connection.");
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const extractRouteCoordinates = (obs) => {
    let rawRoute = [];
    try {
      if (obs.route_data) {
        rawRoute = typeof obs.route_data === 'string' ? JSON.parse(obs.route_data) : obs.route_data;
      } else if (obs.census_data) {
        const parsed = typeof obs.census_data === 'string' ? JSON.parse(obs.census_data) : obs.census_data;
        if (Array.isArray(parsed)) {
          rawRoute = parsed;
        } else if (parsed && typeof parsed === 'object') {
          rawRoute = parsed.route || parsed.path || parsed.logs || parsed.records || parsed.birds || Object.values(parsed).find(v => Array.isArray(v)) || [];
        }
      }
    } catch(e) {
      console.error("Failed to parse data for route extraction");
    }

    const validCoords = rawRoute.filter(pt => {
       const lat = pt.lat || pt.latitude || pt.coords?.latitude || pt.coords?.lat || pt.location?.latitude || pt.location?.lat;
       const lng = pt.lng || pt.longitude || pt.lon || pt.coords?.longitude || pt.coords?.lng || pt.location?.longitude || pt.location?.lng || pt.location?.lon;
       return lat && lng;
    }).map(pt => {
       const lat = pt.lat || pt.latitude || pt.coords?.latitude || pt.coords?.lat || pt.location?.latitude || pt.location?.lat;
       const lng = pt.lng || pt.longitude || pt.lon || pt.coords?.longitude || pt.coords?.lng || pt.location?.longitude || pt.location?.lng || pt.location?.lon;
       return { lat, lng };
    });

    return validCoords;
  };

  const handleExportKML = async () => {
    if (!selectedObs) return;

    const validCoords = extractRouteCoordinates(selectedObs);

    if (validCoords.length < 2) {
      alert("Not enough GPS data points were found in this log to generate a connected walking route.");
      return;
    }

    const kmlCoords = validCoords.map(pt => `${pt.lng},${pt.lat},0`).join('\n');
    const startPt = validCoords[0];
    const endPt = validCoords[validCoords.length - 1];

    const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Census Transect: ${selectedObs.location_name || 'Unknown Location'}</name>
    <description>Logged by ${selectedObs.explorer_name}</description>
    <Style id="yellowLine">
      <LineStyle>
        <color>ff00ffff</color> 
        <width>6</width>
      </LineStyle>
    </Style>
    <Placemark>
      <name>Start</name>
      <Point><coordinates>${startPt.lng},${startPt.lat},0</coordinates></Point>
    </Placemark>
    <Placemark>
      <name>End</name>
      <Point><coordinates>${endPt.lng},${endPt.lat},0</coordinates></Point>
    </Placemark>
    <Placemark>
      <name>Walking Path</name>
      <styleUrl>#yellowLine</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>
          ${kmlCoords}
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;

    try {
      const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
      const fileName = `route_${selectedObs.id}_${Date.now()}.kml`;

      const { data, error } = await supabase.storage
        .from('kml_exports')
        .upload(fileName, blob, { contentType: 'application/vnd.google-earth.kml+xml', upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('kml_exports')
        .getPublicUrl(fileName);

      const mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(urlData.publicUrl)}&t=k`;
      window.open(mapsUrl, '_blank');

    } catch (e) {
      console.error("Failed to upload KML bridge:", e);
      alert("Failed to bridge map. Ensure your 'kml_exports' bucket allows inserts.");
    }
  };

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
      
    const type = obs.type || obs.obs_type || 'random';
    const isCensus = type === 'census' || type === 'point_count' || type === 'total_count';
    const matchesTab = activeTab === 0 ? !isCensus : isCensus;
      
    return matchesSearch && matchesStatus && matchesTab;
  });

  const paginatedObservations = filteredObservations.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // ==========================================
  // VIEW 1: THE DOSSIER
  // ==========================================
  if (selectedObs) {
    const isVerified = selectedObs.is_verified === true;
    
    const finalLat = selectedObs.latitude || selectedObs.lat;
    const finalLng = selectedObs.longitude || selectedObs.lng;
    
    const googleMapsUrl = (finalLat && finalLng) ? `https://www.google.com/maps/search/?api=1&query=${finalLat},${finalLng}` : '#';
    
    const obsType = selectedObs.type || selectedObs.obs_type || 'random';
    const isCensusDetail = obsType === 'census' || obsType === 'point_count' || obsType === 'total_count';

    let parsedCensusRecords = [];
    if (isCensusDetail && selectedObs.census_data) {
      try {
        const rawData = typeof selectedObs.census_data === 'string' ? JSON.parse(selectedObs.census_data) : selectedObs.census_data;
        if (Array.isArray(rawData)) {
          parsedCensusRecords = rawData;
        } else if (rawData && typeof rawData === 'object') {
          parsedCensusRecords = rawData.logs || rawData.records || rawData.birds || Object.values(rawData).find(v => Array.isArray(v)) || [rawData];
        }
      } catch (e) {
        console.error("Failed to parse census data for display");
      }
    }

    let displayMainImage = selectedObs.image_uri;
    if ((!displayMainImage || displayMainImage.startsWith('file://')) && birdDirectoryImages[selectedObs.bird_name]) {
      displayMainImage = birdDirectoryImages[selectedObs.bird_name];
    }

    const validRoutePoints = extractRouteCoordinates(selectedObs);
    const hasRouteData = validRoutePoints.length >= 2;

    return (
      <Box sx={{ animation: 'fadeIn 0.3s ease-in-out' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 2 }}>
          <IconButton onClick={() => setSelectedObs(null)} sx={{ backgroundColor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', '&:hover': { backgroundColor: '#F8FAFC' } }}>
            <ArrowBackRoundedIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.dark' }}>
              {isCensusDetail ? 'Census Session Dossier' : 'Field Log Details'}
            </Typography>
            <Typography variant="body2" color="text.secondary">Submitted on {formatDate(selectedObs.created_at)}</Typography>
          </Box>
          <Box sx={{ ml: 'auto', display: 'flex', gap: 2 }}>
            <Chip 
              icon={isVerified ? <CheckCircleRoundedIcon fontSize="small"/> : <PendingActionsRoundedIcon fontSize="small"/>} 
              label={isVerified ? 'Verified' : 'Pending Review'} 
              sx={{ backgroundColor: isVerified ? '#E8F5E9' : '#FFF8E1', color: isVerified ? '#2E7D32' : '#F57F17', fontWeight: 700, borderRadius: 2, px: 1, py: 2.5, fontSize: '1rem' }} 
            />
          </Box>
        </Box>

        <Paper sx={{ borderRadius: 4, border: '1px solid #E2E8F0', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <Grid container>
            
            {/* LEFT COLUMN */}
            <Grid item xs={12} md={6} sx={{ p: 4, borderRight: { md: '1px solid #E2E8F0' } }}>
              
              {isCensusDetail ? (
                <Box sx={{ width: '100%', height: 300, borderRadius: 3, bgcolor: '#EEF2FF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', mb: 4, border: '2px dashed #C7D2FE' }}>
                   <AssessmentRoundedIcon sx={{ fontSize: 80, color: '#4F46E5', mb: 2 }} />
                   <Typography variant="h6" sx={{ color: '#3730A3', fontWeight: 800 }}>Structured Survey Session</Typography>
                   <Typography variant="body2" sx={{ color: '#4F46E5', fontWeight: 600, mt: 1 }}>{parsedCensusRecords.length} unique records found</Typography>
                </Box>
              ) : (
                <Box 
                  component="img"
                  src={displayMainImage || `https://ui-avatars.com/api/?name=${selectedObs.bird_name || 'NO+IMG'}&background=E2E8F0&color=64748B`}
                  onError={(e) => {
                    e.target.onerror = null; 
                    e.target.src = 'https://ui-avatars.com/api/?name=IMAGE+ERROR&background=E2E8F0&color=64748B&font-size=0.15';
                  }}
                  alt={selectedObs.bird_name}
                  sx={{ width: '100%', height: 300, borderRadius: 3, objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', mb: 4, bgcolor: '#F8FAFC' }} 
                />
              )}
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1 }}>
                  {isCensusDetail ? 'Survey Protocol' : 'Species Identified'}
                </Typography>
                <Chip label={isCensusDetail ? `Mode: ${obsType.replace('_', ' ').toUpperCase()}` : `Count: ${selectedObs.count || 1}`} size="small" color="primary" sx={{ fontWeight: 700 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', mb: 3, textTransform: isCensusDetail ? 'capitalize' : 'none' }}>
                {isCensusDetail ? (selectedObs.location_name || 'Unnamed Session') : (selectedObs.bird_name || 'Unknown Species')}
              </Typography>
              
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1 }}>Logged By</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.light', fontWeight: 700 }}>{selectedObs.explorer_avatar}</Avatar>
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>{selectedObs.explorer_name}</Typography>
                  <Typography variant="caption" color="text.secondary">Field Researcher</Typography>
                </Box>
              </Box>

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

            {/* RIGHT COLUMN */}
            <Grid item xs={12} md={6} sx={{ p: 0, backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', maxHeight: '80vh', overflowY: 'auto' }}>
              
              <Box sx={{ p: 4, pb: 4 }}>
                
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1, mb: 2 }}>Session Telemetry</Typography>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', mb: 4, backgroundColor: 'white' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                    <LocationOnRoundedIcon sx={{ color: '#D84315', mt: 0.5 }} />
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{isCensusDetail ? 'Survey Area' : 'Recorded Location'}</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: 'primary.dark' }}>{selectedObs.location_name || selectedObs.location || 'Unknown Area'}</Typography>
                    </Box>
                  </Box>
                  
                  {finalLat && finalLng && (
                    <>
                      <Divider sx={{ my: 2, borderStyle: 'dashed' }} />
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                        <ExploreRoundedIcon sx={{ color: '#0277BD', mt: 0.5 }} />
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                             {isCensusDetail ? 'Session Origin Coordinates' : 'Recorded Coordinates'}
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: 'monospace', letterSpacing: 1 }}>
                            {parseFloat(finalLat).toFixed(6)}, {parseFloat(finalLng).toFixed(6)}
                          </Typography>
                        </Box>
                      </Box>

                      {/* ➤ NEW: MINI MAP FOR RANDOM FIELD LOGS (NON-CENSUS) */}
                      {!isCensusDetail && (
                        <Box sx={{ height: 200, width: '100%', borderRadius: 3, overflow: 'hidden', border: '1px solid #E2E8F0', mb: 3, zIndex: 1 }}>
                          <MapContainer 
                            center={[finalLat, finalLng]} 
                            zoom={16} 
                            scrollWheelZoom={true} 
                            touchZoom={true}
                            style={{ height: '100%', width: '100%' }}
                          >
                            <TileLayer
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                              attribution='© OpenStreetMap'
                            />
                            <Marker position={[finalLat, finalLng]} icon={birdIcon}>
                              <Popup><b>{selectedObs.bird_name || 'Unknown Species'}</b> spotted here.</Popup>
                            </Marker>
                          </MapContainer>
                        </Box>
                      )}
                      
                      {!hasRouteData && (
                        <Button 
                          variant="contained" fullWidth 
                          href={googleMapsUrl} target="_blank" rel="noopener noreferrer"
                          endIcon={<OpenInNewRoundedIcon />}
                          sx={{ py: 1.5, borderRadius: 2, fontWeight: 700, backgroundColor: '#1E293B', color: 'white', '&:hover': { backgroundColor: '#0F172A' } }}
                        >
                          Open in Google Maps
                        </Button>
                      )}
                    </>
                  )}

                  {/* EMBEDDED MAIN TRANSECT MAP */}
                  {hasRouteData && (
                    <>
                      <Divider sx={{ my: 2, borderStyle: 'dashed' }} />
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                        <TimelineRoundedIcon sx={{ color: '#059669', mt: 0.5 }} />
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Continuous Route Tracked</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                            {validRoutePoints.length} GPS Points Logged
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ height: 250, width: '100%', borderRadius: 3, overflow: 'hidden', border: '1px solid #E2E8F0', zIndex: 1 }}>
                        <MapContainer 
                          center={[validRoutePoints[0].lat, validRoutePoints[0].lng]} 
                          zoom={16} 
                          scrollWheelZoom={true} 
                          touchZoom={true}
                          style={{ height: '100%', width: '100%' }}
                        >
                          <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='© OpenStreetMap'
                          />
                          <Polyline 
                            positions={validRoutePoints.map(pt => [pt.lat, pt.lng])} 
                            color="#059669" 
                            weight={5} 
                            opacity={0.8}
                          />
                          <Marker position={[validRoutePoints[0].lat, validRoutePoints[0].lng]} icon={startIcon}>
                            <Popup>Session Start</Popup>
                          </Marker>
                          <Marker position={[validRoutePoints[validRoutePoints.length - 1].lat, validRoutePoints[validRoutePoints.length - 1].lng]} icon={endIcon}>
                            <Popup>Session End</Popup>
                          </Marker>
                        </MapContainer>
                      </Box>
                    </>
                  )}
                </Paper>

                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1, mb: 1 }}>
                  {isCensusDetail ? 'Detailed Species Observations' : 'Ecological Notes'}
                </Typography>
                
                {isCensusDetail ? (
                  parsedCensusRecords.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {parsedCensusRecords.map((record, index) => {
                        const bName = record.birdName || record.bird_name || record.species || record.name || 'Unknown Species';
                        const bCount = record.count || record.quantity || 1;
                        
                        let rLat = record.lat || record.latitude || record.coords?.latitude || record.coords?.lat || record.location?.latitude || record.location?.lat;
                        let rLng = record.lng || record.longitude || record.lon || record.coords?.longitude || record.coords?.lng || record.location?.longitude || record.location?.lng || record.location?.lon;
                        
                        let isOriginFallback = false;
                        if (!rLat || !rLng) { rLat = finalLat; rLng = finalLng; isOriginFallback = true; }
                        const bImage = birdDirectoryImages[bName]; 

                        return (
                          <Paper key={index} elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: 'white', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                               
                               <Typography variant="body1" sx={{ fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                  <Avatar src={bImage} sx={{ width: 32, height: 32, bgcolor: '#F1F5F9' }}>
                                     {!bImage && <FormatListNumberedRoundedIcon fontSize="small" sx={{ color: '#9CA3AF' }}/>}
                                  </Avatar>
                                  {bName}
                               </Typography>
                               
                               <Chip label={`Count: ${bCount}`} size="small" sx={{ bgcolor: '#EEF2FF', color: '#4F46E5', fontWeight: 700 }} />
                            </Box>

                            {(record.distance || record.angle || record.notes) && (
                              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', bgcolor: '#F8FAFC', p: 1.5, borderRadius: 2 }}>
                                {record.distance && <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569' }}>Distance: {record.distance}</Typography>}
                                {record.angle && <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569' }}>Angle: {record.angle}</Typography>}
                                {record.notes && <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569' }}>Note: {record.notes}</Typography>}
                              </Box>
                            )}

                            {(rLat && rLng) ? (
                               <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#FEF2F2', p: 1, borderRadius: 1.5, alignSelf: 'flex-start' }}>
                                   <LocationOnRoundedIcon sx={{ fontSize: 16, color: '#EF4444' }} />
                                   <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#991B1B' }}>
                                     {parseFloat(rLat).toFixed(6)}, {parseFloat(rLng).toFixed(6)} {isOriginFallback && ' (Origin)'}
                                   </Typography>
                                   <Tooltip title="View exact bird location on Maps">
                                     <IconButton size="small" href={`https://www.google.com/maps/search/?api=1&query=${rLat},${rLng}`} target="_blank" sx={{ p: 0.5, ml: 1 }}>
                                       <OpenInNewRoundedIcon sx={{ fontSize: 14, color: '#EF4444' }}/>
                                     </IconButton>
                                   </Tooltip>
                                 </Box>

                                 <Box sx={{ height: 180, width: '100%', borderRadius: 2, overflow: 'hidden', border: '1px solid #E2E8F0', zIndex: 0 }}>
                                    <MapContainer 
                                      center={[rLat, rLng]} 
                                      zoom={16} 
                                      scrollWheelZoom={true} 
                                      touchZoom={true}
                                      style={{ height: '100%', width: '100%' }}
                                    >
                                      <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='© OpenStreetMap'
                                      />
                                      <Marker position={[rLat, rLng]} icon={birdIcon}>
                                        <Popup><b>{bName}</b> spotted here.</Popup>
                                      </Marker>
                                    </MapContainer>
                                 </Box>

                               </Box>
                            ) : (
                               <Typography variant="caption" sx={{ fontStyle: 'italic', color: '#9CA3AF' }}>No GPS coordinates available.</Typography>
                            )}
                          </Paper>
                        );
                      })}
                    </Box>
                  ) : (
                    <Box sx={{ bgcolor: '#F8FAFC', p: 2, borderRadius: 2, overflowX: 'auto', border: '1px solid #E2E8F0' }}>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 800, fontFamily: 'monospace' }}>RAW PAYLOAD</Typography>
                      <Typography variant="body2" sx={{ color: '#334155', fontFamily: 'monospace', whiteSpace: 'pre-wrap', mt: 1 }}>{JSON.stringify(selectedObs.census_data, null, 2)}</Typography>
                    </Box>
                  )
                ) : (
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
                    {(!selectedObs.habitat_notes && !selectedObs.flora && !selectedObs.water_body && !selectedObs.notes) && (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', mt: 2 }}>
                        No additional ecological notes provided by the researcher.
                      </Typography>
                    )}
                  </Paper>
                )}

                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1, mb: 1, mt: 4, display: 'block' }}>
                  Proactive Communication
                </Typography>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #93C5FD', backgroundColor: '#F0F9FF' }}>
                  <Typography variant="body2" sx={{ color: '#0369A1', fontWeight: 600, mb: 2 }}>
                    Send an alert, correction, or clarification directly to {selectedObs.explorer_name}'s mobile device regarding this specific log.
                  </Typography>
                  <TextField 
                    fullWidth 
                    multiline 
                    minRows={2} 
                    placeholder="Type your feedback to the researcher here..." 
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    sx={{ mb: 2, backgroundColor: 'white', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  <Button 
                    variant="contained" 
                    fullWidth 
                    color="primary"
                    disabled={!feedbackText.trim() || isSendingFeedback}
                    onClick={handleSendFeedback}
                    startIcon={isSendingFeedback ? <CircularProgress size={20} color="inherit"/> : <SendRoundedIcon />}
                    sx={{ py: 1.5, borderRadius: 2, fontWeight: 700, boxShadow: 'none' }}
                  >
                    {isSendingFeedback ? 'Transmitting...' : 'Transmit Feedback'}
                  </Button>
                </Paper>

              </Box>
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
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fff' }}>
          <Tabs value={activeTab} onChange={(e, newValue) => { setActiveTab(newValue); setPage(0); }} textColor="primary" indicatorColor="primary" sx={{ px: 2 }}>
            <Tab icon={<VisibilityIcon sx={{ mr: 1 }}/>} iconPosition="start" label="Random Sightings" sx={{ fontWeight: 700, py: 2.5 }} />
            <Tab icon={<AssessmentRoundedIcon sx={{ mr: 1 }}/>} iconPosition="start" label="Census Logs" sx={{ fontWeight: 700, py: 2.5 }} />
          </Tabs>
        </Box>

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

        <TableContainer>
          <Table sx={{ minWidth: 900 }}>
            <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Date Logged</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Explorer</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>{activeTab === 0 ? 'Species Spotted' : 'Session Area'}</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Location Data</TableCell>
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
                    No {activeTab === 0 ? 'Random Sightings' : 'Census Logs'} found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedObservations.map((obs) => {
                  const isVerified = obs.is_verified === true;
                  const type = obs.type || obs.obs_type || 'random';
                  return (
                    <TableRow key={obs.id} hover sx={{ borderLeft: activeTab === 1 ? '4px solid #4F46E5' : '4px solid transparent' }}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.dark' }}>{formatDate(obs.created_at)}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>Mode: {type.replace('_', ' ')}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: activeTab === 1 ? '#EEF2FF' : 'primary.light', color: activeTab === 1 ? '#4F46E5' : 'primary.main', fontSize: '0.875rem', fontWeight: 700 }}>
                            {obs.explorer_avatar}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{obs.explorer_name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, textTransform: activeTab === 1 ? 'capitalize' : 'none' }}>
                          {activeTab === 0 ? (obs.bird_name || 'Unknown') : (obs.location_name || 'Survey Area')}
                        </Typography>
                        {activeTab === 0 && <Typography variant="caption" sx={{ color: 'text.secondary' }}>Count: {obs.count || 1}</Typography>}
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
                          sx={{ backgroundColor: isVerified ? '#E8F5E9' : '#FFF8E1', color: isVerified ? '#2E7D32' : '#F57F17', fontWeight: 700, borderRadius: 1.5, pl: 0.5 }} 
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View Field Dossier">
                          <IconButton onClick={() => setSelectedObs(obs)} color="primary" sx={{ mr: 1, backgroundColor: 'rgba(27, 67, 50, 0.05)' }}>
                            <VisibilityRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {!isVerified && (
                          <Tooltip title="Verify Data">
                            <IconButton onClick={() => handleVerify(obs.id)} sx={{ mr: 1, color: '#2E7D32', backgroundColor: '#E8F5E9' }}>
                              <CheckCircleRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete Log">
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