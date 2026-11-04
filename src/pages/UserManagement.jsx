import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Avatar, Chip, IconButton, Button, TextField, InputAdornment, Drawer, Divider, MenuItem, Stack,
  FormControl, InputLabel, Select, Tabs, Tab, CircularProgress, Tooltip, Skeleton, Dialog,
  DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar, Alert, GlobalStyles,
} from '@mui/material';

// --- DATABASE CLIENT ---
import { supabase } from '../supabaseClient';

// Icons
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import LocalPhoneRoundedIcon from '@mui/icons-material/LocalPhoneRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';

const C = { deep: '#06180F', forest: '#1B4332', moss: '#2D6A4F', mint: '#B7E4C7', line: '#E2E8F0' };
const HEADING = '"Bricolage Grotesque", sans-serif';
const panelSx = { borderRadius: '24px', border: `1px solid ${C.line}`, boxShadow: '0 6px 28px rgba(6,24,15,0.04)', bgcolor: '#fff' };

const BASE_ROLES = ['admin', 'researcher', 'student', 'guest'];
const ROLE_STYLE = {
  admin: { bg: '#E3F6EE', text: '#047857' },
  researcher: { bg: '#E0F2FE', text: '#0369A1' },
  student: { bg: '#EEF2FF', text: '#4F46E5' },
  guest: { bg: '#F1F5F9', text: '#475569' },
  'Bird Watcher': { bg: '#FFF4D6', text: '#B45309' },
};
const roleStyle = (r) => ROLE_STYLE[r] || ROLE_STYLE.guest;
const roleLabel = (r) => ({ admin: 'Admin', researcher: 'Researcher', student: 'Student', guest: 'Guest' }[r] || r || 'Guest');

const AVATAR_COLORS = ['#2D6A4F', '#0369A1', '#8A6B2F', '#6B5B7B', '#1F8FA3', '#9A4D3A'];
const nameOf = (u) => u.full_name || u.username || 'Unnamed user';
const colorFor = (n) => AVATAR_COLORS[[...n].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AVATAR_COLORS.length];
const initialsOf = (n) => n.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'U';
const joined = (s) => {
  const d = s ? new Date(s) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
};

const emptyMember = { full_name: '', email: '', phone: '', role: 'researcher' };

