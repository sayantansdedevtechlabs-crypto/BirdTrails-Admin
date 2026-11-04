import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Avatar, IconButton, Badge, Divider, Tooltip,
  Menu, MenuItem, GlobalStyles, CircularProgress,
} from '@mui/material';

// --- DATABASE CLIENT ---
import { supabase } from '../../supabaseClient';

// Icons
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import FormatListBulletedRoundedIcon from '@mui/icons-material/FormatListBulletedRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';

import newsLogo from '../../assets/News-Logo-1-removebg-preview.png';

const C = { forest: '#0A1912', deep: '#06180F', moss: '#2D6A4F', mint: '#B7E4C7', text: '#A4B8AE', page: '#F4F7F6' };
const FULL = 280;
const SLIM = 88;
const HEADING = '"Bricolage Grotesque", sans-serif';

const menuItems = [
  { text: 'Dashboard', icon: <DashboardRoundedIcon />, path: '/' },
  { text: 'Bird Directory', icon: <FormatListBulletedRoundedIcon />, path: '/species' },
  { text: 'Observations', icon: <MapRoundedIcon />, path: '/observations' },
  { text: 'Census Sessions', icon: <AssessmentRoundedIcon />, path: '/census' },
  { text: 'User Management', icon: <PeopleAltRoundedIcon />, path: '/users' },
];

// "/species/12" still highlights "Bird Directory"
const isActivePath = (itemPath, pathname) =>
  itemPath === '/' ? pathname === '/' : pathname === itemPath || pathname.startsWith(`${itemPath}/`);

const makeInitials = (name) =>
  name.trim().split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'A';

