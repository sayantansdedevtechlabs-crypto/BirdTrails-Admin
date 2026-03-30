import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Alert,
  InputAdornment,
  IconButton
} from '@mui/material';

// 1. We import your NEWS logo here (Make sure it is saved in src/assets/news-logo.png)
import newsLogo from '/Users/sayantan_banerjee/Documents/EKW-Bird_Trail_App/BOTH/bird-trail-admin/birdtrails-admin-react/src/assets/News-Logo-1-removebg-preview.png';

import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

const Login = () => {
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    if (username === 'admin' && password === 'admin123') {
      navigate('/dashboard'); 
    } else {
      setError('Invalid credentials. Try admin / admin123');
    }
  };

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        // Your chosen background image
        backgroundImage: 'url(https://plus.unsplash.com/premium_photo-1730160763932-4cba5dcc299e?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MzB8fGJpcmQlMjB3YWxscGFwZXJ8ZW58MHx8MHx8fDA%3D)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        
        // Your dark overlay
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0, right: 0, bottom: 0, left: 0,
          backgroundColor: 'rgba(1, 11, 5, 0.4)', 
          zIndex: 1,
        }
      }}
    >
      <Paper 
        elevation={12} 
        sx={{ 
          p: { xs: 4, md: 6 }, 
          width: '100%', 
          maxWidth: 450, 
          textAlign: 'center',
          zIndex: 2, 
          // Your 0.7 transparency + a blur effect for true Glassmorphism
          backgroundColor: 'rgba(255, 255, 255, 0.22)', 
          backdropFilter: 'blur(10px)', 
          borderRadius: 4, 
        }}
      >
        {/* The NEWS Logo replacing the old ForestIcon */}
        <Box sx={{ display: 'flex', justifyContent: 'center',mb:1, width: '100%' }}>
          <img 
            src={newsLogo} 
            alt="Nature Environment & Wildlife Society Logo" 
            style={{ 
              maxheight: '70px', // Slightly taller to read the text clearly
              width: 'auto', 
              maxWidth: '100%', 
              objectFit: 'contain', 
              marginBottom:8,
              marginTop: -15,
            }} 
          />
        </Box>

        <Typography variant="h4" color="#034a03ff" sx={{ fontWeight: 800, mb: 0.5, letterSpacing: '-0.5px' }}>
          BirdTrails
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, fontWeight: 500 }}>
          Scientific Research Portal
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

        <form onSubmit={handleLogin}>
          <TextField
            fullWidth
            placeholder="Username"
            variant="outlined"
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon color="action" />
                </InputAdornment>
              ),
              // Added a slight white background to inputs so they stand out from the card
              sx: { borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.6)' }
            }}
          />
          
          <TextField
            fullWidth
            placeholder="Password"
            type={showPassword ? 'text' : 'password'}
            variant="outlined"
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleClickShowPassword} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
              sx: { borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.6)' }
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disableElevation
            sx={{ 
              mt: 4, 
              mb: 2, 
              height: 52, 
              borderRadius: 2,
              fontSize: '1.1rem',
              fontWeight: 700,
            }}
          >
            Authenticate
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default Login;