const UserManagement = () => {
  const [tabValue, setTabValue] = useState(0); // 0 = Staff/Profiles, 1 = App Users
  const [users, setUsers] = useState([]);
  const [counts, setCounts] = useState({ staff: null, app: null });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [newMember, setNewMember] = useState(emptyMember);
  const [meId, setMeId] = useState(null);
  const [pendingRole, setPendingRole] = useState(null); // { user, newRole }
  const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });

  const notify = (msg, severity = 'success') => setToast({ open: true, msg, severity });
  const tableName = tabValue === 0 ? 'profiles' : 'app_users';

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMeId(data?.user?.id || null));
  }, []);

  const fetchCounts = async () => {
    const [a, b] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('app_users').select('*', { count: 'exact', head: true }),
    ]);
    setCounts({ staff: a.count ?? 0, app: b.count ?? 0 });
  };
  useEffect(() => { fetchCounts(); }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.from(tableName).select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error(err);
      notify('Could not load the user list. Check your connection and refresh.', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => { setSearchTerm(''); setRoleFilter('all'); fetchUsers(); }, [tabValue]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- ADD NEW MEMBER ---
  const handleAddMember = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // The profiles table needs a UUID; manual entries get a generated one.
      const { error } = await supabase.from('profiles').insert([{
        id: crypto.randomUUID(),
        full_name: newMember.full_name.trim(),
        email: newMember.email.trim(),
        phone: newMember.phone.trim(),
        role: newMember.role,
      }]);
      if (error) throw error;
      setIsDrawerOpen(false);
      notify(`${newMember.full_name.trim()} added to the team.`);
      setNewMember(emptyMember);
      fetchUsers();
      fetchCounts();
    } catch (err) {
      console.error(err);
      notify(`Could not add this member: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // --- ROLE CHANGE (optimistic, with confirmation when admin access is involved) ---
  const applyRole = async (user, newRole) => {
    const previous = user.role;
    setUsers((list) => list.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)));
    try {
      const { error } = await supabase.from(tableName).update({ role: newRole }).eq('id', user.id);
      if (error) throw error;
      notify(`${nameOf(user)} is now ${roleLabel(newRole)}.`);
    } catch (err) {
      setUsers((list) => list.map((u) => (u.id === user.id ? { ...u, role: previous } : u)));
      notify('Could not update the role. Please try again.', 'error');
    }
  };

  const requestRoleChange = (user, newRole) => {
    if (newRole === user.role) return;
    if (user.role === 'admin' || newRole === 'admin') setPendingRole({ user, newRole });
    else applyRole(user, newRole);
  };

  const confirmRoleChange = () => {
    const { user, newRole } = pendingRole;
    setPendingRole(null);
    applyRole(user, newRole);
  };

  // --- FILTERING ---
  const roleCounts = useMemo(() => {
    const m = { all: users.length };
    users.forEach((u) => { const r = u.role || 'guest'; m[r] = (m[r] || 0) + 1; });
    return m;
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return users.filter((u) => {
      const matchText = [nameOf(u), u.email, u.phone, u.phone_number].some((v) => String(v || '').toLowerCase().includes(q));
      const matchRole = roleFilter === 'all' || (u.role || 'guest') === roleFilter;
      return matchText && matchRole;
    });
  }, [users, searchTerm, roleFilter]);

  const roleChips = ['all', ...Object.keys(roleCounts).filter((k) => k !== 'all')];
  const copyId = (id) => {
    navigator.clipboard?.writeText(String(id)).then(() => notify('User ID copied.'), () => notify('Could not copy the ID.', 'error'));
  };

  return (
    <Box>
      <GlobalStyles styles={`@keyframes rowIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }`} />

      {/* HEADER */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'flex-end' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
        <Box>
          <Typography component="h1" sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: { xs: '2rem', md: '2.8rem' }, lineHeight: 1.05, letterSpacing: '-0.03em', color: C.deep }}>
            User management
          </Typography>
          <Typography sx={{ mt: 0.8, color: 'text.secondary' }}>Manage system access for researchers and mobile app users.</Typography>
        </Box>
        {tabValue === 0 && (
          <Button onClick={() => setIsDrawerOpen(true)} startIcon={<PersonAddRoundedIcon />}
            sx={{ bgcolor: C.moss, color: '#fff', textTransform: 'none', fontWeight: 800, borderRadius: '999px', px: 3.5, py: 1.3, boxShadow: '0 10px 26px rgba(45,106,79,0.35)', transition: 'transform .2s', '&:hover': { bgcolor: C.forest, transform: 'translateY(-2px)' } }}>
            Add member
          </Button>
        )}
      </Box>

      <Paper elevation={0} sx={{ ...panelSx, overflow: 'hidden' }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} variant="scrollable" scrollButtons="auto"
          sx={{ px: 2, borderBottom: `1px solid ${C.line}`, '& .MuiTabs-indicator': { bgcolor: C.moss, height: 3, borderRadius: 3 }, '& .Mui-selected': { color: `${C.deep} !important` } }}>
          <Tab label={`Staff and researchers${counts.staff !== null ? ` (${counts.staff})` : ''}`} sx={{ fontWeight: 800, textTransform: 'none', py: 2.2, minHeight: 0 }} />
          <Tab label={`App users${counts.app !== null ? ` (${counts.app})` : ''}`} sx={{ fontWeight: 800, textTransform: 'none', py: 2.2, minHeight: 0 }} />
        </Tabs>

        <Box sx={{ p: { xs: 2, md: 3 }, borderBottom: `1px solid ${C.line}`, bgcolor: '#FAFBFA', display: 'grid', gap: 2 }}>
          <TextField placeholder="Search by name, email or phone" size="small" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ maxWidth: 440, '& .MuiOutlinedInput-root': { borderRadius: '999px', bgcolor: '#fff' } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon color="action" /></InputAdornment> }} inputProps={{ 'aria-label': 'Search users' }} />
          {!isLoading && users.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {roleChips.map((r) => (
                <Chip key={r} clickable onClick={() => setRoleFilter(r)} label={`${r === 'all' ? 'All' : roleLabel(r)} (${roleCounts[r]})`}
                  sx={{ fontWeight: 700, bgcolor: roleFilter === r ? C.forest : '#EEF2F0', color: roleFilter === r ? '#fff' : '#475569', '&:hover': { bgcolor: roleFilter === r ? C.forest : '#E2E8F0' } }} />
              ))}
            </Stack>
          )}
        </Box>

        <TableContainer>
          <Table sx={{ minWidth: 520 }}>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: '#F4F7F6', fontWeight: 800, color: 'text.secondary', borderBottom: `1px solid ${C.line}` } }}>
                <TableCell>Identity</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Contact</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Joined</TableCell>
                <TableCell align="right">Role</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                [0, 1, 2, 3, 4].map((i) => (
                  <TableRow key={i}>
                    <TableCell><Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}><Skeleton variant="circular" width={42} height={42} /><Box><Skeleton width={120} /><Skeleton width={70} /></Box></Box></TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}><Skeleton width={160} /></TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}><Skeleton width={90} /></TableCell>
                    <TableCell align="right"><Skeleton width={130} sx={{ ml: 'auto' }} /></TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 9 }}>
                    <Typography sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: '1.3rem', color: C.deep }}>
                      {users.length === 0 ? 'No users yet' : 'No one matches your search'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8 }}>
                      {users.length === 0 ? (tabValue === 0 ? 'Add the first team member to get started.' : 'App users appear here after they sign up in the mobile app.') : 'Try a different name or clear the role filter.'}
                    </Typography>
                    {users.length > 0 && <Button onClick={() => { setSearchTerm(''); setRoleFilter('all'); }} sx={{ mt: 2, textTransform: 'none', fontWeight: 800 }}>Clear filters</Button>}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user, i) => {
                  const name = nameOf(user);
                  const role = user.role || 'guest';
                  const rs = roleStyle(role);
                  const isMe = user.id === meId;
                  const options = [...BASE_ROLES, ...(tabValue === 1 ? ['Bird Watcher'] : [])];
                  if (!options.includes(role)) options.push(role);
                  const phone = user.phone || user.phone_number;
                  return (
                    <TableRow key={user.id} hover sx={{ animation: `rowIn .35s ${Math.min(i, 10) * 0.03}s ease-out both`, '&:last-child td': { border: 0 } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ width: 42, height: 42, bgcolor: role === 'admin' ? C.forest : colorFor(name), fontWeight: 700 }}>
                            {role === 'admin' ? <AdminPanelSettingsRoundedIcon fontSize="small" /> : initialsOf(name)}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 800, color: C.deep }} noWrap>{name}{isMe && <Chip label="You" size="small" sx={{ ml: 1, height: 20, fontWeight: 800, bgcolor: C.mint }} />}</Typography>
                            <Tooltip title="Copy full ID">
                              <Box component="button" onClick={() => copyId(user.id)} aria-label={`Copy ID for ${name}`}
                                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, p: 0, border: 0, bgcolor: 'transparent', cursor: 'pointer', color: 'text.secondary', font: 'inherit', fontSize: '.75rem', '&:hover': { color: C.moss } }}>
                                ID: {String(user.id).substring(0, 8)} <ContentCopyRoundedIcon sx={{ fontSize: 12 }} />
                              </Box>
                            </Tooltip>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        <Stack spacing={0.5}>
                          {user.email && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><MailRoundedIcon sx={{ fontSize: 15 }} color="action" /><Typography variant="body2">{user.email}</Typography></Box>}
                          {phone && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><LocalPhoneRoundedIcon sx={{ fontSize: 15 }} color="action" /><Typography variant="body2">{phone}</Typography></Box>}
                          {!user.email && !phone && <Typography variant="body2" color="text.secondary">No contact details</Typography>}
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}><Typography variant="body2">{joined(user.created_at)}</Typography></TableCell>
                      <TableCell align="right">
                        <Tooltip title={isMe ? 'You cannot change your own role' : ''}>
                          <span>
                            <FormControl size="small" sx={{ minWidth: 150 }} disabled={isMe}>
                              <Select value={role} onChange={(e) => requestRoleChange(user, e.target.value)} inputProps={{ 'aria-label': `Role for ${name}` }}
                                sx={{ borderRadius: '999px', fontSize: '.85rem', fontWeight: 800, bgcolor: rs.bg, color: rs.text, '& fieldset': { border: 0 }, '& .MuiSelect-icon': { color: rs.text } }}>
                                {options.map((r) => <MenuItem key={r} value={r} sx={{ fontWeight: 600 }}>{roleLabel(r)}</MenuItem>)}
                              </Select>
                            </FormControl>
                          </span>
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

      {/* ADD MEMBER DRAWER */}
      <Drawer anchor="right" open={isDrawerOpen} onClose={() => !isSaving && setIsDrawerOpen(false)} PaperProps={{ sx: { width: { xs: '100%', sm: 440 }, display: 'flex', flexDirection: 'column' } }}>
        <Box sx={{ px: 3, py: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: C.deep, color: '#fff' }}>
          <Typography sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-0.01em' }}>Add new member</Typography>
          <IconButton onClick={() => setIsDrawerOpen(false)} disabled={isSaving} aria-label="Close form" sx={{ color: '#fff' }}><CloseRoundedIcon /></IconButton>
        </Box>
        <Box component="form" id="member-form" onSubmit={handleAddMember} sx={{ p: 3, flex: 1, overflowY: 'auto', '& .MuiOutlinedInput-root': { borderRadius: '14px' } }}>
          <Stack spacing={3}>
            <TextField required label="Full name" autoFocus value={newMember.full_name} onChange={(e) => setNewMember({ ...newMember, full_name: e.target.value })} />
            <TextField required type="email" label="Email address" value={newMember.email} onChange={(e) => setNewMember({ ...newMember, email: e.target.value })} />
            <TextField label="Phone number" value={newMember.phone} onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })} />
            <FormControl fullWidth>
              <InputLabel>Assign role</InputLabel>
              <Select value={newMember.role} label="Assign role" onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}>
                <MenuItem value="researcher">Field researcher</MenuItem>
                <MenuItem value="student">Student</MenuItem>
                <MenuItem value="admin">Administrator</MenuItem>
              </Select>
            </FormControl>
            {newMember.role === 'admin' && (
              <Alert severity="warning" sx={{ borderRadius: '14px' }}>Administrators can manage every record and every user. Only choose this for people you fully trust.</Alert>
            )}
          </Stack>
        </Box>
        <Box sx={{ px: 3, py: 2, display: 'flex', gap: 2, justifyContent: 'flex-end', borderTop: `1px solid ${C.line}` }}>
          <Button onClick={() => setIsDrawerOpen(false)} disabled={isSaving} color="inherit" sx={{ textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
          <Button type="submit" form="member-form" disabled={isSaving} startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveRoundedIcon />}
            sx={{ px: 4, py: 1.1, borderRadius: '999px', textTransform: 'none', fontWeight: 800, bgcolor: C.moss, color: '#fff', '&:hover': { bgcolor: C.forest }, '&.Mui-disabled': { bgcolor: C.mint, color: C.deep } }}>
            {isSaving ? 'Saving…' : 'Save member'}
          </Button>
        </Box>
      </Drawer>

      {/* ADMIN ROLE CONFIRMATION */}
      <Dialog open={!!pendingRole} onClose={() => setPendingRole(null)} PaperProps={{ sx: { borderRadius: '24px', p: 1, maxWidth: 460 } }}>
        <DialogTitle sx={{ fontFamily: HEADING, fontWeight: 800 }}>
          {pendingRole?.newRole === 'admin' ? 'Make this person an admin?' : 'Remove admin access?'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pendingRole && (pendingRole.newRole === 'admin'
              ? `${nameOf(pendingRole.user)} will be able to manage every record and every user.`
              : `${nameOf(pendingRole.user)} will lose admin access and become ${roleLabel(pendingRole.newRole)}.`)}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPendingRole(null)} color="inherit" sx={{ textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
          <Button onClick={confirmRoleChange} variant="contained" sx={{ textTransform: 'none', fontWeight: 800, borderRadius: '999px', px: 3, bgcolor: C.moss, '&:hover': { bgcolor: C.forest } }}>
            {pendingRole?.newRole === 'admin' ? 'Make admin' : 'Remove access'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast((t) => ({ ...t, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.severity} variant="filled" onClose={() => setToast((t) => ({ ...t, open: false }))} sx={{ borderRadius: '14px', fontWeight: 600 }}>{toast.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default UserManagement;