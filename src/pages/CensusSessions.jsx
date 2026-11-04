import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Button, TextField, Divider, CircularProgress, Avatar, Stack, Breadcrumbs,
  Link, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Stepper, Step, StepLabel,
  List, ListItemButton, ListItemAvatar, ListItemText, Checkbox, Tabs, Tab, Skeleton, Snackbar,
  Alert, LinearProgress, InputAdornment, GlobalStyles, useMediaQuery, useTheme,
} from '@mui/material';

// --- MAP LIBRARIES ---
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- BOUNDARY DATA ---
import { EKW_BOUNDARY } from './ekwBoundary';

// --- DATABASE CLIENT ---
import { supabase } from '../supabaseClient';

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
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded';

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

const ekwPolygonCoords = EKW_BOUNDARY && EKW_BOUNDARY.length > 0 ? EKW_BOUNDARY.map((pt) => [pt.latitude, pt.longitude]) : [];

/* ---------- helpers ---------- */
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
const titleCase = (s) => String(s).trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const fmtDate = (s) => (s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const initialsOf = (n) => (n || '?').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const AVATAR_COLORS = ['#2D6A4F', '#0369A1', '#8A6B2F', '#6B5B7B', '#1F8FA3', '#9A4D3A'];
const colorFor = (n) => AVATAR_COLORS[[...(n || '?')].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AVATAR_COLORS.length];
const methodLabel = (m) => (m === 'total_count' ? 'Line transect / total count' : m === 'point_count' ? 'Point count' : String(m || '').replace(/_/g, ' '));

const CountUp = ({ value }) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(value); return undefined; }
    let raf; const t0 = performance.now();
    const tick = (t) => { const p = Math.min(1, (t - t0) / 900); setV(Math.round(value * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{v.toLocaleString('en-IN')}</>;
};

/* ---------- map pieces ---------- */
const FitBounds = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 17 });
  }, [map, points]);
  return null;
};

const MapBox = ({ height = 420, children }) => (
  <Box sx={{ height, borderRadius: '18px', overflow: 'hidden', border: `1px solid ${C.line}`, isolation: 'isolate' }}>
    <MapContainer center={[22.56, 88.43]} zoom={13} scrollWheelZoom={false} touchZoom style={{ height: '100%', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
      {ekwPolygonCoords.length > 0 && (
        <Polygon positions={ekwPolygonCoords} pathOptions={{ color: '#0369a1', fillColor: 'transparent', weight: 2, dashArray: '5, 5' }} interactive={false} />
      )}
      {children}
    </MapContainer>
  </Box>
);

const PanelTitle = ({ icon, children, action }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
    {icon}
    <Typography sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: '1.2rem', color: C.deep, flex: 1 }}>{children}</Typography>
    {action}
  </Box>
);

const StatCard = ({ icon, value, label, tint, color, hint }) => (
  <Paper elevation={0} sx={{ ...panelSx, p: 2.5, display: 'flex', alignItems: 'center', gap: 2, borderColor: `${color}33` }}>
    <Avatar sx={{ bgcolor: tint, color, width: 52, height: 52 }}>{icon}</Avatar>
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: typeof value === 'number' ? '2.2rem' : '1.3rem', lineHeight: 1.1, letterSpacing: '-0.02em', color: C.deep }} noWrap>
        {typeof value === 'number' ? <CountUp value={value} /> : value}
      </Typography>
      <Tooltip title={hint || ''}><Typography variant="body2" sx={{ fontWeight: 700, color }}>{label}</Typography></Tooltip>
    </Box>
  </Paper>
);

