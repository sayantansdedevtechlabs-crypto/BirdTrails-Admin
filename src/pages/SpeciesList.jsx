import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Avatar, Chip, IconButton, Button, TextField, InputAdornment, Drawer, Divider, MenuItem,
  Stack, FormControl, InputLabel, Select, TablePagination, ToggleButton, ToggleButtonGroup,
  Skeleton, Dialog, DialogContent, DialogTitle, DialogActions, DialogContentText, Tooltip,
  Snackbar, Alert, ButtonBase, GlobalStyles, CircularProgress, useMediaQuery, useTheme,
} from '@mui/material';

// --- DATABASE CLIENT ---
import { supabase } from '../supabaseClient';

// Icons
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ViewListRoundedIcon from '@mui/icons-material/ViewListRounded';
import ViewModuleRoundedIcon from '@mui/icons-material/ViewModuleRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import InsertPhotoRoundedIcon from '@mui/icons-material/InsertPhotoRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';

const C = { deep: '#06180F', forest: '#1B4332', moss: '#2D6A4F', mint: '#B7E4C7', sun: '#F2C14E', line: '#E2E8F0' };
const HEADING = '"Bricolage Grotesque", sans-serif';

const conservationStatuses = ['Least Concern (LC)', 'Near Threatened (NT)', 'Vulnerable (VU)', 'Endangered (EN)', 'Critically Endangered (CR)'];
const migratoryStatuses = ['Resident', 'Migratory', 'Winter', 'Passage', 'Vagrant'];
const genderOptions = ['Male', 'Female', 'Juvenile', 'Non-Breeding', 'Unknown'];

const initialFormState = {
  common_name: '', scientific_name: '', bengali_name: '', family: '', category: '',
  iucn_status: 'Least Concern (LC)', wpa_schedule: '', status: 'Resident', size_approx: '',
  description: '', male_description: '', female_description: '', distribution: '',
  subspecies: '', similar_species: '', note: '', image_url: '', photos: [],
};

/* ---------- helpers ---------- */
const getStatusColor = (status) => {
  if (!status) return { bg: '#F1F5F9', text: '#475569' };
  if (status.includes('Least Concern')) return { bg: '#E8F5E9', text: '#2E7D32' };
  if (status.includes('Near Threatened')) return { bg: '#FFF4D6', text: '#B45309' };
  if (status.includes('Vulnerable') || status.includes('Endangered')) return { bg: '#FFEBEE', text: '#C62828' };
  return { bg: '#F1F5F9', text: '#475569' };
};
const plainStatus = (s) => (s ? s.replace(/\s*\(.*\)/, '') : 'Unknown');
const isThreatened = (s) => !!s && (s.includes('Vulnerable') || s.includes('Endangered'));

const getPhotosForView = (bird) => {
  if (!bird) return [];
  if (bird.photos && bird.photos.length > 0) return bird.photos;
  if (bird.image_url) return [{ url: bird.image_url, gender: 'Unknown' }];
  return [];
};

/* Image with a graceful fallback (replaces the old placeholder-URL service) */
const Thumb = ({ src, alt, sx }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) {
    return (
      <Box sx={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: `linear-gradient(160deg, ${C.moss}, ${C.deep})`, ...sx }}>
        <InsertPhotoRoundedIcon sx={{ fontSize: 44, color: 'rgba(255,255,255,0.45)' }} />
      </Box>
    );
  }
  return <Box component="img" src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...sx }} />;
};

const StatusChip = ({ status, sx }) => {
  const c = getStatusColor(status);
  return <Chip label={plainStatus(status)} size="small" sx={{ bgcolor: c.bg, color: c.text, fontWeight: 800, ...sx }} />;
};

const panelSx = { borderRadius: '24px', border: `1px solid ${C.line}`, boxShadow: '0 6px 28px rgba(6,24,15,0.04)', bgcolor: '#fff' };

