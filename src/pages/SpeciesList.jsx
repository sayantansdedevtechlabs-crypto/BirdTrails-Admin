import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Avatar, Chip, IconButton, Button, TextField, 
  InputAdornment, Drawer, Divider, MenuItem, Stack, FormControl, InputLabel, 
  Select, TablePagination, ToggleButton, ToggleButtonGroup, Grid, Card, 
  CardMedia, CardContent, CardActions, CircularProgress, Dialog, DialogContent, Tooltip
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

const conservationStatuses = ['Least Concern (LC)', 'Near Threatened (NT)', 'Vulnerable (VU)', 'Endangered (EN)', 'Critically Endangered (CR)'];
const migratoryStatuses = ['Resident', 'Migratory', 'Winter', 'Passage', 'Vagrant'];
const genderOptions = ['Male', 'Female', 'Juvenile', 'Non-Breeding', 'Unknown'];

const SpeciesList = () => {
  const [speciesData, setSpeciesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  const [viewMode, setViewMode] = useState('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0); 
  const [rowsPerPage, setRowsPerPage] = useState(8); 
  
  // Edit Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingBird, setEditingBird] = useState(null); 
  
  // View Details Modal State
  const [viewingBird, setViewingBird] = useState(null);

  const initialFormState = { 
    common_name: '', scientific_name: '', bengali_name: '', family: '', category: '', 
    iucn_status: 'Least Concern (LC)', wpa_schedule: '', status: 'Resident', size_approx: '', 
    description: '', male_description: '', female_description: '', distribution: '', 
    subspecies: '', similar_species: '', note: '', image_url: '', photos: [] 
  };
  const [formData, setFormData] = useState(initialFormState);

  // 1. FETCH DATA ON LOAD
  useEffect(() => {
    fetchSpecies();
  }, []);

  const fetchSpecies = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.from('birds').select('*').order('common_name', { ascending: true });
      
      if (error) throw error;
      if (data) setSpeciesData(data);
    } catch (error) {
      console.error('Error fetching birds:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. MODAL & DRAWER HANDLERS
  const handleOpenDetails = (bird) => setViewingBird(bird);
  const handleCloseDetails = () => setViewingBird(null);

  const handleOpenDrawer = (bird = null) => {
    if (bird) { 
      setEditingBird(bird);
      
      let initialPhotos = bird.photos || [];
      if (initialPhotos.length === 0 && bird.image_url) {
          initialPhotos = [{ id: 'legacy', url: bird.image_url, gender: 'Unknown', file: null }];
      }

      setFormData({
        common_name: bird.common_name || '',
        scientific_name: bird.scientific_name || '',
        bengali_name: bird.bengali_name || '',
        family: bird.family || '',
        category: bird.category || '',
        iucn_status: bird.iucn_status || 'Least Concern (LC)',
        wpa_schedule: bird.wpa_schedule || '',
        status: bird.status || 'Resident',
        size_approx: bird.size_approx || '',
        description: bird.description || '',
        male_description: bird.male_description || '',
        female_description: bird.female_description || '',
        distribution: bird.distribution || '',
        subspecies: bird.subspecies || '',
        similar_species: bird.similar_species || '',
        note: bird.note || '',
        image_url: bird.image_url || '',
        photos: initialPhotos
      }); 
    } else { 
      setEditingBird(null); 
      setFormData(initialFormState); 
    }
    setIsDrawerOpen(true);
  };
  
  const handleCloseDrawer = () => setIsDrawerOpen(false);

  // --- MULTI-PHOTO HANDLERS ---
  const handleAddPhotoBlock = () => {
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, { id: Date.now().toString(), file: null, url: '', gender: 'Male' }]
    }));
  };

  const handleRemovePhotoBlock = (index) => {
    const updated = [...formData.photos];
    updated.splice(index, 1);
    setFormData({ ...formData, photos: updated });
  };

  const handlePhotoFileChange = (index, file) => {
    if (!file) return;
    const updated = [...formData.photos];
    updated[index].file = file;
    updated[index].url = ''; 
    setFormData({ ...formData, photos: updated });
  };

  const handlePhotoGenderChange = (index, gender) => {
    const updated = [...formData.photos];
    updated[index].gender = gender;
    setFormData({ ...formData, photos: updated });
  };

  // 3. SAVE TO DATABASE
  const handleSave = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      const uploadedPhotos = await Promise.all(formData.photos.map(async (photo) => {
        if (photo.file) {
          const fileExt = photo.file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random()}.${fileExt}`;
          const filePath = `thumbnails/${fileName}`; 

          const { error: uploadError } = await supabase.storage.from('bird_images').upload(filePath, photo.file);
          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage.from('bird_images').getPublicUrl(filePath);
          return { url: publicUrlData.publicUrl, gender: photo.gender };
        }
        return { url: photo.url, gender: photo.gender };
      }));

      const primaryImageUrl = uploadedPhotos.length > 0 ? uploadedPhotos[0].url : '';

      const dataToSave = { 
        ...formData, 
        image_url: primaryImageUrl, 
        photos: uploadedPhotos 
      };

      if (editingBird) {
        const { error } = await supabase.from('birds').update(dataToSave).eq('id', editingBird.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('birds').insert([dataToSave]);
        if (error) throw error;
      }
      
      fetchSpecies(); 
      handleCloseDrawer();
      
    } catch (error) {
      console.error('Error saving:', error.message);
      alert('Failed to save the bird. Check console for details.');
    } finally {
      setIsUploading(false);
    }
  };

  // 4. DELETE FROM DATABASE
  const confirmDelete = async (id) => {
    if(!window.confirm("Are you sure you want to delete this species?")) return;
    try {
      const { error } = await supabase.from('birds').delete().eq('id', id);
      if (error) throw error;
      setSpeciesData(speciesData.filter(b => b.id !== id));
    } catch (error) {
      console.error('Error deleting:', error.message);
    }
  };

  // --- UI HELPERS ---
  const getStatusColor = (status) => {
    if (!status) return { bg: '#F5F5F5', text: '#616161' };
    if (status.includes('Least Concern')) return { bg: '#E8F5E9', text: '#2E7D32' };
    if (status.includes('Near Threatened')) return { bg: '#FFF8E1', text: '#F57F17' };
    if (status.includes('Vulnerable') || status.includes('Endangered')) return { bg: '#FFEBEE', text: '#C62828' };
    return { bg: '#F5F5F5', text: '#616161' };
  };

  const filteredSpecies = speciesData.filter(bird => {
    const searchString = searchTerm.toLowerCase();
    return (
      (bird.common_name || '').toLowerCase().includes(searchString) || 
      (bird.scientific_name || '').toLowerCase().includes(searchString) ||
      (bird.bengali_name || '').toLowerCase().includes(searchString)
    );
  });

  const paginatedSpecies = filteredSpecies.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const getPhotosForView = (bird) => {
     if (!bird) return [];
     if (bird.photos && bird.photos.length > 0) return bird.photos;
     if (bird.image_url) return [{ url: bird.image_url, gender: 'Unknown' }];
     return [];
  };

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.dark', mb: 0.5 }}>Species Directory</Typography>
          <Typography variant="body1" color="text.secondary">Manage the master database of {speciesData.length} identified birds.</Typography>
        </Box>
        <Button 
          variant="contained" color="primary" startIcon={<AddRoundedIcon />} 
          onClick={() => handleOpenDrawer()}
          sx={{ borderRadius: 2, px: 3, py: 1.5, fontWeight: 700, boxShadow: '0 4px 14px rgba(27, 67, 50, 0.3)' }}
        >
          Add Species
        </Button>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <TextField
          placeholder="Search by English, Scientific, or Bengali name..." variant="outlined" size="small"
          value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setPage(0);}}
          sx={{ minWidth: '350px', backgroundColor: 'white', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon color="action" /></InputAdornment> }}
        />
        
        <ToggleButtonGroup value={viewMode} exclusive onChange={(e, newMode) => { if(newMode) setViewMode(newMode); }} size="small" sx={{ backgroundColor: 'white' }}>
          <ToggleButton value="table" sx={{ px: 2 }}><ViewListRoundedIcon sx={{ mr: 1 }}/> Table</ToggleButton>
          <ToggleButton value="card" sx={{ px: 2 }}><ViewModuleRoundedIcon sx={{ mr: 1 }}/> Cards</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : (
        <>
          {/* CARDS VIEW WITH HOVER POP-UP WINDOW */}
          {viewMode === 'card' && (
            <Grid container spacing={3} sx={{ mb: 3 }}>
              {paginatedSpecies.map((bird) => {
                const statusColor = getStatusColor(bird.iucn_status);
                const photoCount = bird.photos ? bird.photos.length : (bird.image_url ? 1 : 0);
                
                return (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={bird.id}>
                    <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                      
                      {/* ➤ THE MUI HOVER POP-UP TOOLTIP */}
                      <Tooltip 
                        placement="top" 
                        arrow 
                        enterDelay={300} // Slight delay so it doesn't pop up instantly when sweeping the mouse
                        title={
                          <Box sx={{ p: 1, maxWidth: 260 }}>
                             <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, borderBottom: '1px solid rgba(255,255,255,0.2)', pb: 0.5 }}>
                               Quick Info
                             </Typography>
                             {bird.size_approx && (
                               <Typography variant="body2" sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                                 <strong style={{ color: '#94A3B8' }}>Size:</strong> {bird.size_approx}
                               </Typography>
                             )}
                             {bird.family && (
                               <Typography variant="body2" sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                                 <strong style={{ color: '#94A3B8' }}>Family:</strong> {bird.family}
                               </Typography>
                             )}
                             <Typography variant="body2" sx={{ fontSize: '0.75rem', mt: 1, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden', color: '#E2E8F0' }}>
                               {bird.description || 'No description available. Click the eye icon to edit/view full details.'}
                             </Typography>
                          </Box>
                        }
                      >
                        <Box sx={{ position: 'relative', cursor: 'pointer' }} onClick={() => handleOpenDetails(bird)}>
                          <CardMedia
                            component="img" height="180"
                            image={bird.image_url || 'https://via.placeholder.com/300x200?text=No+Image'}
                            alt={bird.common_name}
                          />
                          {photoCount > 1 && (
                             <Chip 
                               icon={<InsertPhotoRoundedIcon fontSize="small" />} 
                               label={`${photoCount} Photos`} 
                               size="small" 
                               sx={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', fontWeight: 700 }} 
                             />
                          )}
                        </Box>
                      </Tooltip>

                      <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                          <Chip label={bird.iucn_status || 'Unknown'} size="small" sx={{ backgroundColor: statusColor.bg, color: statusColor.text, fontWeight: 700, fontSize: '0.7rem' }} />
                          <Chip label={bird.status || 'Unknown'} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.dark', lineHeight: 1.2, mb: 0.5 }}>{bird.common_name}</Typography>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', mb: 0.5 }}>{bird.scientific_name}</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>{bird.bengali_name}</Typography>
                      </CardContent>
                      <Divider />
                      <CardActions sx={{ px: 2, py: 1.5, justifyContent: 'space-between' }}>
                        <IconButton size="small" onClick={() => handleOpenDetails(bird)} color="primary"><VisibilityRoundedIcon fontSize="small" /></IconButton>
                        <Box>
                          <IconButton size="small" onClick={() => handleOpenDrawer(bird)} color="primary"><EditRoundedIcon fontSize="small" /></IconButton>
                          <IconButton size="small" onClick={() => confirmDelete(bird.id)} color="error"><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
                        </Box>
                      </CardActions>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          )}

          {/* TABLE VIEW WITH TOOLTIP */}
          {viewMode === 'table' && (
            <Paper sx={{ borderRadius: 4, border: '1px solid #E2E8F0', overflow: 'hidden', mb: 3 }}>
              <TableContainer>
                <Table sx={{ minWidth: 800 }}>
                  <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Species Details</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Category & Migratory Status</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Conservation</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedSpecies.map((bird) => {
                      const statusColor = getStatusColor(bird.iucn_status);
                      return (
                        <TableRow key={bird.id} hover>
                          <TableCell>
                            <Tooltip title={
                                <Box sx={{ p: 1, maxWidth: 300 }}>
                                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>{bird.common_name}</Typography>
                                  <Typography variant="body2" fontSize="0.75rem">{bird.description ? bird.description.substring(0, 150) + '...' : 'Click view for details.'}</Typography>
                                </Box>
                            } placement="top-start" arrow>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, cursor: 'help' }}>
                                <Avatar src={bird.image_url} sx={{ width: 48, height: 48, borderRadius: 2 }} variant="rounded" />
                                <Box>
                                  <Typography variant="body1" sx={{ fontWeight: 700, color: 'primary.dark' }}>{bird.common_name}</Typography>
                                  <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                                    {bird.scientific_name} {bird.bengali_name && `• ${bird.bengali_name}`}
                                  </Typography>
                                </Box>
                              </Box>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{bird.category || 'N/A'}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{bird.status}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={bird.iucn_status || 'Unknown'} size="small" sx={{ backgroundColor: statusColor.bg, color: statusColor.text, fontWeight: 700 }} />
                          </TableCell>
                          <TableCell align="right">
                            <IconButton onClick={() => handleOpenDetails(bird)} color="primary" sx={{ mr: 1, backgroundColor: 'rgba(59, 130, 246, 0.05)' }}><VisibilityRoundedIcon fontSize="small" /></IconButton>
                            <IconButton onClick={() => handleOpenDrawer(bird)} color="primary" sx={{ mr: 1, backgroundColor: 'rgba(27, 67, 50, 0.05)' }}><EditRoundedIcon fontSize="small" /></IconButton>
                            <IconButton onClick={() => confirmDelete(bird.id)} color="error" sx={{ backgroundColor: '#FFEBEE' }}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          <TablePagination
            component="div" count={filteredSpecies.length} rowsPerPage={rowsPerPage} page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            sx={{ backgroundColor: 'white', borderRadius: 4 }}
          />
        </>
      )}

      {/* ============================================== */}
      {/* 5. VIEW DETAILS MODAL (POP-UP)                 */}
      {/* ============================================== */}
      <Dialog 
        open={!!viewingBird} 
        onClose={handleCloseDetails} 
        maxWidth="md" 
        fullWidth 
        scroll="paper"
        PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden', maxHeight: '90vh' } }}
      >
        {viewingBird && (
          <>
            <IconButton 
              onClick={handleCloseDetails} 
              sx={{ position: 'absolute', top: 12, right: 12, zIndex: 10, bgcolor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)', '&:hover': { bgcolor: 'white' } }}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>

            <DialogContent sx={{ p: 0 }}> 
              <Box sx={{ position: 'relative', bgcolor: '#000' }}>
                
                {/* Swipeable Photo Gallery Container */}
                <Box sx={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', '&::-webkit-scrollbar': { display: 'none' } }}>
                   {getPhotosForView(viewingBird).length > 0 ? (
                     getPhotosForView(viewingBird).map((photo, idx) => (
                        <Box key={idx} sx={{ minWidth: '100%', height: 400, scrollSnapAlign: 'start', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           <Box 
                             component="img" 
                             src={photo.url || 'https://via.placeholder.com/600x400?text=No+Image'} 
                             alt={`${viewingBird.common_name} ${photo.gender}`} 
                             sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                           />
                           <Chip 
                             label={photo.gender || 'Unknown'} 
                             size="small" 
                             sx={{ position: 'absolute', bottom: 16, right: 16, bgcolor: 'rgba(0,0,0,0.7)', color: '#fff', fontWeight: 700, letterSpacing: 0.5 }} 
                           />
                        </Box>
                     ))
                   ) : (
                      <Box sx={{ minWidth: '100%', height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#111827' }}>
                         <InsertPhotoRoundedIcon sx={{ fontSize: 60, color: '#334155' }} />
                      </Box>
                   )}
                </Box>

                {getPhotosForView(viewingBird).length > 1 && (
                  <Box sx={{ position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 1, pointerEvents: 'none' }}>
                    {getPhotosForView(viewingBird).map((_, i) => (
                      <Box key={i} sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.8)', boxShadow: '0 1px 3px rgba(0,0,0,0.5)' }} />
                    ))}
                  </Box>
                )}
              </Box>

              <Box sx={{ p: 4 }}>
                 <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
                    <Chip label={viewingBird.iucn_status || 'Unknown'} size="small" sx={{ backgroundColor: getStatusColor(viewingBird.iucn_status).bg, color: getStatusColor(viewingBird.iucn_status).text, fontWeight: 700 }} />
                    <Chip label={viewingBird.status || 'Unknown Status'} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                    {viewingBird.category && <Chip label={viewingBird.category} size="small" sx={{ bgcolor: '#F1F5F9', color: '#475569', fontWeight: 600 }} />}
                 </Stack>

                 <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.dark', mb: 0.5 }}>
                   {viewingBird.common_name}
                 </Typography>
                 <Typography variant="subtitle1" sx={{ fontStyle: 'italic', color: 'text.secondary', mb: 0.5 }}>
                   {viewingBird.scientific_name}
                 </Typography>
                 {viewingBird.bengali_name && (
                   <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 3 }}>
                     Local Name: {viewingBird.bengali_name}
                   </Typography>
                 )}

                 <Divider sx={{ my: 3 }} />

                 <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={6} sm={3}>
                       <Typography variant="caption" color="text.secondary" fontWeight={700}>SIZE APPROX</Typography>
                       <Typography variant="body1" fontWeight={600} color="primary.dark">{viewingBird.size_approx || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                       <Typography variant="caption" color="text.secondary" fontWeight={700}>FAMILY</Typography>
                       <Typography variant="body1" fontWeight={600} color="primary.dark">{viewingBird.family || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                       <Typography variant="caption" color="text.secondary" fontWeight={700}>WPA SCHEDULE</Typography>
                       <Typography variant="body1" fontWeight={600} color="primary.dark">{viewingBird.wpa_schedule || 'N/A'}</Typography>
                    </Grid>
                 </Grid>

                 <Grid container spacing={4}>
                    <Grid item xs={12} md={6}>
                       <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#475569', mb: 1, textTransform: 'uppercase' }}>General Description</Typography>
                       <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.8, mb: 3 }}>{viewingBird.description || 'No description provided.'}</Typography>
                       
                       {viewingBird.distribution && (
                          <>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#475569', mb: 1, textTransform: 'uppercase' }}>Distribution</Typography>
                            <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.8, mb: 3 }}>{viewingBird.distribution}</Typography>
                          </>
                       )}
                       
                       {viewingBird.note && (
                          <Box sx={{ bgcolor: '#FFFBEB', p: 2, borderRadius: 2, border: '1px solid #FDE68A' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#92400E', mb: 1, textTransform: 'uppercase' }}>Field Note</Typography>
                            <Typography variant="body2" sx={{ color: '#92400E', fontStyle: 'italic' }}>{viewingBird.note}</Typography>
                          </Box>
                       )}
                    </Grid>

                    <Grid item xs={12} md={6}>
                       {viewingBird.male_description && (
                          <Box sx={{ mb: 3, p: 2, bgcolor: '#F8FAFC', borderRadius: 2 }}>
                             <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1E40AF', mb: 1 }}>Male Appearance</Typography>
                             <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.6 }}>{viewingBird.male_description}</Typography>
                          </Box>
                       )}
                       {viewingBird.female_description && (
                          <Box sx={{ mb: 3, p: 2, bgcolor: '#F8FAFC', borderRadius: 2 }}>
                             <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#BE185D', mb: 1 }}>Female Appearance</Typography>
                             <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.6 }}>{viewingBird.female_description}</Typography>
                          </Box>
                       )}
                       {viewingBird.similar_species && (
                          <Box sx={{ mb: 3 }}>
                             <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#475569', mb: 1, textTransform: 'uppercase' }}>Similar Species</Typography>
                             <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.8 }}>{viewingBird.similar_species}</Typography>
                          </Box>
                       )}
                       {viewingBird.subspecies && (
                          <Box sx={{ mb: 3 }}>
                             <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#475569', mb: 1, textTransform: 'uppercase' }}>Subspecies</Typography>
                             <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.8 }}>{viewingBird.subspecies}</Typography>
                          </Box>
                       )}
                    </Grid>
                 </Grid>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* ============================================== */}
      {/* DRAWER FORM (ADD/EDIT)                         */}
      {/* ============================================== */}
      <Drawer anchor="right" open={isDrawerOpen} onClose={handleCloseDrawer} PaperProps={{ sx: { width: { xs: '100%', sm: 600 } } }}>
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.dark' }}>{editingBird ? 'Edit Species' : 'Add New Species'}</Typography>
          <IconButton onClick={handleCloseDrawer} disabled={isUploading}><CloseRoundedIcon /></IconButton>
        </Box>
        
        <Box component="form" onSubmit={handleSave} sx={{ p: 3 }}>
          <Stack spacing={4}>
            
            {/* MULTI-PHOTO UPLOAD SECTION */}
            <Box>
               <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#475569', mb: 2 }}>
                 Gender-Specific Photos
               </Typography>
               
               {formData.photos.map((photo, index) => (
                 <Box key={photo.id || index} sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, p: 2, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2 }}>
                    <Avatar src={photo.file ? URL.createObjectURL(photo.file) : photo.url} variant="rounded" sx={{ width: 70, height: 70, backgroundColor: '#E2E8F0' }}>
                      <InsertPhotoRoundedIcon sx={{ color: '#94A3B8' }}/>
                    </Avatar>
                    <Stack spacing={1.5} flex={1}>
                       <Button variant="outlined" component="label" size="small" sx={{ justifyContent: 'flex-start' }}>
                         {photo.url || photo.file ? 'Change Photo' : 'Upload Photo'}
                         <input type="file" hidden accept="image/*" onChange={(e) => handlePhotoFileChange(index, e.target.files[0])} />
                       </Button>
                       <FormControl size="small" fullWidth>
                          <Select value={photo.gender} onChange={(e) => handlePhotoGenderChange(index, e.target.value)} sx={{ backgroundColor: '#fff' }}>
                             {genderOptions.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                          </Select>
                       </FormControl>
                    </Stack>
                    <IconButton color="error" onClick={() => handleRemovePhotoBlock(index)} sx={{ alignSelf: 'flex-start' }}><DeleteOutlineRoundedIcon /></IconButton>
                 </Box>
               ))}
               
               <Button startIcon={<AddRoundedIcon />} onClick={handleAddPhotoBlock} variant="text" fullWidth sx={{ border: '1px dashed #CBD5E1', color: '#64748B', py: 1.5, borderRadius: 2 }}>
                 Add Another Photo
               </Button>
            </Box>

            <Divider />

            {/* SECTION: TAXONOMY */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A', mb: 2, textTransform: 'uppercase' }}>Taxonomy & Naming</Typography>
              <Grid container spacing={2}>
                 <Grid item xs={12} sm={6}><TextField required label="Common Name" value={formData.common_name} onChange={(e) => setFormData({...formData, common_name: e.target.value})} fullWidth /></Grid>
                 <Grid item xs={12} sm={6}><TextField label="Scientific Name" value={formData.scientific_name} onChange={(e) => setFormData({...formData, scientific_name: e.target.value})} fullWidth sx={{ input: { fontStyle: 'italic' } }}/></Grid>
                 <Grid item xs={12} sm={6}><TextField label="Local Bengali Name" value={formData.bengali_name} onChange={(e) => setFormData({...formData, bengali_name: e.target.value})} fullWidth /></Grid>
                 <Grid item xs={12} sm={6}><TextField label="Family" value={formData.family} onChange={(e) => setFormData({...formData, family: e.target.value})} fullWidth /></Grid>
              </Grid>
            </Box>

            <Divider />

            {/* SECTION: CLASSIFICATION */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A', mb: 2, textTransform: 'uppercase' }}>Classification & Status</Typography>
              <Grid container spacing={2}>
                 <Grid item xs={12} sm={6}><TextField label="Category (e.g., Warbler)" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} fullWidth /></Grid>
                 <Grid item xs={12} sm={6}><TextField label="Approximate Size" placeholder="e.g. 15cm" value={formData.size_approx} onChange={(e) => setFormData({...formData, size_approx: e.target.value})} fullWidth /></Grid>
                 <Grid item xs={12} sm={4}>
                    <FormControl fullWidth required>
                      <InputLabel>Migratory Status</InputLabel>
                      <Select value={formData.status} label="Migratory Status" onChange={(e) => setFormData({...formData, status: e.target.value})}>
                        {migratoryStatuses.map((s) => (<MenuItem key={s} value={s}>{s}</MenuItem>))}
                      </Select>
                    </FormControl>
                 </Grid>
                 <Grid item xs={12} sm={4}>
                    <FormControl fullWidth required>
                      <InputLabel>Conservation (IUCN)</InputLabel>
                      <Select value={formData.iucn_status} label="Conservation (IUCN)" onChange={(e) => setFormData({...formData, iucn_status: e.target.value})}>
                        {conservationStatuses.map((s) => (<MenuItem key={s} value={s}>{s}</MenuItem>))}
                      </Select>
                    </FormControl>
                 </Grid>
                 <Grid item xs={12} sm={4}><TextField label="WPA Schedule" placeholder="e.g. Schedule I" value={formData.wpa_schedule} onChange={(e) => setFormData({...formData, wpa_schedule: e.target.value})} fullWidth /></Grid>
              </Grid>
            </Box>

            <Divider />

            {/* SECTION: IDENTIFICATION */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A', mb: 2, textTransform: 'uppercase' }}>Identification</Typography>
              <Stack spacing={2}>
                 <TextField label="General Description" multiline rows={3} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} fullWidth />
                 <TextField label="Male Appearance" multiline rows={2} value={formData.male_description} onChange={(e) => setFormData({...formData, male_description: e.target.value})} fullWidth />
                 <TextField label="Female Appearance" multiline rows={2} value={formData.female_description} onChange={(e) => setFormData({...formData, female_description: e.target.value})} fullWidth />
                 <TextField label="Similar Species" value={formData.similar_species} onChange={(e) => setFormData({...formData, similar_species: e.target.value})} fullWidth />
                 <TextField label="Subspecies" value={formData.subspecies} onChange={(e) => setFormData({...formData, subspecies: e.target.value})} fullWidth />
              </Stack>
            </Box>

            <Divider />

            {/* SECTION: FIELD NOTES */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A', mb: 2, textTransform: 'uppercase' }}>Ecology & Notes</Typography>
              <Stack spacing={2}>
                 <TextField label="Distribution & Habitat" multiline rows={2} value={formData.distribution} onChange={(e) => setFormData({...formData, distribution: e.target.value})} fullWidth />
                 <TextField label="Internal Note / Behavior" multiline rows={2} value={formData.note} onChange={(e) => setFormData({...formData, note: e.target.value})} fullWidth />
              </Stack>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', pt: 2, pb: 4 }}>
              <Button onClick={handleCloseDrawer} variant="outlined" color="inherit" disabled={isUploading}>Cancel</Button>
              <Button type="submit" variant="contained" color="primary" disabled={isUploading} sx={{ px: 4 }}>
                {isUploading ? <CircularProgress size={24} color="inherit" /> : 'Save Species'}
              </Button>
            </Box>

          </Stack>
        </Box>
      </Drawer>

    </Box>
  );
};

export default SpeciesList;