/* ================= SESSION DETAIL ================= */
const SessionDetail = ({ session, userNames, onBack, onDelete }) => {
  const [images, setImages] = useState({});
  const pending = session.display_status === 'pending';

  const route = useMemo(() => {
    const r = Array.isArray(session.target_route) ? session.target_route : [];
    return r.map((p) => ({ lat: num(p?.lat), lng: num(p?.lng) })).filter((p) => p.lat !== null && p.lng !== null);
  }, [session]);
  const hasRoute = route.length >= 2;

  const analytics = useMemo(() => {
    const records = []; const counts = {}; let total = 0;
    if (!pending) {
      (session.all_logs || []).forEach((logRow) => {
        (logRow.bird_data || []).forEach((bird) => {
          const count = parseInt(bird.count, 10) || 1;
          total += count;
          const name = titleCase(bird.species || bird.birdName || bird.name || 'Unknown Species');
          counts[name] = (counts[name] || 0) + count;
          records.push({ species: name, count, lat: num(bird.lat ?? logRow.target_lat), lng: num(bird.lng ?? logRow.target_lng), logger: logRow.user_id });
        });
      });
    }
    const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return { records, total, counts, ranked, dominant: ranked[0]?.[0] || 'N/A' };
  }, [session, pending]);

  const mapPoints = useMemo(() => {
    const pts = analytics.records.filter((r) => r.lat !== null && r.lng !== null).map((r) => [r.lat, r.lng]);
    return pts.length > 0 ? pts : route.map((p) => [p.lat, p.lng]);
  }, [analytics.records, route]);

  useEffect(() => {
    let cancelled = false;
    setImages({});
    const names = Object.keys(analytics.counts);
    if (pending || names.length === 0) return undefined;
    supabase.from('birds').select('common_name, image_url').in('common_name', names).then(({ data }) => {
      if (cancelled || !data) return;
      const map = {};
      data.forEach((b) => { if (b.image_url) map[b.common_name] = b.image_url; });
      setImages(map);
    });
    return () => { cancelled = true; };
  }, [analytics.counts, pending]);

  const doneCount = session.team.filter((m) => m.status === 'completed').length;
  const maxBar = analytics.ranked[0]?.[1] || 1;

  return (
    <Box sx={{ animation: 'fadeUp .4s ease-out both' }}>
      <Breadcrumbs separator={<NavigateNextRoundedIcon fontSize="small" />} sx={{ mb: 2 }}>
        <Link component="button" onClick={onBack} color="inherit" underline="hover" sx={{ fontWeight: 600 }}>Session management</Link>
        <Typography sx={{ fontWeight: 800, color: C.moss }}>{pending ? 'Assignment details' : 'Session analytics'}</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 3 }}>
        <Box>
          <Typography component="h1" sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: { xs: '1.9rem', md: '2.8rem' }, lineHeight: 1.05, letterSpacing: '-0.03em', color: C.deep, textTransform: 'capitalize' }}>
            {session.title}
          </Typography>
          <Typography sx={{ mt: 0.8, color: 'text.secondary' }}>
            {pending ? 'Dispatched to ' : 'Completed by '}
            <b>{session.team.length > 1 ? `a team of ${session.team.length}` : session.team[0].name}</b> on {fmtDate(session.created_at)}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button startIcon={<ArrowBackRoundedIcon />} onClick={onBack} sx={{ borderRadius: '999px', textTransform: 'none', fontWeight: 800, px: 2.5, bgcolor: '#fff', border: `1px solid ${C.line}`, color: C.forest, '&:hover': { bgcolor: C.mint } }}>Back to list</Button>
          <Button startIcon={<DeleteOutlineRoundedIcon />} color="error" variant="outlined" onClick={() => onDelete(session)} sx={{ borderRadius: '999px', textTransform: 'none', fontWeight: 800, px: 2.5 }}>
            {pending ? 'Cancel assignment' : 'Delete event'}
          </Button>
        </Stack>
      </Box>

      {pending ? (
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' } }}>
          {route.length > 0 && (
            <Paper elevation={0} sx={{ ...panelSx, p: 3, gridColumn: '1 / -1' }}>
              <PanelTitle icon={<LocationOnRoundedIcon sx={{ color: '#0369a1' }} />}>Assigned target area</PanelTitle>
              <MapBox height={420}>
                <FitBounds points={route.map((p) => [p.lat, p.lng])} />
                {hasRoute ? (
                  <>
                    <Polyline positions={route.map((p) => [p.lat, p.lng])} color="#059669" weight={5} opacity={0.85} />
                    <Marker position={[route[0].lat, route[0].lng]} icon={startIcon}><Popup>Route start</Popup></Marker>
                    <Marker position={[route[route.length - 1].lat, route[route.length - 1].lng]} icon={endIcon}><Popup>Route end</Popup></Marker>
                  </>
                ) : (
                  <Marker position={[route[0].lat, route[0].lng]} icon={startIcon}><Popup>Assigned target point</Popup></Marker>
                )}
              </MapBox>
            </Paper>
          )}

          <Paper elevation={0} sx={{ ...panelSx, p: 3.5, bgcolor: '#FFFBEB', borderColor: '#FDE68A' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <AssignmentLateRoundedIcon sx={{ color: '#D97706', fontSize: 34 }} />
              <Box>
                <Typography sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: '1.3rem', color: '#92400E' }}>Dispatch overview</Typography>
                <Typography variant="body2" sx={{ color: '#B45309' }}>Waiting for the team to finish this assignment.</Typography>
              </Box>
            </Box>
            <Divider sx={{ my: 2, borderColor: '#FDE68A' }} />
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#B45309' }}>Survey method</Typography>
            <Typography sx={{ mb: 3, color: '#92400E', fontWeight: 800 }}>{methodLabel(session.methodology)}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#B45309' }}>Dispatch notes</Typography>
            <Typography sx={{ mt: 0.5, color: '#92400E', fontStyle: 'italic', bgcolor: '#FEF3C7', p: 2, borderRadius: '14px' }}>
              {session.instructions ? `"${session.instructions}"` : 'No specific instructions were provided.'}
            </Typography>
          </Paper>

          <Paper elevation={0} sx={{ ...panelSx, p: 3 }}>
            <PanelTitle>Team progress ({doneCount}/{session.team.length})</PanelTitle>
            <LinearProgress variant="determinate" value={(doneCount / session.team.length) * 100} sx={{ height: 8, borderRadius: 4, mb: 2.5, bgcolor: '#E8EFEA', '& .MuiLinearProgress-bar': { bgcolor: C.moss, borderRadius: 4 } }} />
            <Stack spacing={1.2}>
              {session.team.map((m) => (
                <Box key={m.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.4, bgcolor: '#F4F7F6', borderRadius: '14px' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                    <Avatar sx={{ width: 34, height: 34, fontSize: 13, fontWeight: 700, bgcolor: m.status === 'completed' ? '#16A34A' : colorFor(m.name) }}>{initialsOf(m.name)}</Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{m.name}</Typography>
                  </Box>
                  <Chip size="small" label={m.status === 'completed' ? 'Completed' : 'Pending'}
                    sx={{ fontWeight: 800, bgcolor: m.status === 'completed' ? '#DCFCE7' : '#FEF3C7', color: m.status === 'completed' ? '#166534' : '#B45309' }} />
                </Box>
              ))}
            </Stack>
          </Paper>
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'grid', gap: 2.5, mb: 3, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' } }}>
            <StatCard icon={<AssessmentRoundedIcon />} value={analytics.records.length} label="Total logs" tint="#EEF0F3" color="#475569" />
            <StatCard icon={<EmojiNatureRoundedIcon />} value={analytics.total} label="Total individuals" tint="#E0E7FF" color={C.indigo} />
            <StatCard icon={<TimelineRoundedIcon />} value={analytics.ranked.length} label="Distinct species" tint="#DCFCE7" color="#16A34A" hint="Species richness: how many different species were recorded." />
            <StatCard icon={<PeopleAltRoundedIcon />} value={analytics.dominant} label="Dominant species" tint="#FFEDD5" color="#EA580C" />
          </Box>

          <Box sx={{ display: 'grid', gap: 3, mb: 3, gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' } }}>
            <Paper elevation={0} sx={{ ...panelSx, p: 3 }}>
              <PanelTitle icon={<PublicRoundedIcon sx={{ color: '#0369a1' }} />}>Where the birds were seen</PanelTitle>
              <MapBox height={440}>
                <FitBounds points={mapPoints} />
                {hasRoute && (
                  <>
                    <Polyline positions={route.map((p) => [p.lat, p.lng])} color="#059669" weight={5} opacity={0.85} />
                    <Marker position={[route[0].lat, route[0].lng]} icon={startIcon}><Popup>Route start</Popup></Marker>
                    <Marker position={[route[route.length - 1].lat, route[route.length - 1].lng]} icon={endIcon}><Popup>Route end</Popup></Marker>
                  </>
                )}
                {analytics.records.map((r, i) => (r.lat === null || r.lng === null ? null : (
                  <Marker key={i} position={[r.lat, r.lng]} icon={birdIcon}><Popup><strong>{r.species}</strong><br />Count: {r.count}</Popup></Marker>
                )))}
              </MapBox>
            </Paper>

            <Paper elevation={0} sx={{ ...panelSx, p: 3 }}>
              <PanelTitle>Most recorded species</PanelTitle>
              {analytics.ranked.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No species were recorded in this session.</Typography>
              ) : (
                <Stack spacing={1.8}>
                  {analytics.ranked.slice(0, 8).map(([name, count], i) => (
                    <Box key={name}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.6 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{name}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: C.indigo }}>{count}</Typography>
                      </Box>
                      <Box sx={{ height: 10, borderRadius: 5, bgcolor: '#EEF2F0', overflow: 'hidden' }}>
                        <Box sx={{ height: '100%', width: `${(count / maxBar) * 100}%`, borderRadius: 5, background: `linear-gradient(90deg, ${C.moss}, ${C.mint})`, transformOrigin: 'left', animation: `barGrow .8s ${i * 0.07}s ease-out both` }} />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </Paper>
          </Box>

          <Paper elevation={0} sx={{ ...panelSx, overflow: 'hidden' }}>
            <Box sx={{ px: 3, pt: 3 }}><PanelTitle>All logs from the team</PanelTitle></Box>
            <TableContainer sx={{ maxHeight: 560 }}>
              <Table stickyHeader size="medium">
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: '#F4F7F6', fontWeight: 800, color: 'text.secondary' } }}>
                    <TableCell>Species</TableCell>
                    <TableCell>Count</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Logged by</TableCell>
                    <TableCell align="right">GPS location</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analytics.records.length === 0 ? (
                    <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6, color: '#64748B' }}>No bird logs were found for this session.</TableCell></TableRow>
                  ) : analytics.records.map((r, i) => (
                    <TableRow key={i} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar src={images[r.species]} sx={{ width: 36, height: 36, bgcolor: '#EEF2F0', color: C.moss, fontSize: 14, fontWeight: 700 }}>{initialsOf(r.species)}</Avatar>
                          <Typography sx={{ fontWeight: 800, color: C.deep }}>{r.species}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell><Chip label={r.count} sx={{ fontWeight: 800, bgcolor: '#EEF2FF', color: C.indigo }} /></TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}><Typography variant="body2" sx={{ fontWeight: 600 }}>{userNames.get(r.logger) || 'Unknown'}</Typography></TableCell>
                      <TableCell align="right">
                        {r.lat !== null && r.lng !== null ? (
                          <Button size="small" href={`https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`} target="_blank" rel="noopener noreferrer" startIcon={<LocationOnRoundedIcon />}
                            sx={{ textTransform: 'none', fontWeight: 700, color: '#DC2626', bgcolor: '#FEF2F2', borderRadius: '999px', px: 2, '&:hover': { bgcolor: '#FEE2E2' } }}>
                            View on Maps
                          </Button>
                        ) : <Typography variant="caption" color="text.secondary">No coordinates</Typography>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Box>
  );
};

/* ================= DISPATCH WIZARD ================= */
const steps = ['Event details', 'Methodology', 'Assign team', 'Review and dispatch'];
const methods = [
  { value: 'point_count', title: 'Point count', desc: 'The researcher stays at one point for a set time and counts every bird seen or heard.' },
  { value: 'total_count', title: 'Line transect / total count', desc: 'The researcher walks a continuous path and counts birds along the way.' },
];
const emptyForm = { title: '', methodology: 'point_count', locations: [], assigned_users: [], instructions: '' };

const DispatchDialog = ({ open, onClose, appUsers, onDispatched, notify }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [userSearch, setUserSearch] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setStep(0); setForm(emptyForm); setUserSearch(''); setError(''); } }, [open]);

  const visibleUsers = appUsers.filter((u) => (u.full_name || '').toLowerCase().includes(userSearch.toLowerCase()));
  const toggleUser = (id) => setForm((f) => ({ ...f, assigned_users: f.assigned_users.includes(id) ? f.assigned_users.filter((x) => x !== id) : [...f.assigned_users, id] }));
  const allVisibleSelected = visibleUsers.length > 0 && visibleUsers.every((u) => form.assigned_users.includes(u.id));
  const toggleAll = () => setForm((f) => {
    const ids = visibleUsers.map((u) => u.id);
    return { ...f, assigned_users: allVisibleSelected ? f.assigned_users.filter((x) => !ids.includes(x)) : [...new Set([...f.assigned_users, ...ids])] };
  });

  const next = () => {
    if (step === 0 && !form.title.trim()) { setError('Enter a title for this event to continue.'); return; }
    if (step === 2 && form.assigned_users.length === 0) { setError('Select at least one researcher to continue.'); return; }
    setError(''); setStep((s) => s + 1);
  };

  const dispatch = async () => {
    setBusy(true);
    try {
      const sharedDispatchId = `dispatch_${Date.now()}`;
      const payloads = form.assigned_users.map((userId) => ({
        title: form.title, methodology: form.methodology, user_id: userId, status: 'pending',
        target_route: form.locations, instructions: form.instructions, dispatch_id: sharedDispatchId,
      }));
      const { error: e } = await supabase.from('survey_assignments').insert(payloads);
      if (e) throw e;
      onDispatched();
    } catch (e) {
      notify(`Could not dispatch: ${e.message || e.details || 'unknown error'}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} maxWidth="md" fullWidth fullScreen={fullScreen}
      PaperProps={{ sx: { borderRadius: fullScreen ? 0 : '28px', height: fullScreen ? '100%' : '82vh', display: 'flex', flexDirection: 'column' } }}>
      <DialogTitle sx={{ p: 3, bgcolor: C.deep, color: '#fff' }}>
        <Typography sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: '1.6rem', letterSpacing: '-0.02em' }}>Dispatch a new session</Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)' }}>Create a survey task and send it to your field researchers.</Typography>
      </DialogTitle>

      <Box sx={{ px: { xs: 1, sm: 4 }, py: 2.5, borderBottom: `1px solid ${C.line}` }}>
        <Stepper activeStep={step} alternativeLabel sx={{ '& .MuiStepIcon-root.Mui-active, & .MuiStepIcon-root.Mui-completed': { color: C.moss }, '& .MuiStepLabel-label': { fontSize: { xs: '.7rem', sm: '.85rem' } } }}>
          {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
        </Stepper>
      </Box>

      <DialogContent sx={{ p: { xs: 2.5, sm: 4 }, flexGrow: 1 }}>
        {error && <Alert severity="warning" sx={{ mb: 3, borderRadius: '14px' }}>{error}</Alert>}

        {step === 0 && (
          <Box sx={{ animation: 'fadeUp .3s ease-out' }}>
            <Typography sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: '1.3rem', mb: 2.5 }}>Name this survey event</Typography>
            <TextField label="Event title or area name" placeholder="e.g. Winter wetlands north block" fullWidth autoFocus value={form.title}
              onChange={(e) => { setForm({ ...form, title: e.target.value }); setError(''); }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '14px' } }} />
          </Box>
        )}

        {step === 1 && (
          <Box sx={{ animation: 'fadeUp .3s ease-out' }}>
            <Typography sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: '1.3rem', mb: 2.5 }}>Choose the survey method</Typography>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
              {methods.map((m) => {
                const on = form.methodology === m.value;
                return (
                  <Paper key={m.value} elevation={0} role="radio" aria-checked={on} tabIndex={0}
                    onClick={() => setForm({ ...form, methodology: m.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setForm({ ...form, methodology: m.value }); } }}
                    sx={{ p: 3, cursor: 'pointer', borderRadius: '20px', border: '2px solid', borderColor: on ? C.moss : C.line, bgcolor: on ? '#EAF3EC' : '#fff', transition: 'all .2s', position: 'relative', '&:hover': { borderColor: C.moss }, '&:focus-visible': { outline: `3px solid ${C.moss}`, outlineOffset: 2 } }}>
                    {on && <CheckCircleRoundedIcon sx={{ position: 'absolute', top: 14, right: 14, color: C.moss }} />}
                    <Typography sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: '1.15rem', mb: 1, color: C.deep }}>{m.title}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>{m.desc}</Typography>
                  </Paper>
                );
              })}
            </Box>
          </Box>
        )}

        {step === 2 && (
          <Box sx={{ animation: 'fadeUp .3s ease-out' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
              <Typography sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: '1.3rem', flex: 1 }}>Assign to researchers</Typography>
              <Chip label={`${form.assigned_users.length} selected`} sx={{ fontWeight: 800, bgcolor: form.assigned_users.length ? C.mint : '#F1F5F9' }} />
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
              <TextField size="small" placeholder="Search researchers" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} sx={{ flex: 1, minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: '999px' } }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon color="action" /></InputAdornment> }} inputProps={{ 'aria-label': 'Search researchers' }} />
              <Button onClick={toggleAll} sx={{ textTransform: 'none', fontWeight: 800, color: C.moss }}>{allVisibleSelected ? 'Clear selection' : 'Select all'}</Button>
            </Box>
            <Paper variant="outlined" sx={{ borderRadius: '18px', maxHeight: 320, overflow: 'auto' }}>
              <List disablePadding>
                {visibleUsers.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>No researchers match your search.</Typography>}
                {visibleUsers.map((user, i) => {
                  const on = form.assigned_users.includes(user.id);
                  return (
                    <React.Fragment key={user.id}>
                      <ListItemButton onClick={() => toggleUser(user.id)} selected={on} sx={{ py: 1.2 }}>
                        <ListItemAvatar><Avatar sx={{ bgcolor: on ? C.moss : colorFor(user.full_name) }}>{initialsOf(user.full_name)}</Avatar></ListItemAvatar>
                        <ListItemText primary={<Typography sx={{ fontWeight: 700 }}>{user.full_name}</Typography>} />
                        <Checkbox edge="end" checked={on} disableRipple tabIndex={-1} sx={{ '&.Mui-checked': { color: C.moss } }} />
                      </ListItemButton>
                      {i < visibleUsers.length - 1 && <Divider />}
                    </React.Fragment>
                  );
                })}
              </List>
            </Paper>
          </Box>
        )}

        {step === 3 && (
          <Box sx={{ animation: 'fadeUp .3s ease-out' }}>
            <Typography sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: '1.3rem', mb: 2.5 }}>Final instructions</Typography>
            <TextField label="Instructions or protocol notes (optional)" multiline rows={4} fullWidth value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              placeholder="e.g. Focus on migratory waterfowl along the northern edge. Start before 6:00 AM." sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: '14px' } }} />
            <Paper elevation={0} sx={{ p: 3, bgcolor: '#F4F7F6', borderRadius: '20px', border: `1px solid ${C.line}` }}>
              <Typography sx={{ fontFamily: HEADING, fontWeight: 800, mb: 2 }}>Dispatch summary</Typography>
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                {[['Title', form.title], ['Method', methodLabel(form.methodology)], ['Location', 'Set by the researcher on site'], ['Team', `${form.assigned_users.length} member${form.assigned_users.length > 1 ? 's' : ''}`]].map(([k, v]) => (
                  <Box key={k}><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{k}</Typography><Typography sx={{ fontWeight: 700 }}>{v}</Typography></Box>
                ))}
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                {appUsers.filter((u) => form.assigned_users.includes(u.id)).map((u) => <Chip key={u.id} label={u.full_name} size="small" sx={{ fontWeight: 700 }} />)}
              </Stack>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, borderTop: `1px solid ${C.line}`, bgcolor: '#FAFBFA' }}>
        <Button disabled={step === 0 || busy} onClick={() => { setError(''); setStep((s) => s - 1); }} sx={{ textTransform: 'none', fontWeight: 800, mr: 'auto' }}>Back</Button>
        <Button onClick={onClose} disabled={busy} color="inherit" sx={{ textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
        {step === steps.length - 1 ? (
          <Button onClick={dispatch} disabled={busy} startIcon={busy ? <CircularProgress size={20} color="inherit" /> : <SendRoundedIcon />}
            sx={{ borderRadius: '999px', px: 4, py: 1.1, textTransform: 'none', fontWeight: 800, bgcolor: C.moss, color: '#fff', '&:hover': { bgcolor: C.forest }, '&.Mui-disabled': { bgcolor: C.mint, color: C.deep } }}>
            {busy ? 'Dispatching…' : 'Confirm dispatch'}
          </Button>
        ) : (
          <Button onClick={next} sx={{ borderRadius: '999px', px: 4, py: 1.1, textTransform: 'none', fontWeight: 800, bgcolor: C.moss, color: '#fff', '&:hover': { bgcolor: C.forest } }}>Next step</Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

/* ================= MAIN ================= */
const CensusSessions = () => {
  const [pendingSessions, setPendingSessions] = useState([]);
  const [completedSessions, setCompletedSessions] = useState([]);
  const [appUsers, setAppUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [mainTab, setMainTab] = useState(0);
  const [search, setSearch] = useState('');
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });

  const notify = (msg, severity = 'success') => setToast({ open: true, msg, severity });
  const userNames = useMemo(() => new Map(appUsers.map((u) => [u.id, u.full_name])), [appUsers]);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const { data: assignmentsData, error: assignmentsError } = await supabase.from('survey_assignments').select('*').order('created_at', { ascending: false });
      if (assignmentsError) throw assignmentsError;

      const { data: profilesData } = await supabase.from('app_users').select('id, full_name');
      setAppUsers(profilesData || []);
      const names = new Map((profilesData || []).map((p) => [p.id, p.full_name]));

      // Only load logs for assignments that are actually completed
      const done = assignmentsData.filter((a) => a.status === 'completed');
      const ptIds = done.filter((a) => a.methodology === 'point_count').map((a) => a.id);
      const tcIds = done.filter((a) => a.methodology === 'total_count').map((a) => a.id);
      const [{ data: ptLogs }, { data: tcLogs }] = await Promise.all([
        ptIds.length ? supabase.from('point_count_logs').select('*').in('assignment_id', ptIds) : Promise.resolve({ data: [] }),
        tcIds.length ? supabase.from('total_count_logs').select('*').in('assignment_id', tcIds) : Promise.resolve({ data: [] }),
      ]);
      const logsByAssignment = new Map();
      [...(ptLogs || []), ...(tcLogs || [])].forEach((l) => {
        if (!logsByAssignment.has(l.assignment_id)) logsByAssignment.set(l.assignment_id, []);
        logsByAssignment.get(l.assignment_id).push(l);
      });

      const groups = {};
      assignmentsData.forEach((a) => {
        const groupId = a.dispatch_id || a.id;
        if (!groups[groupId]) groups[groupId] = { ...a, group_id: groupId, team: [], all_logs: [] };
        groups[groupId].team.push({ id: a.id, name: names.get(a.user_id) || 'Unknown Explorer', status: a.status, completed_at: a.completed_at });
        if (a.status === 'completed') groups[groupId].all_logs.push(...(logsByAssignment.get(a.id) || []));
      });

      const pending = []; const completed = [];
      Object.values(groups).forEach((g) => {
        const full = g.team.every((m) => m.status === 'completed');
        g.display_status = full ? 'completed' : 'pending';
        (full ? completed : pending).push(g);
      });
      setPendingSessions(pending);
      setCompletedSessions(completed);
    } catch (err) {
      console.error('Error fetching sessions:', err.message);
      notify('Could not load sessions. Check your connection and refresh.', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => { fetchSessions(); }, []);

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    setIsDeleting(true);
    try {
      const ids = sessionToDelete.team.map((m) => m.id);
      const { error } = await supabase.from('survey_assignments').delete().in('id', ids);
      if (error) throw error;
      if (selectedSession && selectedSession.group_id === sessionToDelete.group_id) setSelectedSession(null);
      notify(sessionToDelete.display_status === 'pending' ? 'Assignment cancelled.' : 'Session deleted.');
      setSessionToDelete(null);
      fetchSessions();
    } catch (e) {
      console.error('Deletion Error:', e);
      notify(`Could not delete: ${e.message || 'unknown error'}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDispatched = () => {
    setIsAssignOpen(false);
    setMainTab(1);
    notify('Session dispatched to the team.');
    fetchSessions();
  };

  const displaySessions = (mainTab === 0 ? completedSessions : pendingSessions)
    .filter((s) => (s.title || '').toLowerCase().includes(search.toLowerCase()));
  const pendingDelete = sessionToDelete?.display_status === 'pending';

  const extras = (
    <>
      <GlobalStyles styles={`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: none } }
        @keyframes barGrow { from { transform: scaleX(0) } to { transform: scaleX(1) } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `} />
      <DispatchDialog open={isAssignOpen} onClose={() => setIsAssignOpen(false)} appUsers={appUsers} onDispatched={handleDispatched} notify={notify} />
      <Dialog open={!!sessionToDelete} onClose={() => !isDeleting && setSessionToDelete(null)} PaperProps={{ sx: { borderRadius: '24px', p: 1, maxWidth: 480 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: '#DC2626', fontFamily: HEADING, fontWeight: 800 }}>
          <WarningRoundedIcon fontSize="large" />
          {pendingDelete ? 'Cancel this assignment?' : 'Delete this session?'}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'text.secondary' }}>
            {pendingDelete
              ? "This removes the assignment from every assigned researcher's phone straight away."
              : 'This permanently deletes the session and all of its bird logs. This cannot be undone.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setSessionToDelete(null)} disabled={isDeleting} color="inherit" sx={{ textTransform: 'none', fontWeight: 700 }}>Keep it</Button>
          <Button onClick={confirmDeleteSession} variant="contained" color="error" disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} color="inherit" /> : <DeleteOutlineRoundedIcon />} sx={{ textTransform: 'none', fontWeight: 800, borderRadius: '999px', px: 3 }}>
            {isDeleting ? 'Deleting…' : pendingDelete ? 'Cancel assignment' : 'Delete session'}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast((t) => ({ ...t, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.severity} variant="filled" onClose={() => setToast((t) => ({ ...t, open: false }))} sx={{ borderRadius: '14px', fontWeight: 600 }}>{toast.msg}</Alert>
      </Snackbar>
    </>
  );

  if (selectedSession) {
    return (
      <>
        <SessionDetail session={selectedSession} userNames={userNames} onBack={() => setSelectedSession(null)} onDelete={setSessionToDelete} />
        {extras}
      </>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'flex-end' }, flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 3 }}>
        <Box>
          <Typography component="h1" sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: { xs: '2rem', md: '2.8rem' }, lineHeight: 1.05, letterSpacing: '-0.03em', color: C.deep }}>
            Session management
          </Typography>
          <Typography sx={{ mt: 0.8, color: 'text.secondary' }}>
            {isLoading ? 'Loading survey events…' : `${completedSessions.length} completed, ${pendingSessions.length} waiting on researchers.`}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button onClick={fetchSessions} disabled={isLoading} startIcon={<RefreshRoundedIcon sx={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />}
            sx={{ bgcolor: '#fff', color: C.forest, textTransform: 'none', fontWeight: 800, borderRadius: '999px', px: 3, border: `1px solid ${C.line}`, '&:hover': { bgcolor: C.mint } }}>
            Refresh
          </Button>
          <Button onClick={() => setIsAssignOpen(true)} startIcon={<AddRoundedIcon />}
            sx={{ bgcolor: C.moss, color: '#fff', textTransform: 'none', fontWeight: 800, borderRadius: '999px', px: 3.5, boxShadow: '0 10px 26px rgba(45,106,79,0.35)', '&:hover': { bgcolor: C.forest } }}>
            Assign new session
          </Button>
        </Stack>
      </Box>

      <Paper elevation={0} sx={{ ...panelSx, overflow: 'hidden' }}>
        <Tabs value={mainTab} onChange={(e, v) => setMainTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ px: 2, borderBottom: `1px solid ${C.line}`, '& .MuiTabs-indicator': { bgcolor: C.moss, height: 3, borderRadius: 3 }, '& .Mui-selected': { color: `${C.deep} !important` } }}>
          <Tab icon={<CheckCircleRoundedIcon />} iconPosition="start" label={`Completed events (${completedSessions.length})`} sx={{ fontWeight: 800, textTransform: 'none', py: 2.2, minHeight: 0 }} />
          <Tab icon={<AssignmentLateRoundedIcon />} iconPosition="start" label={`Pending assignments (${pendingSessions.length})`} sx={{ fontWeight: 800, textTransform: 'none', py: 2.2, minHeight: 0 }} />
        </Tabs>

        <Box sx={{ p: { xs: 2, md: 3 }, borderBottom: `1px solid ${C.line}`, bgcolor: '#FAFBFA' }}>
          <TextField placeholder="Search by event title" size="small" fullWidth value={search} onChange={(e) => setSearch(e.target.value)}
            sx={{ maxWidth: 420, '& .MuiOutlinedInput-root': { borderRadius: '999px', bgcolor: '#fff' } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon color="action" /></InputAdornment> }} inputProps={{ 'aria-label': 'Search sessions' }} />
        </Box>

        <TableContainer>
          <Table sx={{ minWidth: 560 }}>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: '#F4F7F6', fontWeight: 800, color: 'text.secondary', borderBottom: `1px solid ${C.line}` } }}>
                <TableCell>Session</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                [0, 1, 2, 3].map((i) => (
                  <TableRow key={i}>{[0, 1, 2, 3].map((j) => <TableCell key={j} sx={{ display: j === 1 ? { xs: 'none', sm: 'table-cell' } : undefined }}><Skeleton width={j === 3 ? 120 : '75%'} /></TableCell>)}</TableRow>
                ))
              ) : displaySessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 9 }}>
                    <Typography sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: '1.3rem', color: C.deep }}>
                      {search ? 'No sessions match your search' : mainTab === 0 ? 'No completed sessions yet' : 'No pending assignments'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8 }}>
                      {search ? 'Try a different title.' : mainTab === 0 ? 'Completed events appear here once every researcher finishes.' : 'Dispatch a new session to get a team started.'}
                    </Typography>
                    {!search && mainTab === 1 && <Button onClick={() => setIsAssignOpen(true)} sx={{ mt: 2, textTransform: 'none', fontWeight: 800 }}>Assign new session</Button>}
                  </TableCell>
                </TableRow>
              ) : (
                displaySessions.map((session) => {
                  const isPoint = session.methodology === 'point_count';
                  const isAssigned = session.display_status === 'pending';
                  const done = session.team.filter((m) => m.status === 'completed').length;
                  return (
                    <TableRow key={session.group_id} hover onClick={() => setSelectedSession(session)}
                      sx={{ cursor: 'pointer', borderLeft: `4px solid ${isAssigned ? '#F59E0B' : 'transparent'}`, '&:last-child td': { border: 0 } }}>
                      <TableCell>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar sx={{ bgcolor: isAssigned ? '#FEF3C7' : isPoint ? '#EEF2FF' : '#F0FDF4', color: isAssigned ? '#D97706' : isPoint ? C.indigo : '#166534' }}><AssessmentRoundedIcon /></Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 800, color: C.deep, textTransform: 'capitalize' }}>{session.title || methodLabel(session.methodology)}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {methodLabel(session.methodology)} | {isAssigned ? `${done} of ${session.team.length} finished` : `${session.team.length} researcher${session.team.length > 1 ? 's' : ''}`}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}><Typography variant="body2" sx={{ fontWeight: 600 }}>{fmtDate(session.created_at)}</Typography></TableCell>
                      <TableCell>
                        <Chip label={isAssigned ? 'Pending' : 'Completed'} size="small" sx={{ fontWeight: 800, bgcolor: isAssigned ? '#FEF3C7' : '#DCFCE7', color: isAssigned ? '#B45309' : '#166534' }} />
                      </TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()} sx={{ whiteSpace: 'nowrap' }}>
                        <Button size="small" onClick={() => setSelectedSession(session)}
                          sx={{ mr: 1, textTransform: 'none', fontWeight: 800, borderRadius: '999px', px: 2, bgcolor: isAssigned ? '#FEF3C7' : C.moss, color: isAssigned ? '#92400E' : '#fff', '&:hover': { bgcolor: isAssigned ? '#FDE68A' : C.forest } }}>
                          {isAssigned ? 'View details' : 'View dashboard'}
                        </Button>
                        <Tooltip title={isAssigned ? 'Cancel assignment' : 'Delete session'}>
                          <IconButton size="small" onClick={() => setSessionToDelete(session)} aria-label={isAssigned ? 'Cancel assignment' : 'Delete session'} sx={{ color: '#EF4444', bgcolor: '#FEF2F2', '&:hover': { bgcolor: '#FEE2E2' } }}>
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
      </Paper>

      {extras}
    </Box>
  );
};

export default CensusSessions;