/* ---------- Species card ---------- */
const SpeciesCard = ({ bird, index, onView, onEdit, onDelete }) => {
  const photoCount = getPhotosForView(bird).length;
  return (
    <Paper
      elevation={0}
      sx={{
        ...panelSx, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%',
        animation: `cardIn .45s ${Math.min(index, 8) * 0.05}s ease-out both`,
        transition: 'transform .3s ease, box-shadow .3s ease',
        '&:hover, &:focus-within': { transform: 'translateY(-6px)', boxShadow: '0 20px 48px rgba(6,24,15,0.14)' },
        '&:hover .zoom, &:focus-within .zoom': { transform: 'scale(1.07)' },
        '&:hover .peek, &:focus-within .peek': { transform: 'none', opacity: 1 },
        '@media (hover: none)': { '& .peek': { display: 'none' } },
      }}
    >
      <ButtonBase onClick={() => onView(bird)} aria-label={`View details for ${bird.common_name}`}
        sx={{ display: 'block', position: 'relative', width: '100%', aspectRatio: '4 / 3', overflow: 'hidden', '&.Mui-focusVisible': { outline: `3px solid ${C.moss}`, outlineOffset: -3 } }}>
        <Box className="zoom" sx={{ position: 'absolute', inset: 0, transition: 'transform .6s ease' }}>
          <Thumb src={bird.image_url} alt={bird.common_name} />
        </Box>
        <StatusChip status={bird.iucn_status} sx={{ position: 'absolute', top: 12, left: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} />
        {photoCount > 1 && (
          <Chip icon={<InsertPhotoRoundedIcon sx={{ color: '#fff !important' }} fontSize="small" />} label={photoCount} size="small"
            sx={{ position: 'absolute', top: 12, right: 12, bgcolor: 'rgba(6,24,15,0.7)', color: '#fff', fontWeight: 700 }} />
        )}
        <Box className="peek" sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, p: 2, textAlign: 'left', color: '#fff', background: 'linear-gradient(transparent, rgba(6,24,15,0.94) 40%)', transform: 'translateY(30%)', opacity: 0, transition: 'transform .35s ease, opacity .35s ease' }}>
          {(bird.family || bird.size_approx) && (
            <Typography variant="caption" sx={{ display: 'block', color: C.mint, fontWeight: 700, mb: 0.5 }}>
              {[bird.family, bird.size_approx].filter(Boolean).join('  |  ')}
            </Typography>
          )}
          <Typography variant="body2" sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5, color: 'rgba(255,255,255,0.92)' }}>
            {bird.description || 'No description yet. Open the details to add one.'}
          </Typography>
        </Box>
      </ButtonBase>

      <Box sx={{ p: 2.5, flexGrow: 1 }}>
        <Typography sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: '1.2rem', lineHeight: 1.2, letterSpacing: '-0.01em', color: C.deep }}>{bird.common_name}</Typography>
        <Typography variant="body2" sx={{ mt: 0.4, fontStyle: 'italic', color: 'text.secondary' }}>{bird.scientific_name}</Typography>
        {bird.bengali_name && <Typography variant="body2" sx={{ color: 'text.secondary' }}>{bird.bengali_name}</Typography>}
        <Chip label={bird.status || 'Unknown'} size="small" variant="outlined" sx={{ mt: 1.5, fontWeight: 700 }} />
      </Box>

      <Divider />
      <Stack direction="row" justifyContent="space-between" sx={{ px: 1.5, py: 1 }}>
        <Tooltip title="View details"><IconButton size="small" onClick={() => onView(bird)} aria-label={`View ${bird.common_name}`} sx={{ color: C.moss }}><VisibilityRoundedIcon fontSize="small" /></IconButton></Tooltip>
        <Box>
          <Tooltip title="Edit"><IconButton size="small" onClick={() => onEdit(bird)} aria-label={`Edit ${bird.common_name}`} sx={{ color: C.moss }}><EditRoundedIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Delete"><IconButton size="small" onClick={() => onDelete(bird)} aria-label={`Delete ${bird.common_name}`} color="error"><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></Tooltip>
        </Box>
      </Stack>
    </Paper>
  );
};

/* ---------- Details dialog with working gallery ---------- */
const DetailBlock = ({ title, children, tint }) => (
  <Box sx={{ mb: 3, ...(tint && { p: 2, borderRadius: 3, bgcolor: tint.bg }) }}>
    <Typography sx={{ fontFamily: HEADING, fontWeight: 800, mb: 0.8, color: tint?.text || C.deep }}>{title}</Typography>
    <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.8 }}>{children}</Typography>
  </Box>
);

