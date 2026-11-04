import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Avatar, Chip, IconButton, Button, TextField, InputAdornment, TablePagination, Tooltip,
  Divider, CircularProgress, Tabs, Tab, Skeleton, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, Snackbar, Alert, Stack, GlobalStyles, Collapse,
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
import FormatListNumberedRoundedIcon from '@mui/icons-material/FormatListNumberedRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import InsertPhotoRoundedIcon from '@mui/icons-material/InsertPhotoRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';

const C = { deep: '#06180F', forest: '#1B4332', moss: '#2D6A4F', mint: '#B7E4C7', sun: '#F2C14E', line: '#E2E8F0', indigo: '#4F46E5' };
const HEADING = '"Bricolage Grotesque", sans-serif';
const panelSx = { borderRadius: '24px', border: `1px solid ${C.line}`, boxShadow: '0 6px 28px rgba(6,24,15,0.04)', bgcolor: '#fff' };

// --- CUSTOM MAP MARKERS ---
const mk = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41],
});
const startIcon = mk('green');
const endIcon = mk('red');
const birdIcon = mk('blue');

/* ---------- data helpers ---------- */
const getType = (o) => o.type || o.obs_type || 'random';
const isCensusType = (o) => ['census', 'point_count', 'total_count'].includes(getType(o));
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
const safeParse = (v) => { if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch { return null; } };

const pickCoords = (pt) => {
  if (!pt || typeof pt !== 'object') return null;
  const lat = num(pt.lat ?? pt.latitude ?? pt.coords?.latitude ?? pt.coords?.lat ?? pt.location?.latitude ?? pt.location?.lat);
  const lng = num(pt.lng ?? pt.longitude ?? pt.lon ?? pt.coords?.longitude ?? pt.coords?.lng ?? pt.location?.longitude ?? pt.location?.lng ?? pt.location?.lon);
  return lat !== null && lng !== null ? { lat, lng } : null;
};

const parseCensusRecords = (obs) => {
  if (!obs.census_data) return [];
  const raw = safeParse(obs.census_data);
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') return raw.logs || raw.records || raw.birds || Object.values(raw).find(Array.isArray) || [raw];
  return [];
};

const extractRoute = (obs) => {
  let raw = [];
  if (obs.route_data) {
    const p = safeParse(obs.route_data);
    raw = Array.isArray(p) ? p : [];
  } else if (obs.census_data) {
    const p = safeParse(obs.census_data);
    if (Array.isArray(p)) raw = p;
    else if (p && typeof p === 'object') raw = p.route || p.path || p.logs || p.records || p.birds || Object.values(p).find(Array.isArray) || [];
  }
  return raw.map(pickCoords).filter(Boolean);
};