/* ---------------- Sidebar (shared by desktop + mobile drawers) ---------------- */
const SidebarContent = ({ collapsed, pathname, onNavigate, onLogout, loggingOut, onToggle }) => (
  <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${C.forest} 0%, ${C.deep} 100%)` }}>
    {/* Brand */}
    <Box sx={{ px: collapsed ? 1.5 : 2.5, pt: 3, pb: 2, transition: 'padding .3s' }}>
      <Box
        sx={{
          bgcolor: '#fff', borderRadius: 3, height: 72, display: 'grid', placeItems: 'center', px: 1.5,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        }}
      >
        <img src={newsLogo} alt="NEWS" style={{ maxHeight: collapsed ? 36 : 52, maxWidth: '100%', objectFit: 'contain', transition: 'max-height .3s' }} />
      </Box>
      {!collapsed && (
        <Typography sx={{ mt: 2, textAlign: 'center', fontFamily: HEADING, fontWeight: 800, fontSize: '1.15rem', color: '#fff', letterSpacing: '-0.01em' }}>
          BirdTrails
        </Typography>
      )}
    </Box>

    {/* Navigation */}
    <Box component="nav" aria-label="Main" sx={{ overflowY: 'auto', overflowX: 'hidden', px: collapsed ? 1.5 : 2, flexGrow: 1, mt: 1 }}>
      <List disablePadding>
        {menuItems.map((item) => {
          const active = isActivePath(item.path, pathname);
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.8 }}>
              <Tooltip title={collapsed ? item.text : ''} placement="right" arrow>
                <ListItemButton
                  onClick={() => onNavigate(item.path)}
                  aria-current={active ? 'page' : undefined}
                  sx={{
                    position: 'relative', borderRadius: 2.5, py: 1.4, px: collapsed ? 0 : 2,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    bgcolor: active ? 'rgba(183,228,199,0.14)' : 'transparent',
                    color: active ? '#fff' : C.text,
                    transition: 'background-color .2s, color .2s, transform .2s',
                    '&::before': {
                      content: '""', position: 'absolute', left: collapsed ? 2 : -8, top: '22%', bottom: '22%', width: 4,
                      borderRadius: 4, bgcolor: C.mint, opacity: active ? 1 : 0, transform: active ? 'scaleY(1)' : 'scaleY(0.3)',
                      transition: 'opacity .25s, transform .25s',
                    },
                    '&:hover': { bgcolor: active ? 'rgba(183,228,199,0.2)' : 'rgba(255,255,255,0.06)', color: '#fff', transform: collapsed ? 'none' : 'translateX(3px)' },
                    '&:focus-visible': { outline: `2px solid ${C.mint}`, outlineOffset: 2 },
                  }}
                >
                  <ListItemIcon sx={{ color: active ? C.mint : 'inherit', minWidth: collapsed ? 0 : 40, justifyContent: 'center' }}>
                    {item.icon}
                  </ListItemIcon>
                  {!collapsed && (
                    <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: active ? 700 : 500, fontSize: '0.95rem', noWrap: true }} />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>
    </Box>

    {/* Footer actions */}
    <Box sx={{ p: collapsed ? 1.5 : 2, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
      {onToggle && (
        <Tooltip title={collapsed ? 'Expand menu' : ''} placement="right" arrow>
          <ListItemButton
            onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            sx={{ borderRadius: 2.5, mb: 0.8, color: C.text, justifyContent: collapsed ? 'center' : 'flex-start', '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', color: '#fff' }, '&:focus-visible': { outline: `2px solid ${C.mint}` } }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: collapsed ? 0 : 40 }}>
              {collapsed ? <ChevronRightRoundedIcon /> : <ChevronLeftRoundedIcon />}
            </ListItemIcon>
            {!collapsed && <ListItemText primary="Collapse" primaryTypographyProps={{ fontWeight: 500, fontSize: '0.95rem' }} />}
          </ListItemButton>
        </Tooltip>
      )}
      <Tooltip title={collapsed ? 'Sign out' : ''} placement="right" arrow>
        <ListItemButton
          onClick={onLogout} disabled={loggingOut}
          sx={{ borderRadius: 2.5, color: '#ff8a8a', justifyContent: collapsed ? 'center' : 'flex-start', '&:hover': { bgcolor: 'rgba(255,107,107,0.12)' }, '&:focus-visible': { outline: '2px solid #ff8a8a' } }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: collapsed ? 0 : 40 }}>
            {loggingOut ? <CircularProgress size={20} color="inherit" /> : <LogoutRoundedIcon />}
          </ListItemIcon>
          {!collapsed && <ListItemText primary="Sign out" primaryTypographyProps={{ fontWeight: 600 }} />}
        </ListItemButton>
      </Tooltip>
    </Box>
  </Box>
);

/* ---------------- Layout ---------------- */
const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [userName, setUserName] = useState('Admin');
  const [userEmail, setUserEmail] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [userAnchor, setUserAnchor] = useState(null);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebarCollapsed') === '1'; } catch { return false; }
  });

  // TODO: connect to a real notifications table. Empty for now so no fake count is shown.
  const notifications = [];

  useEffect(() => {
    try { localStorage.setItem('sidebarCollapsed', collapsed ? '1' : '0'); } catch { /* ignore */ }
  }, [collapsed]);

  // 1. Fetch user profile
  useEffect(() => {
    const getUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email || '');
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      if (profile?.full_name) setUserName(profile.full_name);
    };
    getUserProfile();
  }, []);

  // 2. Sign out
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err.message);
      setLoggingOut(false);
    }
  };

  const go = (path) => { navigate(path); setMobileOpen(false); };

  const current = menuItems.find((m) => isActivePath(m.path, location.pathname));
  const sideW = collapsed ? SLIM : FULL;
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Box sx={{ display: 'flex', bgcolor: C.page, minHeight: '100vh' }}>
      <GlobalStyles styles={`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,800&display=swap');
        @keyframes pageIn { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
      `} />

      {/* TOP BAR */}
      <AppBar
        position="fixed" elevation={0}
        sx={{
          width: { xs: '100%', md: `calc(100% - ${sideW}px)` }, ml: { md: `${sideW}px` },
          bgcolor: 'rgba(244,247,246,0.82)', backdropFilter: 'blur(14px) saturate(160%)', WebkitBackdropFilter: 'blur(14px) saturate(160%)',
          borderBottom: '1px solid rgba(6,24,15,0.07)', color: 'text.primary', zIndex: 1100,
          transition: 'width .3s ease, margin .3s ease',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: { xs: 64, md: 76 }, px: { xs: 1.5, md: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <IconButton aria-label="Open menu" onClick={() => setMobileOpen(true)} sx={{ display: { md: 'none' } }}>
              <MenuRoundedIcon />
            </IconButton>
            <Box sx={{ minWidth: 0 }}>
              <Typography noWrap sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: { xs: '1.2rem', md: '1.55rem' }, letterSpacing: '-0.02em', color: C.deep, lineHeight: 1.15 }}>
                {current?.text || 'Portal'}
              </Typography>
              <Typography noWrap variant="caption" sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>
                {today}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 2 } }}>
            <Tooltip title="Notifications">
              <IconButton aria-label="Notifications" onClick={(e) => setNotifAnchor(e.currentTarget)} sx={{ bgcolor: 'rgba(6,24,15,0.05)', '&:hover': { bgcolor: 'rgba(45,106,79,0.14)' } }}>
                <Badge badgeContent={notifications.length} color="error">
                  <NotificationsRoundedIcon color="action" />
                </Badge>
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem sx={{ my: 1.5, display: { xs: 'none', sm: 'block' } }} />
            <Box
              component="button" onClick={(e) => setUserAnchor(e.currentTarget)} aria-label="Account menu"
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, border: 0, bgcolor: 'transparent', cursor: 'pointer', font: 'inherit',
                p: 0.5, pr: { sm: 1.5 }, borderRadius: '999px', transition: 'background-color .2s',
                '&:hover': { bgcolor: 'rgba(6,24,15,0.05)' }, '&:focus-visible': { outline: `2px solid ${C.moss}` },
              }}
            >
              <Avatar sx={{ bgcolor: C.moss, width: 40, height: 40, fontWeight: 700, boxShadow: `0 0 0 3px ${C.mint}` }}>{makeInitials(userName)}</Avatar>
              <Box sx={{ textAlign: 'left', display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{userName}</Typography>
                <Typography variant="caption" color="text.secondary">Project Admin</Typography>
              </Box>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Notifications menu */}
      <Menu anchorEl={notifAnchor} open={Boolean(notifAnchor)} onClose={() => setNotifAnchor(null)} slotProps={{ paper: { sx: { mt: 1, width: 300, borderRadius: 3 } } }}>
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography sx={{ fontWeight: 700 }}>Notifications</Typography>
        </Box>
        <Divider />
        {notifications.length === 0 ? (
          <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">You're all caught up.</Typography>
          </Box>
        ) : notifications.map((n) => <MenuItem key={n.id}>{n.text}</MenuItem>)}
      </Menu>

      {/* Account menu */}
      <Menu anchorEl={userAnchor} open={Boolean(userAnchor)} onClose={() => setUserAnchor(null)} slotProps={{ paper: { sx: { mt: 1, minWidth: 240, borderRadius: 3 } } }}>
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography sx={{ fontWeight: 700 }}>{userName}</Typography>
          {userEmail && <Typography variant="caption" color="text.secondary">{userEmail}</Typography>}
        </Box>
        <Divider />
        <MenuItem onClick={() => { setUserAnchor(null); handleLogout(); }} sx={{ color: 'error.main', py: 1.3 }}>
          <ListItemIcon sx={{ color: 'inherit' }}><LogoutRoundedIcon fontSize="small" /></ListItemIcon>
          Sign out
        </MenuItem>
      </Menu>

      {/* SIDEBAR: permanent on desktop */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' }, width: sideW, flexShrink: 0, transition: 'width .3s ease',
          '& .MuiDrawer-paper': { width: sideW, boxSizing: 'border-box', border: 0, overflowX: 'hidden', transition: 'width .3s ease', boxShadow: '4px 0 28px rgba(6,24,15,0.12)' },
        }}
      >
        <SidebarContent collapsed={collapsed} pathname={location.pathname} onNavigate={go} onLogout={handleLogout} loggingOut={loggingOut} onToggle={() => setCollapsed((c) => !c)} />
      </Drawer>

      {/* SIDEBAR: slide-in on mobile */}
      <Drawer
        variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: FULL, maxWidth: '85vw', border: 0 } }}
      >
        <SidebarContent collapsed={false} pathname={location.pathname} onNavigate={go} onLogout={handleLogout} loggingOut={loggingOut} />
      </Drawer>

      {/* MAIN CONTENT */}
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, md: 4 } }}>
        <Toolbar sx={{ minHeight: { xs: 64, md: 76 } }} />
        <Box key={location.pathname} sx={{ animation: 'pageIn .45s ease-out both' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;