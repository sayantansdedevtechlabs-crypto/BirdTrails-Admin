import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Typography, 
  Avatar, 
  Divider,
  IconButton,
  useTheme
} from '@mui/material';

// --- DATABASE CLIENT ---
import { supabase } from '../../supabaseClient';

// Icons
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import BugReportRoundedIcon from '@mui/icons-material/BugReportRounded';
import LibraryBooksRoundedIcon from '@mui/icons-material/LibraryBooksRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MenuOpenRoundedIcon from '@mui/icons-material/MenuOpenRounded';

// Assets
import newsLogo from '../../assets/News-Logo-1-removebg-preview.png';

const drawerWidth = 280;

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  
  // --- REAL LOGOUT LOGIC ---
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // App.jsx will detect the session cleared and redirect to /login
      // but we force a navigate just to be snappy
      navigate('/login'); 
    } catch (err) {
      console.error("Error signing out:", err.message);
    }
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardRoundedIcon />, path: '/' },
    { text: 'Bird Directory', icon: <LibraryBooksRoundedIcon />, path: '/species' },
    { text: 'Observation Ledger', icon: <BugReportRoundedIcon />, path: '/observations' },
    { text: 'Census Sessions', icon: <AssignmentRoundedIcon />, path: '/census' },
    { text: 'User Management', icon: <GroupRoundedIcon />, path: '/users' },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F8FAFC' }}>
      {/* Sidebar Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: '1px solid #E2E8F0',
            background: '#FFFFFF',
          },
        }}
      >
        <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <img src={newsLogo} alt="NEWS Logo" style={{ height: 40 }} />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.dark', lineHeight: 1.2 }}>
              BirdTrails
            </Typography>
            <Typography variant="caption" color="text.secondary">Admin Panel</Typography>
          </Box>
        </Box>

        <Divider sx={{ mx: 2, mb: 2 }} />

        <List sx={{ px: 2, flexGrow: 1 }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: 3,
                    bgcolor: isActive ? 'primary.light' : 'transparent',
                    color: isActive ? 'primary.main' : 'text.secondary',
                    '&:hover': { bgcolor: isActive ? 'primary.light' : '#F1F5F9' },
                  }}
                >
                  <ListItemIcon sx={{ color: isActive ? 'primary.main' : 'inherit', minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    primaryTypographyProps={{ fontWeight: isActive ? 700 : 500, fontSize: '0.9rem' }} 
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        {/* User Profile & Logout Section */}
        <Box sx={{ p: 2, mt: 'auto' }}>
          <Box sx={{ 
            p: 2, 
            borderRadius: 4, 
            bgcolor: '#F8FAFC', 
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5
          }}>
            <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 700, width: 36, height: 36 }}>A</Avatar>
            <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>Administrator</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>System Control</Typography>
            </Box>
          </Box>
          
          <ListItemButton 
            onClick={handleLogout}
            sx={{ 
              mt: 1, 
              borderRadius: 3, 
              color: '#C62828',
              '&:hover': { bgcolor: '#FFEBEE' } 
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
              <LogoutRoundedIcon />
            </ListItemIcon>
            <ListItemText primary="Sign Out" primaryTypographyProps={{ fontWeight: 700, fontSize: '0.9rem' }} />
          </ListItemButton>
        </Box>
      </Drawer>

      {/* Main Content Area */}
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 3, md: 5 }, width: { sm: `calc(100% - ${drawerWidth}px)` } }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;