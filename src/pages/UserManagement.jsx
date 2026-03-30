import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Avatar, Chip, IconButton, Button, TextField, 
  InputAdornment, Drawer, Divider, MenuItem, Stack, FormControl, InputLabel, 
  Select, Tabs, Tab, CircularProgress, Tooltip
} from '@mui/material';

// --- DATABASE CLIENT ---
import { supabase } from '../supabaseClient';

// Icons
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import LocalPhoneRoundedIcon from '@mui/icons-material/LocalPhoneRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';

const UserManagement = () => {
  const [tabValue, setTabValue] = useState(0); // 0 = Staff/Profiles, 1 = App Users
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Form State for Adding New Members
  const [newMember, setNewMember] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'researcher'
  });

  useEffect(() => {
    fetchUsers();
  }, [tabValue]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const table = tabValue === 0 ? 'profiles' : 'app_users';
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- ADD NEW MEMBER LOGIC ---
  const handleAddMember = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // For the 'profiles' table, we need a UUID. 
      // In a real invite system, Supabase Auth handles this, 
      // but for manual entries, we generate a valid random UUID.
      const tempId = crypto.randomUUID();

      const { error } = await supabase
        .from('profiles')
        .insert([{
          id: tempId,
          full_name: newMember.full_name,
          email: newMember.email,
          phone: newMember.phone,
          role: newMember.role
        }]);

      if (error) throw error;
      
      setIsDrawerOpen(false);
      setNewMember({ full_name: '', email: '', phone: '', role: 'researcher' });
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert("Error adding member: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateRole = async (user, newRole) => {
    try {
      const table = tabValue === 0 ? 'profiles' : 'app_users';
      const { error } = await supabase
        .from(table)
        .update({ role: newRole })
        .eq('id', user.id);
      
      if (error) throw error;
      fetchUsers();
    } catch (err) {
      alert("Error updating role");
    }
  };

  const filteredUsers = users.filter(u => 
    String(u.full_name || u.username || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ animation: 'fadeIn 0.3s' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.dark', mb: 0.5 }}>User Management</Typography>
          <Typography variant="body1" color="text.secondary">Manage system access for researchers and mobile app users.</Typography>
        </Box>
        {tabValue === 0 && (
          <Button 
            variant="contained" 
            startIcon={<PersonAddRoundedIcon />} 
            onClick={() => setIsDrawerOpen(true)}
            sx={{ borderRadius: 2, px: 3, fontWeight: 700 }}
          >
            Add Member
          </Button>
        )}
      </Box>

      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label={`Staff & Researchers (${tabValue === 0 ? filteredUsers.length : '...' })`} sx={{ fontWeight: 700 }} />
        <Tab label={`App Users (${tabValue === 1 ? filteredUsers.length : '...' })`} sx={{ fontWeight: 700 }} />
      </Tabs>

      <Paper sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
        <Box sx={{ p: 3, bgcolor: '#F8FAFC', display: 'flex', gap: 2 }}>
          <TextField
            placeholder="Search by name or email..." size="small"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: <SearchRoundedIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
            sx={{ width: 350, bgcolor: 'white', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Box>

        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#F1F5F9' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Identity</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Contact Details</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Designation</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Joined Date</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Permissions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 10 }}><CircularProgress /></TableCell></TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 10, color: 'text.secondary' }}>No records found.</TableCell></TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: user.role === 'admin' ? '#1B4332' : '#2D6A4F', fontWeight: 700 }}>
                          {(user.full_name || user.username || 'U').substring(0, 1).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{user.full_name || user.username}</Typography>
                          <Typography variant="caption" color="text.secondary">UID: {user.id.substring(0, 8)}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        {user.email && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <MailRoundedIcon sx={{ fontSize: 14 }} color="action" />
                            <Typography variant="caption">{user.email}</Typography>
                          </Box>
                        )}
                        {(user.phone || user.phone_number) && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocalPhoneRoundedIcon sx={{ fontSize: 14 }} color="action" />
                            <Typography variant="caption">{user.phone || user.phone_number}</Typography>
                          </Box>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.role} 
                        size="small" 
                        variant="outlined"
                        sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{new Date(user.created_at).toLocaleDateString()}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <FormControl size="small" sx={{ minWidth: 140 }}>
                        <Select
                          value={user.role || 'guest'}
                          onChange={(e) => handleUpdateRole(user, e.target.value)}
                          sx={{ borderRadius: 2, fontSize: '0.75rem', fontWeight: 700 }}
                        >
                          <MenuItem value="admin">Admin</MenuItem>
                          <MenuItem value="researcher">Researcher</MenuItem>
                          <MenuItem value="student">Student</MenuItem>
                          <MenuItem value="guest">Guest</MenuItem>
                          {tabValue === 1 && <MenuItem value="Bird Watcher">Bird Watcher</MenuItem>}
                        </Select>
                      </FormControl>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* --- ADD MEMBER DRAWER --- */}
      <Drawer anchor="right" open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} PaperProps={{ sx: { width: 400 } }}>
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Add New Member</Typography>
          <IconButton onClick={() => setIsDrawerOpen(false)}><CloseRoundedIcon /></IconButton>
        </Box>
        <Box component="form" onSubmit={handleAddMember} sx={{ p: 3 }}>
          <Stack spacing={3}>
            <TextField 
              required label="Full Name" 
              value={newMember.full_name} 
              onChange={(e) => setNewMember({...newMember, full_name: e.target.value})} 
            />
            <TextField 
              required type="email" label="Email Address" 
              value={newMember.email} 
              onChange={(e) => setNewMember({...newMember, email: e.target.value})} 
            />
            <TextField 
              label="Phone Number" 
              value={newMember.phone} 
              onChange={(e) => setNewMember({...newMember, phone: e.target.value})} 
            />
            <FormControl fullWidth>
              <InputLabel>Assign Role</InputLabel>
              <Select 
                value={newMember.role} 
                label="Assign Role" 
                onChange={(e) => setNewMember({...newMember, role: e.target.value})}
              >
                <MenuItem value="researcher">Field Researcher</MenuItem>
                <MenuItem value="student">Student</MenuItem>
                <MenuItem value="admin">Administrator</MenuItem>
              </Select>
            </FormControl>
            <Divider />
            <Button 
              type="submit" 
              variant="contained" 
              size="large" 
              disabled={isSaving}
              startIcon={isSaving ? <CircularProgress size={20} /> : <SaveRoundedIcon />}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              Save Member
            </Button>
          </Stack>
        </Box>
      </Drawer>
    </Box>
  );
};

export default UserManagement;