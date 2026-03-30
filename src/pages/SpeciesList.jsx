import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Avatar, Chip, IconButton, Button, TextField, 
  InputAdornment, Drawer, Divider, MenuItem, Stack, FormControl, InputLabel, 
  Select, TablePagination, ToggleButton, ToggleButtonGroup, Grid, Card, 
  CardMedia, CardContent, CardActions, CircularProgress
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
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';

const conservationStatuses = ['Least Concern (LC)', 'Near Threatened (NT)', 'Vulnerable (VU)', 'Endangered (EN)', 'Critically Endangered (CR)'];
const migratoryStatuses = ['Resident', 'Migratory', 'Winter', 'Passage', 'Vagrant'];

const SpeciesList = () => {
  const [speciesData, setSpeciesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  const [viewMode, setViewMode] = useState('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0); 
  const [rowsPerPage, setRowsPerPage] = useState(8); 
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingBird, setEditingBird] = useState(null); 
  
  // MATCHES YOUR NEW SQL SCHEMA EXACTLY
  const [formData, setFormData] = useState({ 
    common_name: '', scientific_name: '', bengali_name: '', category: '', 
    iucn_status: 'Least Concern (LC)', status: 'Resident', description: '', image_url: '' 
  });
  const [imageFile, setImageFile] = useState(null);

  // 1. FETCH DATA ON LOAD
  useEffect(() => {
    fetchSpecies();
  }, []);

  const fetchSpecies = async () => {
    try {
      setIsLoading(true);
      // Now fetching from the new 'birds' table!
      const { data, error } = await supabase.from('birds').select('*').order('common_name', { ascending: true });
      
      if (error) throw error;
      if (data) setSpeciesData(data);
    } catch (error) {
      console.error('Error fetching birds:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. DRAWER HANDLERS
  const handleOpenDrawer = (bird = null) => {
    setImageFile(null); 
    if (bird) { 
      setEditingBird(bird); 
      setFormData({
        common_name: bird.common_name || '',
        scientific_name: bird.scientific_name || '',
        bengali_name: bird.bengali_name || '',
        category: bird.category || '',
        iucn_status: bird.iucn_status || 'Least Concern (LC)',
        status: bird.status || 'Resident',
        description: bird.description || '',
        image_url: bird.image_url || ''
      }); 
    } else { 
      setEditingBird(null); 
      setFormData({ 
        common_name: '', scientific_name: '', bengali_name: '', category: '', 
        iucn_status: 'Least Concern (LC)', status: 'Resident', description: '', image_url: '' 
      }); 
    }
    setIsDrawerOpen(true);
  };
  
  const handleCloseDrawer = () => setIsDrawerOpen(false);

  // 3. SAVE TO DATABASE
  const handleSave = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      let finalImageUrl = formData.image_url;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random()}.${fileExt}`;
        const filePath = `thumbnails/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('bird_images').upload(filePath, imageFile);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('bird_images').getPublicUrl(filePath);
        finalImageUrl = publicUrlData.publicUrl;
      }

      const dataToSave = { ...formData, image_url: finalImageUrl };

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
          {/* CARDS VIEW */}
          {viewMode === 'card' && (
            <Grid container spacing={3} sx={{ mb: 3 }}>
              {paginatedSpecies.map((bird) => {
                const statusColor = getStatusColor(bird.iucn_status);
                return (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={bird.id}>
                    <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardMedia
                        component="img" height="180"
                        image={bird.image_url || 'https://via.placeholder.com/300x200?text=No+Image'}
                        alt={bird.common_name}
                      />
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
                        <Button size="small" onClick={() => handleOpenDrawer(bird)} sx={{ fontWeight: 700 }}>Edit Details</Button>
                        <IconButton size="small" onClick={() => confirmDelete(bird.id)} color="error"><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
                      </CardActions>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          )}

          {/* TABLE VIEW */}
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
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar src={bird.image_url} sx={{ width: 48, height: 48, borderRadius: 2 }} variant="rounded" />
                              <Box>
                                <Typography variant="body1" sx={{ fontWeight: 700, color: 'primary.dark' }}>{bird.common_name}</Typography>
                                <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                                  {bird.scientific_name} {bird.bengali_name && `• ${bird.bengali_name}`}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{bird.category || 'N/A'}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{bird.status}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={bird.iucn_status || 'Unknown'} size="small" sx={{ backgroundColor: statusColor.bg, color: statusColor.text, fontWeight: 700 }} />
                          </TableCell>
                          <TableCell align="right">
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

      {/* DRAWER FORM */}
      <Drawer anchor="right" open={isDrawerOpen} onClose={handleCloseDrawer} PaperProps={{ sx: { width: { xs: '100%', sm: 450 } } }}>
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.dark' }}>{editingBird ? 'Edit Species' : 'Add New Species'}</Typography>
          <IconButton onClick={handleCloseDrawer} disabled={isUploading}><CloseRoundedIcon /></IconButton>
        </Box>
        
        <Box component="form" onSubmit={handleSave} sx={{ p: 3 }}>
          <Stack spacing={3}>
            
            <Box sx={{ p: 2, border: '1px dashed #B0BEC5', borderRadius: 2, textAlign: 'center', backgroundColor: '#FAFAFA' }}>
              {(formData.image_url || imageFile) ? (
                <Box 
                  component="img" 
                  src={imageFile ? URL.createObjectURL(imageFile) : formData.image_url} 
                  sx={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 1, mb: 2 }} 
                />
              ) : (
                <CloudUploadRoundedIcon sx={{ fontSize: 40, color: '#90A4AE', mb: 1 }} />
              )}
              
              <Button variant="outlined" component="label" fullWidth size="small">
                {formData.image_url ? 'Change Image' : 'Upload Bird Image'}
                <input type="file" hidden accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
              </Button>
            </Box>

            <TextField required label="Common Name" value={formData.common_name} onChange={(e) => setFormData({...formData, common_name: e.target.value})} fullWidth />
            <TextField label="Scientific Name" value={formData.scientific_name} onChange={(e) => setFormData({...formData, scientific_name: e.target.value})} fullWidth sx={{ fontStyle: 'italic' }}/>
            <TextField label="Local Bengali Name" value={formData.bengali_name} onChange={(e) => setFormData({...formData, bengali_name: e.target.value})} fullWidth />
            <TextField label="Category (e.g., Warbler, Flycatcher)" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} fullWidth />
            
            <FormControl fullWidth required>
              <InputLabel>Migratory Status</InputLabel>
              <Select value={formData.status} label="Migratory Status" onChange={(e) => setFormData({...formData, status: e.target.value})}>
                {migratoryStatuses.map((s) => (<MenuItem key={s} value={s}>{s}</MenuItem>))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Conservation Status</InputLabel>
              <Select value={formData.iucn_status} label="Conservation Status" onChange={(e) => setFormData({...formData, iucn_status: e.target.value})}>
                {conservationStatuses.map((s) => (<MenuItem key={s} value={s}>{s}</MenuItem>))}
              </Select>
            </FormControl>

            <TextField 
              label="Description" multiline rows={3} 
              value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} fullWidth 
            />

            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button onClick={handleCloseDrawer} variant="outlined" color="inherit" disabled={isUploading}>Cancel</Button>
              <Button type="submit" variant="contained" color="primary" disabled={isUploading}>
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