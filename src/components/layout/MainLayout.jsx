import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, Drawer, AppBar, Toolbar, Typography, List, ListItem, 
  ListItemButton, ListItemIcon, ListItemText, Avatar, IconButton, Badge, Divider
} from '@mui/material';

// Icons
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import FormatListBulletedRoundedIcon from '@mui/icons-material/FormatListBulletedRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';

// Your Logo
import newsLogo from '../../assets/News-Logo-1-removebg-preview.png';

const drawerWidth = 280;

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => navigate('/login');

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardRoundedIcon />, path: '/dashboard' },
    { text: 'Bird Directory', icon: <FormatListBulletedRoundedIcon />, path: '/directory' },
    { text: 'Observations', icon: <MapRoundedIcon />, path: '/observations' },
    { text: 'Census Sessions', icon: <AssessmentRoundedIcon />, path: '/census' },
    { text: 'User Management', icon: <PeopleAltRoundedIcon />, path: '/users' },
  ];

  return (
    <Box sx={{ display: 'flex', bgcolor: '#F4F7F6', minHeight: '100vh' }}>
      
      {/* 1. THE GLASS TOP-BAR */}
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{ 
          width: `calc(100% - ${drawerWidth}px)`, 
          ml: `${drawerWidth}px`,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
          color: 'text.primary'
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', py: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.dark' }}>
            {menuItems.find(m => m.path === location.pathname)?.text || 'Portal'}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton sx={{ bgcolor: 'rgba(0,0,0,0.04)' }}>
              <Badge badgeContent={3} color="error">
                <NotificationsRoundedIcon color="action" />
              </Badge>
            </IconButton>
            <Divider orientation="vertical" variant="middle" flexItem />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}>
              <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Sayantan B.</Typography>
                <Typography variant="caption" color="text.secondary">Super Admin</Typography>
              </Box>
              <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>SB</Avatar>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      {/* 2. THE PREMIUM DARK SIDEBAR */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { 
            width: drawerWidth, 
            boxSizing: 'border-box',
            backgroundColor: '#0A1912', // Deep premium forest green
            color: '#A4B8AE', // Muted text for non-active items
            borderRight: 'none',
            boxShadow: '4px 0 24px rgba(0,0,0,0.05)'
          },
        }}
      >
        {/* Sidebar Brand/Logo Area */}
        <Box sx={{ p: 0.5, display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
          <Box sx={{ bgcolor: 'white', p: 1.5, borderRadius: 3, width: '85%', textAlign: 'center', mb: 2 }}>
            <img src={newsLogo} alt="NEWS Logo" style={{ maxHeight: '50px', objectFit: 'contain' }} />
          </Box>
        </Box>

        {/* Navigation List */}
        <Box sx={{ overflow: 'auto', px: 2 }}>
          <List>
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              
              return (
                <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                  <ListItemButton 
                    onClick={() => navigate(item.path)}
                    sx={{
                      borderRadius: 2.5, // Soft pill shape
                      py: 1.5,
                      backgroundColor: isActive ? 'primary.main' : 'transparent',
                      color: isActive ? '#FFFFFF' : '#A4B8AE',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        backgroundColor: isActive ? 'primary.main' : 'rgba(255,255,255,0.05)',
                        color: '#FFFFFF',
                        transform: isActive ? 'none' : 'translateX(4px)' // Slick hover slide
                      }
                    }}
                  >
                    <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.text} 
                      primaryTypographyProps={{ fontWeight: isActive ? 600 : 500, fontSize: '0.95rem' }} 
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>

        {/* Logout at bottom */}
        <Box sx={{ position: 'absolute', bottom: 0, width: '100%', p: 2 }}>
          <ListItemButton 
            onClick={handleLogout}
            sx={{ borderRadius: 2.5, color: '#ff6b6b', '&:hover': { bgcolor: 'rgba(255, 107, 107, 0.1)' } }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><LogoutRoundedIcon /></ListItemIcon>
            <ListItemText primary="Sign Out" primaryTypographyProps={{ fontWeight: 600 }} />
          </ListItemButton>
        </Box>
      </Drawer>

      {/* 3. MAIN CONTENT */}
      <Box component="main" sx={{ flexGrow: 1, p: 4, mt: 8 }}>
        <Outlet /> 
      </Box>
    </Box>
  );
};

export default MainLayout;