const recordName = (r) => r.birdName || r.bird_name || r.species || r.name;
const formatDate = (s) => (s ? new Date(s).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown date');
const AVATAR_COLORS = ['#2D6A4F', '#0369A1', '#8A6B2F', '#6B5B7B', '#1F8FA3', '#9A4D3A'];
const colorFor = (name) => AVATAR_COLORS[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AVATAR_COLORS.length];
const escapeXml = (s) => String(s ?? '').replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/* ---------- small UI pieces ---------- */
const StatusChip = ({ verified, size = 'small', sx }) => (
  <Chip
    size={size} icon={verified ? <CheckCircleRoundedIcon fontSize="small" /> : <PendingActionsRoundedIcon fontSize="small" />}
    label={verified ? 'Verified' : 'Pending'}
    sx={{ bgcolor: verified ? '#E8F5E9' : '#FFF4D6', color: verified ? '#2E7D32' : '#B45309', fontWeight: 800, '& .MuiChip-icon': { color: 'inherit' }, ...sx }}
  />
);

const MapBox = ({ center, height = 220, children }) => (
  <Box sx={{ height, borderRadius: '18px', overflow: 'hidden', border: `1px solid ${C.line}`, isolation: 'isolate' }}>
    <MapContainer center={center} zoom={16} scrollWheelZoom={false} touchZoom style={{ height: '100%', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
      {children}
    </MapContainer>
  </Box>
);

const Label = ({ children }) => (
  <Typography sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: '1.15rem', color: C.deep, mb: 1.5 }}>{children}</Typography>
);

/* One census record; its map only loads when opened, so long sessions stay fast */
const CensusRecordCard = ({ record, image, originFallback }) => {
  const [showMap, setShowMap] = useState(false);
  const name = recordName(record) || 'Unknown species';
  const count = record.count || record.quantity || 1;
  const own = pickCoords(record);
  const coords = own || originFallback;
  return (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: '18px', border: `1px solid ${C.line}`, bgcolor: '#fff' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar src={image} sx={{ width: 40, height: 40, bgcolor: '#F1F5F9' }}>
          <FormatListNumberedRoundedIcon fontSize="small" sx={{ color: '#9CA3AF' }} />
        </Avatar>
        <Typography sx={{ fontWeight: 800, color: C.deep, flex: 1, minWidth: 0 }} noWrap>{name}</Typography>
        <Chip label={`Count: ${count}`} size="small" sx={{ bgcolor: '#EEF2FF', color: C.indigo, fontWeight: 800 }} />
      </Box>

      {(record.distance || record.angle || record.notes) && (
        <Box sx={{ mt: 1.5, display: 'flex', gap: 2, flexWrap: 'wrap', bgcolor: '#F4F7F6', p: 1.5, borderRadius: '12px' }}>
          {record.distance && <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>Distance: {record.distance}</Typography>}
          {record.angle && <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>Angle: {record.angle}</Typography>}
          {record.notes && <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>Note: {record.notes}</Typography>}
        </Box>
      )}

      {coords ? (
        <>
          <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip icon={<LocationOnRoundedIcon sx={{ fontSize: 16 }} />} size="small"
              label={`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}${own ? '' : ' (session origin)'}`}
              sx={{ bgcolor: '#FEF2F2', color: '#991B1B', fontFamily: 'monospace', fontWeight: 700, '& .MuiChip-icon': { color: '#EF4444' } }} />
            <Tooltip title="Open in Google Maps">
              <IconButton size="small" href={`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`} target="_blank" rel="noopener noreferrer" aria-label="Open in Google Maps">
                <OpenInNewRoundedIcon sx={{ fontSize: 16, color: '#EF4444' }} />
              </IconButton>
            </Tooltip>
            <Button size="small" onClick={() => setShowMap((s) => !s)} endIcon={<ExpandMoreRoundedIcon sx={{ transform: showMap ? 'rotate(180deg)' : 'none', transition: 'transform .3s' }} />}
              sx={{ ml: 'auto', textTransform: 'none', fontWeight: 700, color: C.moss }}>
              {showMap ? 'Hide map' : 'Show map'}
            </Button>
          </Box>
          <Collapse in={showMap} unmountOnExit>
            <Box sx={{ mt: 1.5 }}>
              <MapBox center={[coords.lat, coords.lng]} height={190}>
                <Marker position={[coords.lat, coords.lng]} icon={birdIcon}><Popup><b>{name}</b> spotted here.</Popup></Marker>
              </MapBox>
            </Box>
          </Collapse>
        </>
      ) : (
        <Typography variant="caption" sx={{ display: 'block', mt: 1.5, fontStyle: 'italic', color: '#94A3B8' }}>No GPS coordinates available.</Typography>
      )}
    </Paper>
  );
};

/* ================= DOSSIER ================= */
const ObservationDossier = ({ obs, onBack, onVerify, onDelete, onFeedbackSent, notify }) => {
  const [feedbackText, setFeedbackText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [images, setImages] = useState({});

  const isVerified = obs.is_verified === true;
  const isCensus = isCensusType(obs);
  const obsType = getType(obs);
  const lat = num(obs.latitude ?? obs.lat);
  const lng = num(obs.longitude ?? obs.lng);
  const hasPoint = lat !== null && lng !== null;
  const records = useMemo(() => (isCensus ? parseCensusRecords(obs) : []), [obs, isCensus]);
  const route = useMemo(() => extractRoute(obs), [obs]);
  const hasRoute = route.length >= 2;

  // Photos for this log's species from the bird directory
  useEffect(() => {
    let cancelled = false;
    const names = [...new Set([obs.bird_name, ...records.map(recordName)].filter(Boolean))];
    setImages({});
    if (names.length === 0) return undefined;
    supabase.from('birds').select('common_name, image_url').in('common_name', names).then(({ data, error }) => {
      if (cancelled || error || !data) return;
      const map = {};
      data.forEach((b) => { if (b.image_url) map[b.common_name] = b.image_url; });
      setImages(map);
    });
    return () => { cancelled = true; };
  }, [obs.id, obs.bird_name, records]);

  let heroImage = obs.image_uri;
  if ((!heroImage || heroImage.startsWith('file://')) && images[obs.bird_name]) heroImage = images[obs.bird_name];

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) return;
    setIsSending(true);
    try {
      const { error: msgError } = await supabase.from('feedback_messages').insert([{
        observation_id: obs.id, user_id: obs.user_id, sender_type: 'admin', text: feedbackText.trim(), is_read: false,
      }]);
      if (msgError) throw msgError;
      const patch = { needs_feedback: true, feedback_status: 'answered' };
      const { error: obsError } = await supabase.from('observations').update(patch).eq('id', obs.id);
      if (obsError) throw obsError;
      onFeedbackSent(obs.id, patch);
      setFeedbackText('');
      notify("Feedback sent to the researcher's phone.");
    } catch (e) {
      notify('Could not send feedback. Check your connection and try again.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenRoute = async () => {
    const start = route[0]; const end = route[route.length - 1];
    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Census Transect: ${escapeXml(obs.location_name || 'Unknown Location')}</name>
    <description>Logged by ${escapeXml(obs.explorer_name)}</description>
    <Style id="yellowLine"><LineStyle><color>ff00ffff</color><width>6</width></LineStyle></Style>
    <Placemark><name>Start</name><Point><coordinates>${start.lng},${start.lat},0</coordinates></Point></Placemark>
    <Placemark><name>End</name><Point><coordinates>${end.lng},${end.lat},0</coordinates></Point></Placemark>
    <Placemark>
      <name>Walking Path</name><styleUrl>#yellowLine</styleUrl>
      <LineString><tessellate>1</tessellate><coordinates>
${route.map((p) => `${p.lng},${p.lat},0`).join('\n')}
      </coordinates></LineString>
    </Placemark>
  </Document>
</kml>`;
    try {
      const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
      const fileName = `route_${obs.id}_${Date.now()}.kml`;
      const { error } = await supabase.storage.from('kml_exports').upload(fileName, blob, { contentType: 'application/vnd.google-earth.kml+xml', upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('kml_exports').getPublicUrl(fileName);
      window.open(`https://www.google.com/maps?q=${encodeURIComponent(data.publicUrl)}&t=k`, '_blank');
    } catch (e) {
      console.error('Failed to upload KML bridge:', e);
      notify("Could not open the route. Make sure the 'kml_exports' bucket allows uploads.", 'error');
    }
  };

  const title = isCensus ? (obs.location_name || 'Unnamed session') : (obs.bird_name || 'Unknown species');

  return (
    <Box sx={{ animation: 'fadeUp .4s ease-out both' }}>
      {/* header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={onBack} aria-label="Back to ledger" sx={{ bgcolor: '#fff', border: `1px solid ${C.line}`, '&:hover': { bgcolor: C.mint } }}><ArrowBackRoundedIcon /></IconButton>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography component="h1" sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: { xs: '1.7rem', md: '2.4rem' }, lineHeight: 1.05, letterSpacing: '-0.03em', color: C.deep }}>
            {isCensus ? 'Census session' : 'Field log'}
          </Typography>
          <Typography variant="body2" color="text.secondary">Submitted {formatDate(obs.created_at)}</Typography>
        </Box>
        <StatusChip verified={isVerified} size="medium" sx={{ height: 38, fontSize: '.95rem', px: 0.5 }} />
      </Box>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '5fr 7fr' }, alignItems: 'start' }}>
        {/* LEFT */}
        <Paper elevation={0} sx={{ ...panelSx, overflow: 'hidden' }}>
          <Box sx={{ position: 'relative', aspectRatio: '4 / 3', bgcolor: C.deep }}>
            {isCensus ? (
              <Box sx={{ height: '100%', display: 'grid', placeItems: 'center', textAlign: 'center', background: 'linear-gradient(150deg, #312E81, #06180F)', color: '#fff' }}>
                <Box>
                  <AssessmentRoundedIcon sx={{ fontSize: 72, color: '#C7D2FE' }} />
                  <Typography sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: '1.3rem' }}>Structured survey</Typography>
                  <Typography variant="body2" sx={{ color: '#C7D2FE' }}>{records.length} species records</Typography>
                </Box>
              </Box>
            ) : heroImage ? (
              <Box component="img" src={heroImage} alt={obs.bird_name} onError={(e) => { e.currentTarget.style.display = 'none'; }} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Box sx={{ height: '100%', display: 'grid', placeItems: 'center', background: `linear-gradient(160deg, ${C.moss}, ${C.deep})` }}>
                <InsertPhotoRoundedIcon sx={{ fontSize: 56, color: 'rgba(255,255,255,0.45)' }} />
              </Box>
            )}
            <Chip label={isCensus ? `Mode: ${obsType.replace(/_/g, ' ')}` : `Count: ${obs.count || 1}`} size="small"
              sx={{ position: 'absolute', top: 14, left: 14, bgcolor: 'rgba(6,24,15,0.75)', color: '#fff', fontWeight: 800, textTransform: 'capitalize' }} />
          </Box>

          <Box sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>{isCensus ? 'Survey area' : 'Species identified'}</Typography>
            <Typography component="h2" sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: { xs: '1.9rem', md: '2.4rem' }, lineHeight: 1.05, letterSpacing: '-0.03em', color: C.deep, mt: 0.5, mb: 3 }}>{title}</Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: '18px', bgcolor: '#F4F7F6' }}>
              <Avatar sx={{ width: 44, height: 44, bgcolor: colorFor(obs.explorer_name), fontWeight: 700 }}>{obs.explorer_avatar}</Avatar>
              <Box>
                <Typography sx={{ fontWeight: 800 }}>{obs.explorer_name}</Typography>
                <Typography variant="caption" color="text.secondary">Field researcher</Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              {!isVerified && (
                <Button fullWidth onClick={() => onVerify(obs.id)} startIcon={<CheckCircleRoundedIcon />}
                  sx={{ py: 1.4, borderRadius: '999px', textTransform: 'none', fontWeight: 800, bgcolor: C.moss, color: '#fff', '&:hover': { bgcolor: C.forest } }}>
                  Approve and verify
                </Button>
              )}
              <Button fullWidth color="error" variant="outlined" onClick={() => onDelete(obs)} startIcon={<DeleteOutlineRoundedIcon />}
                sx={{ py: 1.4, borderRadius: '999px', textTransform: 'none', fontWeight: 800 }}>
                Delete log
              </Button>
            </Stack>
          </Box>
        </Paper>

        {/* RIGHT */}
        <Stack spacing={3}>
          <Paper elevation={0} sx={{ ...panelSx, p: 3 }}>
            <Label>{isCensus ? 'Survey location' : 'Where it was seen'}</Label>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <LocationOnRoundedIcon sx={{ color: '#D84315', mt: 0.3 }} />
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{isCensus ? 'Survey area' : 'Recorded location'}</Typography>
                <Typography sx={{ fontWeight: 800, color: C.deep }}>{obs.location_name || obs.location || 'Unknown area'}</Typography>
              </Box>
            </Box>

            {hasPoint && (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mt: 2 }}>
                <ExploreRoundedIcon sx={{ color: '#0277BD', mt: 0.3 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{isCensus ? 'Session origin' : 'Coordinates'}</Typography>
                  <Typography sx={{ fontWeight: 800, fontFamily: 'monospace', letterSpacing: 0.5 }}>{lat.toFixed(6)}, {lng.toFixed(6)}</Typography>
                </Box>
              </Box>
            )}

            {hasPoint && !isCensus && (
              <Box sx={{ mt: 2.5 }}>
                <MapBox center={[lat, lng]}>
                  <Marker position={[lat, lng]} icon={birdIcon}><Popup><b>{obs.bird_name || 'Unknown species'}</b> spotted here.</Popup></Marker>
                </MapBox>
              </Box>
            )}

            {hasRoute && (
              <>
                <Divider sx={{ my: 2.5, borderStyle: 'dashed' }} />
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 2 }}>
                  <TimelineRoundedIcon sx={{ color: '#059669', mt: 0.3 }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Continuous route tracked</Typography>
                    <Typography sx={{ fontWeight: 800, color: C.deep }}>{route.length} GPS points logged</Typography>
                  </Box>
                </Box>
                <MapBox center={[route[0].lat, route[0].lng]} height={260}>
                  <Polyline positions={route.map((p) => [p.lat, p.lng])} color="#059669" weight={5} opacity={0.85} />
                  <Marker position={[route[0].lat, route[0].lng]} icon={startIcon}><Popup>Session start</Popup></Marker>
                  <Marker position={[route[route.length - 1].lat, route[route.length - 1].lng]} icon={endIcon}><Popup>Session end</Popup></Marker>
                </MapBox>
              </>
            )}

            {hasPoint && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2.5 }}>
                <Button fullWidth href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`} target="_blank" rel="noopener noreferrer" endIcon={<OpenInNewRoundedIcon />}
                  sx={{ py: 1.3, borderRadius: '999px', textTransform: 'none', fontWeight: 800, bgcolor: C.deep, color: '#fff', '&:hover': { bgcolor: C.forest } }}>
                  Open in Google Maps
                </Button>
                {hasRoute && (
                  <Button fullWidth onClick={handleOpenRoute} endIcon={<TimelineRoundedIcon />}
                    sx={{ py: 1.3, borderRadius: '999px', textTransform: 'none', fontWeight: 800, bgcolor: '#E3F6EE', color: '#047857', '&:hover': { bgcolor: C.mint } }}>
                    Open route in Maps
                  </Button>
                )}
              </Stack>
            )}
          </Paper>

          <Paper elevation={0} sx={{ ...panelSx, p: 3 }}>
            <Label>{isCensus ? 'Species records' : 'Ecological notes'}</Label>
            {isCensus ? (
              records.length > 0 ? (
                <Stack spacing={2}>
                  {records.map((r, i) => (
                    <CensusRecordCard key={i} record={r} image={images[recordName(r)]} originFallback={hasPoint ? { lat, lng } : null} />
                  ))}
                </Stack>
              ) : (
                <Box sx={{ bgcolor: '#F4F7F6', p: 2, borderRadius: '14px', overflowX: 'auto' }}>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 800 }}>Raw data (could not be read as species records)</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', mt: 1 }}>{JSON.stringify(obs.census_data, null, 2)}</Typography>
                </Box>
              )
            ) : (
              <Stack spacing={2}>
                {obs.habitat_notes && <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#334155' }}>Habitat: "{obs.habitat_notes}"</Typography>}
                {obs.flora && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ForestRoundedIcon fontSize="small" color="success" /><Typography variant="body2" sx={{ fontWeight: 600 }}>Flora: {obs.flora}</Typography></Box>}
                {obs.water_body && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><WaterDropRoundedIcon fontSize="small" color="info" /><Typography variant="body2" sx={{ fontWeight: 600 }}>Water body: {obs.water_body}</Typography></Box>}
                {obs.notes && <Box sx={{ p: 2, bgcolor: '#F1F5F9', borderRadius: '14px' }}><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Additional notes</Typography><Typography variant="body2">{obs.notes}</Typography></Box>}
                {!obs.habitat_notes && !obs.flora && !obs.water_body && !obs.notes && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>The researcher did not add ecological notes.</Typography>
                )}
              </Stack>
            )}
          </Paper>

          <Paper elevation={0} sx={{ ...panelSx, p: 3, bgcolor: '#F0F9FF', borderColor: '#BAE0F7' }}>
            <Label>Message the researcher</Label>
            <Typography variant="body2" sx={{ color: '#0369A1', fontWeight: 600, mb: 2 }}>
              Send a correction or question about this log straight to {obs.explorer_name}'s phone.
            </Typography>
            <TextField fullWidth multiline minRows={3} placeholder="Type your feedback here" value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)}
              sx={{ mb: 2, bgcolor: '#fff', borderRadius: '14px', '& .MuiOutlinedInput-root': { borderRadius: '14px' } }} inputProps={{ 'aria-label': 'Feedback message' }} />
            <Button fullWidth disabled={!feedbackText.trim() || isSending} onClick={handleSendFeedback}
              startIcon={isSending ? <CircularProgress size={20} color="inherit" /> : <SendRoundedIcon />}
              sx={{ py: 1.4, borderRadius: '999px', textTransform: 'none', fontWeight: 800, bgcolor: '#0369A1', color: '#fff', '&:hover': { bgcolor: '#075985' }, '&.Mui-disabled': { bgcolor: '#BAE0F7', color: '#fff' } }}>
              {isSending ? 'Sending…' : 'Send feedback'}
            </Button>
          </Paper>
        </Stack>
      </Box>
    </Box>
  );
};

/* ================= MAIN ================= */
const ObservationList = () => {
  const [observations, setObservations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [selectedObs, setSelectedObs] = useState(null);
  const [deletingObs, setDeletingObs] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });

  const notify = (msg, severity = 'success') => setToast({ open: true, msg, severity });

  const fetchObservations = async () => {
    try {
      setIsLoading(true);
      const { data: obsData, error: obsError } = await supabase.from('observations').select('*').order('created_at', { ascending: false });
      if (obsError) throw obsError;
      const { data: profilesData, error: profError } = await supabase.from('app_users').select('id, full_name');
      if (profError) throw profError;

      const names = new Map((profilesData || []).map((p) => [p.id, p.full_name]));
      setObservations((obsData || []).map((obs) => {
        const name = names.get(obs.user_id) || 'Unknown Explorer';
        return { ...obs, explorer_name: name, explorer_avatar: name.trim().split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U' };
      }));
    } catch (error) {
      console.error('Error fetching logs:', error.message);
      notify('Could not load observations. Check your connection and refresh.', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => { fetchObservations(); }, []);

  const handleVerify = async (id) => {
    try {
      const { error } = await supabase.from('observations').update({ is_verified: true }).eq('id', id);
      if (error) throw error;
      setObservations((list) => list.map((o) => (o.id === id ? { ...o, is_verified: true } : o)));
      setSelectedObs((s) => (s && s.id === id ? { ...s, is_verified: true } : s));
      notify('Observation verified.');
    } catch (error) {
      notify('Could not verify this observation. Please try again.', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deletingObs) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('observations').delete().eq('id', deletingObs.id);
      if (error) throw error;
      setObservations((list) => list.filter((o) => o.id !== deletingObs.id));
      setSelectedObs(null);
      setDeletingObs(null);
      notify('Field log deleted.');
    } catch (error) {
      notify('Could not delete this log. Please try again.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFeedbackSent = (id, patch) => {
    setObservations((list) => list.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    setSelectedObs((s) => (s && s.id === id ? { ...s, ...patch } : s));
  };

  // Filtering
  const inTab = useMemo(() => observations.filter((o) => (activeTab === 0 ? !isCensusType(o) : isCensusType(o))), [observations, activeTab]);
  const tabCounts = useMemo(() => ({
    random: observations.filter((o) => !isCensusType(o)).length,
    census: observations.filter(isCensusType).length,
  }), [observations]);
  const statusCounts = useMemo(() => ({
    All: inTab.length,
    Pending: inTab.filter((o) => !o.is_verified).length,
    Verified: inTab.filter((o) => o.is_verified === true).length,
  }), [inTab]);

  const filteredObservations = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return inTab.filter((obs) => {
      const matchesSearch = (obs.bird_name || '').toLowerCase().includes(q) || (obs.explorer_name || '').toLowerCase().includes(q) || (obs.location_name || '').toLowerCase().includes(q);
      const matchesStatus = filterStatus === 'All' || (filterStatus === 'Verified' && obs.is_verified === true) || (filterStatus === 'Pending' && !obs.is_verified);
      return matchesSearch && matchesStatus;
    });
  }, [inTab, searchTerm, filterStatus]);

  const paginated = filteredObservations.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // CSV export (exports everything matching the current filters)
  const handleExportCsv = () => {
    if (filteredObservations.length === 0) { notify('There is nothing to export with the current filters.', 'error'); return; }
    const header = ['Date logged', 'Mode', 'Explorer', activeTab === 0 ? 'Species' : 'Session area', 'Count', 'Location', 'Latitude', 'Longitude', 'Status'];
    const rows = filteredObservations.map((o) => [
      o.created_at ? new Date(o.created_at).toISOString() : '', getType(o), o.explorer_name,
      activeTab === 0 ? o.bird_name : o.location_name, activeTab === 0 ? (o.count || 1) : '',
      o.location_name || o.location || '', o.latitude ?? o.lat ?? '', o.longitude ?? o.lng ?? '', o.is_verified ? 'Verified' : 'Pending',
    ]);
    const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `observations_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    notify(`Exported ${filteredObservations.length} log${filteredObservations.length > 1 ? 's' : ''}.`);
  };

  const globalStyles = (
    <GlobalStyles styles={`
      @keyframes fadeUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: none } }
      @keyframes spin { to { transform: rotate(360deg) } }
    `} />
  );

  const toastEl = (
    <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast((t) => ({ ...t, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <Alert severity={toast.severity} variant="filled" onClose={() => setToast((t) => ({ ...t, open: false }))} sx={{ borderRadius: '14px', fontWeight: 600 }}>{toast.msg}</Alert>
    </Snackbar>
  );

  const deleteDialog = (
    <Dialog open={!!deletingObs} onClose={() => !isDeleting && setDeletingObs(null)} PaperProps={{ sx: { borderRadius: '24px', p: 1 } }}>
      <DialogTitle sx={{ fontFamily: HEADING, fontWeight: 800 }}>Delete this field log?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {deletingObs && (isCensusType(deletingObs) ? `The census session at ${deletingObs.location_name || 'this area'}` : `The sighting of ${deletingObs.bird_name || 'this species'}`)}
          {deletingObs && ` by ${deletingObs.explorer_name} will be permanently removed. This cannot be undone.`}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setDeletingObs(null)} disabled={isDeleting} color="inherit" sx={{ textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
        <Button onClick={confirmDelete} disabled={isDeleting} variant="contained" color="error" sx={{ textTransform: 'none', fontWeight: 800, borderRadius: '999px', px: 3 }}>
          {isDeleting ? <CircularProgress size={22} color="inherit" /> : 'Delete log'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // VIEW 1: DOSSIER
  if (selectedObs) {
    return (
      <>
        {globalStyles}
        <ObservationDossier obs={selectedObs} onBack={() => setSelectedObs(null)} onVerify={handleVerify} onDelete={setDeletingObs} onFeedbackSent={handleFeedbackSent} notify={notify} />
        {deleteDialog}
        {toastEl}
      </>
    );
  }

  // VIEW 2: LEDGER
  const statusChips = [['All', 'All'], ['Pending', 'Pending review'], ['Verified', 'Verified']];
  return (
    <Box>
      {globalStyles}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'flex-end' }, flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 3 }}>
        <Box>
          <Typography component="h1" sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: { xs: '2rem', md: '2.8rem' }, lineHeight: 1.05, letterSpacing: '-0.03em', color: C.deep }}>
            Observation ledger
          </Typography>
          <Typography sx={{ mt: 0.8, color: 'text.secondary' }}>
            {isLoading ? 'Syncing logs from the mobile app…' : `${observations.length} logs synced, ${observations.filter((o) => !o.is_verified).length} waiting for review.`}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button onClick={fetchObservations} disabled={isLoading} startIcon={<RefreshRoundedIcon sx={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />}
            sx={{ bgcolor: C.moss, color: '#fff', textTransform: 'none', fontWeight: 800, borderRadius: '999px', px: 3, '&:hover': { bgcolor: C.forest }, '&.Mui-disabled': { bgcolor: C.mint, color: C.deep } }}>
            Refresh
          </Button>
          <Button onClick={handleExportCsv} startIcon={<FileDownloadRoundedIcon />}
            sx={{ bgcolor: '#fff', color: C.forest, textTransform: 'none', fontWeight: 800, borderRadius: '999px', px: 3, border: `1px solid ${C.line}`, '&:hover': { bgcolor: C.mint } }}>
            Export CSV
          </Button>
        </Stack>
      </Box>

      <Paper elevation={0} sx={{ ...panelSx, overflow: 'hidden' }}>
        <Tabs value={activeTab} onChange={(e, v) => { setActiveTab(v); setPage(0); setFilterStatus('All'); }} variant="scrollable" scrollButtons="auto"
          sx={{ px: 2, borderBottom: `1px solid ${C.line}`, '& .MuiTabs-indicator': { bgcolor: C.moss, height: 3, borderRadius: 3 }, '& .Mui-selected': { color: `${C.deep} !important` } }}>
          <Tab icon={<VisibilityRoundedIcon />} iconPosition="start" label={`Random sightings (${tabCounts.random})`} sx={{ fontWeight: 800, textTransform: 'none', py: 2.2, minHeight: 0 }} />
          <Tab icon={<AssessmentRoundedIcon />} iconPosition="start" label={`Census logs (${tabCounts.census})`} sx={{ fontWeight: 800, textTransform: 'none', py: 2.2, minHeight: 0 }} />
        </Tabs>

        <Box sx={{ p: { xs: 2, md: 3 }, borderBottom: `1px solid ${C.line}`, bgcolor: '#FAFBFA', display: 'grid', gap: 2 }}>
          <TextField placeholder="Search species, explorer or location" size="small" value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '999px', bgcolor: '#fff' } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon color="action" /></InputAdornment> }}
            inputProps={{ 'aria-label': 'Search observations' }} />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {statusChips.map(([key, label]) => (
              <Chip key={key} label={`${label} (${statusCounts[key]})`} clickable onClick={() => { setFilterStatus(key); setPage(0); }}
                sx={{ fontWeight: 700, bgcolor: filterStatus === key ? C.forest : '#EEF2F0', color: filterStatus === key ? '#fff' : '#475569', '&:hover': { bgcolor: filterStatus === key ? C.forest : '#E2E8F0' } }} />
            ))}
          </Stack>
        </Box>

        <TableContainer>
          <Table sx={{ minWidth: 680 }}>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: '#F4F7F6', fontWeight: 800, color: 'text.secondary', borderBottom: `1px solid ${C.line}` } }}>
                <TableCell>Date logged</TableCell>
                <TableCell>Explorer</TableCell>
                <TableCell>{activeTab === 0 ? 'Species spotted' : 'Session area'}</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Location</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                [0, 1, 2, 3, 4].map((i) => (
                  <TableRow key={i}>{[0, 1, 2, 3, 4, 5].map((j) => <TableCell key={j} sx={{ display: j === 3 ? { xs: 'none', md: 'table-cell' } : undefined }}><Skeleton width={j === 5 ? 90 : '80%'} /></TableCell>)}</TableRow>
                ))
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 9 }}>
                    <Typography sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: '1.3rem', color: C.deep }}>
                      {inTab.length === 0 ? `No ${activeTab === 0 ? 'sightings' : 'census logs'} yet` : 'Nothing matches your search'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8 }}>
                      {inTab.length === 0 ? 'New logs will appear here after researchers sync the app.' : 'Try a different word or clear the filters.'}
                    </Typography>
                    {inTab.length > 0 && (
                      <Button onClick={() => { setSearchTerm(''); setFilterStatus('All'); }} sx={{ mt: 2, textTransform: 'none', fontWeight: 800 }}>Clear filters</Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((obs) => {
                  const verified = obs.is_verified === true;
                  const census = activeTab === 1;
                  return (
                    <TableRow key={obs.id} hover onClick={() => setSelectedObs(obs)}
                      sx={{ cursor: 'pointer', borderLeft: `4px solid ${census ? C.indigo : 'transparent'}`, '&:last-child td': { border: 0 } }}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: C.deep }}>{formatDate(obs.created_at)}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>Mode: {getType(obs).replace(/_/g, ' ')}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 34, height: 34, bgcolor: colorFor(obs.explorer_name), fontSize: '.85rem', fontWeight: 700 }}>{obs.explorer_avatar}</Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{obs.explorer_name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>{census ? (obs.location_name || 'Survey area') : (obs.bird_name || 'Unknown')}</Typography>
                        {!census && <Typography variant="caption" color="text.secondary">Count: {obs.count || 1}</Typography>}
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                          <MapRoundedIcon fontSize="small" />
                          <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap>{obs.location_name || obs.location || 'GPS location'}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell><StatusChip verified={verified} /></TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()} sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="Open dossier"><IconButton onClick={() => setSelectedObs(obs)} aria-label="Open dossier" sx={{ mr: 0.5, color: C.moss, bgcolor: 'rgba(45,106,79,0.08)' }}><VisibilityRoundedIcon fontSize="small" /></IconButton></Tooltip>
                        {!verified && <Tooltip title="Verify"><IconButton onClick={() => handleVerify(obs.id)} aria-label="Verify observation" sx={{ mr: 0.5, color: '#2E7D32', bgcolor: '#E8F5E9' }}><CheckCircleRoundedIcon fontSize="small" /></IconButton></Tooltip>}
                        <Tooltip title="Delete"><IconButton onClick={() => setDeletingObs(obs)} aria-label="Delete log" sx={{ color: '#C62828', bgcolor: '#FFEBEE' }}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination component="div" count={filteredObservations.length} rowsPerPage={rowsPerPage} page={page} rowsPerPageOptions={[8, 16, 32, 64]}
          onPageChange={(e, p) => setPage(p)} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          sx={{ borderTop: `1px solid ${C.line}`, bgcolor: '#FAFBFA' }} />
      </Paper>

      {deleteDialog}
      {toastEl}
    </Box>
  );
};

export default ObservationList;