const DetailsDialog = ({ bird, onClose, onEdit }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [idx, setIdx] = useState(0);
  const photos = getPhotosForView(bird);
  useEffect(() => setIdx(0), [bird]);
  if (!bird) return null;
  const cur = photos[idx];
  const go = (d) => setIdx((i) => (i + d + photos.length) % photos.length);

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth fullScreen={fullScreen} scroll="paper"
      PaperProps={{ sx: { borderRadius: fullScreen ? 0 : '28px', overflow: 'hidden', maxHeight: '92vh' } }}>
      <IconButton onClick={onClose} aria-label="Close" sx={{ position: 'absolute', top: 12, right: 12, zIndex: 10, bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: '#fff' } }}>
        <CloseRoundedIcon fontSize="small" />
      </IconButton>
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ position: 'relative', bgcolor: C.deep, height: { xs: 260, sm: 400 } }}>
          {cur ? <Box component="img" key={idx} src={cur.url} alt={`${bird.common_name} ${cur.gender || ''}`} sx={{ width: '100%', height: '100%', objectFit: 'contain', animation: 'fadeIn .4s ease' }} />
            : <Thumb src="" />}
          {photos.length > 1 && (
            <>
              <IconButton aria-label="Previous photo" onClick={() => go(-1)} sx={{ position: 'absolute', left: 12, top: '50%', mt: -2.5, bgcolor: 'rgba(255,255,255,0.85)', '&:hover': { bgcolor: '#fff' } }}><ChevronLeftRoundedIcon /></IconButton>
              <IconButton aria-label="Next photo" onClick={() => go(1)} sx={{ position: 'absolute', right: 12, top: '50%', mt: -2.5, bgcolor: 'rgba(255,255,255,0.85)', '&:hover': { bgcolor: '#fff' } }}><ChevronRightRoundedIcon /></IconButton>
            </>
          )}
          {cur && <Chip label={cur.gender || 'Unknown'} size="small" sx={{ position: 'absolute', left: 16, bottom: 16, bgcolor: 'rgba(6,24,15,0.75)', color: '#fff', fontWeight: 700 }} />}
        </Box>
        {photos.length > 1 && (
          <Stack direction="row" spacing={1} sx={{ p: 1.5, overflowX: 'auto', bgcolor: '#0B2218' }}>
            {photos.map((p, i) => (
              <ButtonBase key={i} onClick={() => setIdx(i)} aria-label={`Photo ${i + 1}`}
                sx={{ width: 64, height: 48, flexShrink: 0, borderRadius: 2, overflow: 'hidden', opacity: i === idx ? 1 : 0.5, outline: i === idx ? `2px solid ${C.mint}` : 'none', transition: 'opacity .2s' }}>
                <Thumb src={p.url} alt="" />
              </ButtonBase>
            ))}
          </Stack>
        )}

        <Box sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
            <StatusChip status={bird.iucn_status} />
            <Chip label={bird.status || 'Unknown status'} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
            {bird.category && <Chip label={bird.category} size="small" sx={{ bgcolor: '#F1F5F9', color: '#475569', fontWeight: 700 }} />}
          </Stack>
          <Typography component="h2" sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: { xs: '2rem', sm: '2.6rem' }, lineHeight: 1.05, letterSpacing: '-0.03em', color: C.deep }}>{bird.common_name}</Typography>
          <Typography sx={{ mt: 0.8, fontStyle: 'italic', color: 'text.secondary' }}>{bird.scientific_name}</Typography>
          {bird.bengali_name && <Typography variant="body2" sx={{ color: 'text.secondary' }}>Local name: {bird.bengali_name}</Typography>}

          <Box sx={{ my: 3, display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' } }}>
            {[['Approximate size', bird.size_approx], ['Family', bird.family], ['WPA schedule', bird.wpa_schedule]].map(([k, v]) => (
              <Box key={k} sx={{ p: 2, borderRadius: 3, bgcolor: '#F4F7F6' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>{k}</Typography>
                <Typography fontWeight={700} color={C.deep}>{v || 'N/A'}</Typography>
              </Box>
            ))}
          </Box>

          <Box sx={{ display: 'grid', columnGap: 5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            <Box>
              <DetailBlock title="General description">{bird.description || 'No description provided.'}</DetailBlock>
              {bird.distribution && <DetailBlock title="Distribution and habitat">{bird.distribution}</DetailBlock>}
              {bird.note && <DetailBlock title="Field note" tint={{ bg: '#FFFBEB', text: '#92400E' }}>{bird.note}</DetailBlock>}
            </Box>
            <Box>
              {bird.male_description && <DetailBlock title="Male appearance" tint={{ bg: '#EEF4FF', text: '#1E40AF' }}>{bird.male_description}</DetailBlock>}
              {bird.female_description && <DetailBlock title="Female appearance" tint={{ bg: '#FDF0F6', text: '#BE185D' }}>{bird.female_description}</DetailBlock>}
              {bird.similar_species && <DetailBlock title="Similar species">{bird.similar_species}</DetailBlock>}
              {bird.subspecies && <DetailBlock title="Subspecies">{bird.subspecies}</DetailBlock>}
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${C.line}` }}>
        <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none', fontWeight: 700 }}>Close</Button>
        <Button onClick={() => { onClose(); onEdit(bird); }} variant="contained" startIcon={<EditRoundedIcon />} sx={{ textTransform: 'none', fontWeight: 800, borderRadius: '999px', px: 3, bgcolor: C.moss }}>Edit species</Button>
      </DialogActions>
    </Dialog>
  );
};

const FormSection = ({ title, children }) => (
  <Box>
    <Typography sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: '1.1rem', color: C.deep, mb: 2 }}>{title}</Typography>
    {children}
  </Box>
);
const twoCol = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } };

/* ================= MAIN ================= */
const SpeciesList = () => {
  const [speciesData, setSpeciesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [viewMode, setViewMode] = useState('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [migFilter, setMigFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingBird, setEditingBird] = useState(null);
  const [viewingBird, setViewingBird] = useState(null);
  const [deletingBird, setDeletingBird] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });
  const [formData, setFormData] = useState(initialFormState);

  const notify = (msg, severity = 'success') => setToast({ open: true, msg, severity });

  // 1. FETCH DATA
  const fetchSpecies = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.from('birds').select('*').order('common_name', { ascending: true });
      if (error) throw error;
      if (data) setSpeciesData(data);
    } catch (error) {
      console.error('Error fetching birds:', error.message);
      notify('Could not load the bird list. Check your connection and refresh.', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => { fetchSpecies(); }, []);

  // 2. DRAWER
  const handleOpenDrawer = (bird = null) => {
    if (bird) {
      setEditingBird(bird);
      let photos = bird.photos || [];
      if (photos.length === 0 && bird.image_url) photos = [{ id: 'legacy', url: bird.image_url, gender: 'Unknown', file: null }];
      const next = { ...initialFormState };
      Object.keys(initialFormState).forEach((k) => { if (k !== 'photos' && bird[k] != null) next[k] = bird[k]; });
      setFormData({ ...next, photos });
    } else {
      setEditingBird(null);
      setFormData(initialFormState);
    }
    setIsDrawerOpen(true);
  };
  const handleCloseDrawer = () => { if (!isUploading) setIsDrawerOpen(false); };

  const setField = (name) => (e) => setFormData((p) => ({ ...p, [name]: e.target.value }));
  const text = (name, label, props = {}) => (
    <TextField label={label} value={formData[name]} onChange={setField(name)} fullWidth {...props} />
  );

  // Photo blocks
  const handleAddPhotoBlock = () => setFormData((p) => ({ ...p, photos: [...p.photos, { id: Date.now().toString(), file: null, url: '', gender: 'Male' }] }));
  const handleRemovePhotoBlock = (i) => setFormData((p) => {
    const photos = [...p.photos];
    if (photos[i].preview) URL.revokeObjectURL(photos[i].preview);
    photos.splice(i, 1);
    return { ...p, photos };
  });
  const handlePhotoFileChange = (i, file) => {
    if (!file) return;
    setFormData((p) => {
      const photos = [...p.photos];
      if (photos[i].preview) URL.revokeObjectURL(photos[i].preview);
      photos[i] = { ...photos[i], file, url: '', preview: URL.createObjectURL(file) };
      return { ...p, photos };
    });
  };
  const handlePhotoGenderChange = (i, gender) => setFormData((p) => {
    const photos = [...p.photos]; photos[i] = { ...photos[i], gender }; return { ...p, photos };
  });

  // 3. SAVE
  const handleSave = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      const uploadedPhotos = await Promise.all(formData.photos.map(async (photo) => {
        if (photo.file) {
          const fileExt = photo.file.name.split('.').pop();
          const filePath = `thumbnails/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('bird_images').upload(filePath, photo.file);
          if (uploadError) throw uploadError;
          const { data: pub } = supabase.storage.from('bird_images').getPublicUrl(filePath);
          return { url: pub.publicUrl, gender: photo.gender };
        }
        return { url: photo.url, gender: photo.gender };
      }));

      const dataToSave = { ...formData, image_url: uploadedPhotos.length > 0 ? uploadedPhotos[0].url : '', photos: uploadedPhotos };
      if (editingBird) {
        const { error } = await supabase.from('birds').update(dataToSave).eq('id', editingBird.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('birds').insert([dataToSave]);
        if (error) throw error;
      }
      await fetchSpecies();
      setIsDrawerOpen(false);
      notify(editingBird ? `${formData.common_name} updated.` : `${formData.common_name} added to the directory.`);
    } catch (error) {
      console.error('Error saving:', error.message);
      notify('Could not save this species. Please try again.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // 4. DELETE
  const confirmDelete = async () => {
    if (!deletingBird) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('birds').delete().eq('id', deletingBird.id);
      if (error) throw error;
      setSpeciesData((d) => d.filter((b) => b.id !== deletingBird.id));
      notify(`${deletingBird.common_name} deleted.`);
      setDeletingBird(null);
    } catch (error) {
      console.error('Error deleting:', error.message);
      notify('Could not delete this species. Please try again.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtering
  const counts = useMemo(() => ({
    all: speciesData.length,
    lc: speciesData.filter((b) => (b.iucn_status || '').includes('Least Concern')).length,
    nt: speciesData.filter((b) => (b.iucn_status || '').includes('Near Threatened')).length,
    threatened: speciesData.filter((b) => isThreatened(b.iucn_status)).length,
  }), [speciesData]);

  const filteredSpecies = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return speciesData.filter((b) => {
      const matchText = (b.common_name || '').toLowerCase().includes(q) || (b.scientific_name || '').toLowerCase().includes(q) || (b.bengali_name || '').toLowerCase().includes(q);
      const s = b.iucn_status || '';
      const matchStatus = statusFilter === 'all' || (statusFilter === 'lc' && s.includes('Least Concern')) || (statusFilter === 'nt' && s.includes('Near Threatened')) || (statusFilter === 'threatened' && isThreatened(s));
      const matchMig = migFilter === 'all' || b.status === migFilter;
      return matchText && matchStatus && matchMig;
    });
  }, [speciesData, searchTerm, statusFilter, migFilter]);

  const paginated = filteredSpecies.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const filtersActive = searchTerm || statusFilter !== 'all' || migFilter !== 'all';
  const clearFilters = () => { setSearchTerm(''); setStatusFilter('all'); setMigFilter('all'); setPage(0); };

  const filterChips = [
    ['all', 'All', counts.all], ['lc', 'Least concern', counts.lc], ['nt', 'Near threatened', counts.nt], ['threatened', 'Threatened', counts.threatened],
  ];

  return (
    <Box>
      <GlobalStyles styles={`
        @keyframes cardIn { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: none } }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `} />

      {/* HEADER */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'flex-end' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
        <Box>
          <Typography component="h1" sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: { xs: '2rem', md: '2.8rem' }, lineHeight: 1.05, letterSpacing: '-0.03em', color: C.deep }}>
            Bird directory
          </Typography>
          <Typography sx={{ mt: 0.8, color: 'text.secondary' }}>
            {isLoading ? 'Loading the master database…' : `${speciesData.length} identified species, ${counts.threatened} of them threatened.`}
          </Typography>
        </Box>
        <Button onClick={() => handleOpenDrawer()} startIcon={<AddRoundedIcon />}
          sx={{ bgcolor: C.moss, color: '#fff', textTransform: 'none', fontWeight: 800, borderRadius: '999px', px: 3.5, py: 1.3, boxShadow: '0 10px 26px rgba(45,106,79,0.35)', transition: 'transform .2s', '&:hover': { bgcolor: C.forest, transform: 'translateY(-2px)' } }}>
          Add species
        </Button>
      </Box>

      {/* TOOLBAR */}
      <Paper elevation={0} sx={{ ...panelSx, p: { xs: 2, md: 2.5 }, mb: 3, display: 'grid', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="Search by English, scientific or Bengali name" size="small" value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
            sx={{ flex: '1 1 280px', '& .MuiOutlinedInput-root': { borderRadius: '999px', bgcolor: '#F4F7F6' } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon color="action" /></InputAdornment> }}
            inputProps={{ 'aria-label': 'Search species' }}
          />
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel>Migratory status</InputLabel>
            <Select value={migFilter} label="Migratory status" onChange={(e) => { setMigFilter(e.target.value); setPage(0); }} sx={{ borderRadius: '999px' }}>
              <MenuItem value="all">All</MenuItem>
              {migratoryStatuses.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
          <ToggleButtonGroup value={viewMode} exclusive size="small" onChange={(e, m) => m && setViewMode(m)} aria-label="View mode"
            sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 700, px: 2, border: `1px solid ${C.line}`, '&.Mui-selected': { bgcolor: C.forest, color: '#fff', '&:hover': { bgcolor: C.forest } } }, '& .MuiToggleButtonGroup-grouped:first-of-type': { borderRadius: '999px 0 0 999px' }, '& .MuiToggleButtonGroup-grouped:last-of-type': { borderRadius: '0 999px 999px 0' } }}>
            <ToggleButton value="table"><ViewListRoundedIcon sx={{ mr: 1 }} />Table</ToggleButton>
            <ToggleButton value="card"><ViewModuleRoundedIcon sx={{ mr: 1 }} />Cards</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          {filterChips.map(([key, label, n]) => (
            <Chip key={key} label={`${label} (${n})`} onClick={() => { setStatusFilter(key); setPage(0); }} clickable
              sx={{ fontWeight: 700, bgcolor: statusFilter === key ? C.forest : '#F1F5F9', color: statusFilter === key ? '#fff' : '#475569', '&:hover': { bgcolor: statusFilter === key ? C.forest : '#E2E8F0' } }} />
          ))}
          {filtersActive && <Button size="small" onClick={clearFilters} sx={{ textTransform: 'none', fontWeight: 700 }}>Clear filters</Button>}
        </Stack>
      </Paper>

      {/* CONTENT */}
      {isLoading ? (
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' } }}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} variant="rounded" height={340} sx={{ borderRadius: '24px' }} />)}
        </Box>
      ) : filteredSpecies.length === 0 ? (
        <Paper elevation={0} sx={{ ...panelSx, p: 8, textAlign: 'center' }}>
          <Typography sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: '1.5rem', color: C.deep }}>
            {speciesData.length === 0 ? 'No species yet' : 'No birds match your search'}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
            {speciesData.length === 0 ? 'Add the first species to start the directory.' : 'Try a different name or clear the filters.'}
          </Typography>
          {speciesData.length === 0
            ? <Button variant="contained" onClick={() => handleOpenDrawer()} sx={{ bgcolor: C.moss, borderRadius: '999px', textTransform: 'none', fontWeight: 800, px: 3 }}>Add species</Button>
            : <Button variant="outlined" onClick={clearFilters} sx={{ borderRadius: '999px', textTransform: 'none', fontWeight: 800, px: 3 }}>Clear filters</Button>}
        </Paper>
      ) : (
        <>
          {viewMode === 'card' && (
            <Box sx={{ display: 'grid', gap: 3, mb: 3, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' } }}>
              {paginated.map((bird, i) => (
                <SpeciesCard key={bird.id} bird={bird} index={i} onView={setViewingBird} onEdit={handleOpenDrawer} onDelete={setDeletingBird} />
              ))}
            </Box>
          )}

          {viewMode === 'table' && (
            <Paper elevation={0} sx={{ ...panelSx, overflow: 'hidden', mb: 3 }}>
              <TableContainer>
                <Table sx={{ minWidth: 640 }}>
                  <TableHead>
                    <TableRow sx={{ '& th': { bgcolor: '#F4F7F6', fontWeight: 800, color: 'text.secondary', borderBottom: `1px solid ${C.line}` } }}>
                      <TableCell>Species</TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Category and migratory status</TableCell>
                      <TableCell>Conservation</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginated.map((bird) => (
                      <TableRow key={bird.id} hover onClick={() => setViewingBird(bird)} sx={{ cursor: 'pointer', '&:last-child td': { border: 0 } }}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar src={bird.image_url} variant="rounded" sx={{ width: 52, height: 52, borderRadius: '14px', bgcolor: C.moss }}><InsertPhotoRoundedIcon /></Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography sx={{ fontWeight: 800, color: C.deep }}>{bird.common_name}</Typography>
                              <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                                {bird.scientific_name}{bird.bengali_name && ` | ${bird.bengali_name}`}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{bird.category || 'N/A'}</Typography>
                          <Typography variant="caption" color="text.secondary">{bird.status}</Typography>
                        </TableCell>
                        <TableCell><StatusChip status={bird.iucn_status} /></TableCell>
                        <TableCell align="right" onClick={(e) => e.stopPropagation()} sx={{ whiteSpace: 'nowrap' }}>
                          <Tooltip title="View details"><IconButton onClick={() => setViewingBird(bird)} aria-label={`View ${bird.common_name}`} sx={{ mr: 0.5, color: C.moss, bgcolor: 'rgba(45,106,79,0.08)' }}><VisibilityRoundedIcon fontSize="small" /></IconButton></Tooltip>
                          <Tooltip title="Edit"><IconButton onClick={() => handleOpenDrawer(bird)} aria-label={`Edit ${bird.common_name}`} sx={{ mr: 0.5, color: C.moss, bgcolor: 'rgba(45,106,79,0.08)' }}><EditRoundedIcon fontSize="small" /></IconButton></Tooltip>
                          <Tooltip title="Delete"><IconButton onClick={() => setDeletingBird(bird)} aria-label={`Delete ${bird.common_name}`} color="error" sx={{ bgcolor: '#FFEBEE' }}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          <TablePagination
            component={Paper} elevation={0} count={filteredSpecies.length} rowsPerPage={rowsPerPage} page={page} rowsPerPageOptions={[8, 12, 24, 48]}
            onPageChange={(e, p) => setPage(p)} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            sx={{ ...panelSx }}
          />
        </>
      )}

      {/* DETAILS */}
      <DetailsDialog bird={viewingBird} onClose={() => setViewingBird(null)} onEdit={handleOpenDrawer} />

      {/* DELETE CONFIRM */}
      <Dialog open={!!deletingBird} onClose={() => !isDeleting && setDeletingBird(null)} PaperProps={{ sx: { borderRadius: '24px', p: 1 } }}>
        <DialogTitle sx={{ fontFamily: HEADING, fontWeight: 800 }}>Delete {deletingBird?.common_name}?</DialogTitle>
        <DialogContent>
          <DialogContentText>This removes the species and its photo links from the directory. This cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeletingBird(null)} disabled={isDeleting} color="inherit" sx={{ textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
          <Button onClick={confirmDelete} disabled={isDeleting} variant="contained" color="error" sx={{ textTransform: 'none', fontWeight: 800, borderRadius: '999px', px: 3 }}>
            {isDeleting ? <CircularProgress size={22} color="inherit" /> : 'Delete species'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ADD / EDIT DRAWER */}
      <Drawer anchor="right" open={isDrawerOpen} onClose={handleCloseDrawer} PaperProps={{ sx: { width: { xs: '100%', sm: 620 }, display: 'flex', flexDirection: 'column' } }}>
        <Box sx={{ px: 3, py: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: C.deep, color: '#fff' }}>
          <Typography sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-0.01em' }}>{editingBird ? `Edit ${editingBird.common_name}` : 'Add new species'}</Typography>
          <IconButton onClick={handleCloseDrawer} disabled={isUploading} aria-label="Close form" sx={{ color: '#fff' }}><CloseRoundedIcon /></IconButton>
        </Box>

        <Box component="form" id="species-form" onSubmit={handleSave}
          sx={{ p: 3, flex: 1, overflowY: 'auto', '& .MuiOutlinedInput-root': { borderRadius: '14px' } }}>
          <Stack spacing={4}>
            <FormSection title="Photos">
              {formData.photos.map((photo, index) => (
                <Box key={photo.id || index} sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, p: 2, bgcolor: '#F4F7F6', border: `1px solid ${C.line}`, borderRadius: '18px' }}>
                  <Avatar src={photo.preview || photo.url} variant="rounded" sx={{ width: 76, height: 76, borderRadius: '14px', bgcolor: C.line }}><InsertPhotoRoundedIcon sx={{ color: '#94A3B8' }} /></Avatar>
                  <Stack spacing={1.5} flex={1}>
                    <Button variant="outlined" component="label" size="small" sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 700, borderRadius: '12px' }}>
                      {photo.url || photo.file ? 'Change photo' : 'Upload photo'}
                      <input type="file" hidden accept="image/*" onChange={(e) => handlePhotoFileChange(index, e.target.files[0])} />
                    </Button>
                    <FormControl size="small" fullWidth>
                      <Select value={photo.gender} onChange={(e) => handlePhotoGenderChange(index, e.target.value)} sx={{ bgcolor: '#fff' }} inputProps={{ 'aria-label': 'Photo subject' }}>
                        {genderOptions.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Stack>
                  <Tooltip title="Remove photo"><IconButton color="error" onClick={() => handleRemovePhotoBlock(index)} aria-label="Remove photo" sx={{ alignSelf: 'flex-start' }}><DeleteOutlineRoundedIcon /></IconButton></Tooltip>
                </Box>
              ))}
              <Button startIcon={<AddRoundedIcon />} onClick={handleAddPhotoBlock} fullWidth
                sx={{ border: '1.5px dashed #CBD5E1', color: '#64748B', py: 1.5, borderRadius: '16px', textTransform: 'none', fontWeight: 700, '&:hover': { borderColor: C.moss, color: C.moss, bgcolor: 'rgba(45,106,79,0.05)' } }}>
                Add a photo
              </Button>
            </FormSection>

            <Divider />
            <FormSection title="Names and family">
              <Box sx={twoCol}>
                {text('common_name', 'Common name', { required: true })}
                {text('scientific_name', 'Scientific name', { sx: { input: { fontStyle: 'italic' } } })}
                {text('bengali_name', 'Local Bengali name')}
                {text('family', 'Family')}
              </Box>
            </FormSection>

            <Divider />
            <FormSection title="Classification and status">
              <Box sx={twoCol}>
                {text('category', 'Category (for example, Warbler)')}
                {text('size_approx', 'Approximate size', { placeholder: 'e.g. 15 cm' })}
                <FormControl fullWidth required>
                  <InputLabel>Migratory status</InputLabel>
                  <Select value={formData.status} label="Migratory status" onChange={setField('status')}>
                    {migratoryStatuses.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth required>
                  <InputLabel>Conservation (IUCN)</InputLabel>
                  <Select value={formData.iucn_status} label="Conservation (IUCN)" onChange={setField('iucn_status')}>
                    {conservationStatuses.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ mt: 2 }}>{text('wpa_schedule', 'WPA schedule', { placeholder: 'e.g. Schedule I' })}</Box>
            </FormSection>

            <Divider />
            <FormSection title="Identification">
              <Stack spacing={2}>
                {text('description', 'General description', { multiline: true, rows: 3 })}
                {text('male_description', 'Male appearance', { multiline: true, rows: 2 })}
                {text('female_description', 'Female appearance', { multiline: true, rows: 2 })}
                {text('similar_species', 'Similar species')}
                {text('subspecies', 'Subspecies')}
              </Stack>
            </FormSection>

            <Divider />
            <FormSection title="Ecology and notes">
              <Stack spacing={2}>
                {text('distribution', 'Distribution and habitat', { multiline: true, rows: 2 })}
                {text('note', 'Internal note or behavior', { multiline: true, rows: 2 })}
              </Stack>
            </FormSection>
          </Stack>
        </Box>

        <Box sx={{ px: 3, py: 2, display: 'flex', gap: 2, justifyContent: 'flex-end', borderTop: `1px solid ${C.line}`, bgcolor: '#fff' }}>
          <Button onClick={handleCloseDrawer} disabled={isUploading} color="inherit" sx={{ textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
          <Button type="submit" form="species-form" disabled={isUploading}
            sx={{ px: 4, py: 1.1, borderRadius: '999px', textTransform: 'none', fontWeight: 800, bgcolor: C.moss, color: '#fff', '&:hover': { bgcolor: C.forest }, '&.Mui-disabled': { bgcolor: C.mint, color: C.deep } }}>
            {isUploading ? <CircularProgress size={22} color="inherit" /> : 'Save species'}
          </Button>
        </Box>
      </Drawer>

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast((t) => ({ ...t, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.severity} variant="filled" onClose={() => setToast((t) => ({ ...t, open: false }))} sx={{ borderRadius: '14px', fontWeight: 600 }}>{toast.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default SpeciesList;