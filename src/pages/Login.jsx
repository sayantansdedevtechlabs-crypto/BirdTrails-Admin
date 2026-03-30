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
  IconButton,
  CircularProgress,
  Fade,
  Stack
} from '@mui/material';

// --- DATABASE CLIENT ---
import { supabase } from '../supabaseClient';

// Assets & Icons
import newsLogo from '../assets/News-Logo-1-removebg-preview.png';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ShieldMoonIcon from '@mui/icons-material/ShieldMoon';

const Login = () => {
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError) throw authError;
      navigate('/'); 
      
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
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
        backgroundImage: 'url(https://plus.unsplash.com/premium_photo-1730160763932-4cba5dcc299e?w=900&auto=format&fit=crop&q=60)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0, right: 0, bottom: 0, left: 0,
          backgroundColor: 'rgba(1, 25, 10, 0.55)',
          zIndex: 1,
        }
      }}
    >
      <Fade in={true} timeout={1000}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: { xs: 4, md: 6 }, 
            width: '90%', 
            maxWidth: 450, 
            textAlign: 'center',
            zIndex: 2, 
            backgroundColor: 'rgba(255, 255, 255, 0.12)', 
            backdropFilter: 'blur(15px)', 
            borderRadius: 6, 
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          }}
        >
          <Box sx={{ mb: 2 }}>
            <img src={newsLogo} alt="NEWS Logo" style={{ height: '80px', width: 'auto', marginBottom: 16 }} />
          </Box>

          <Typography variant="h4" sx={{ fontWeight: 900, color: '#fff', mb: 0.5 }}>
            BirdTrails
          </Typography>
          <Typography variant="body2" sx={{ mb: 4, color: 'rgba(255,255,255,0.8)', fontWeight: 500, letterSpacing: 2 }}>
            ADMINISTRATIVE PORTAL
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

          <form onSubmit={handleLogin}>
            <Stack spacing={2}>
              <TextField
                fullWidth
                placeholder="Administrator Email"
                variant="outlined"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                InputProps={{
                  startAdornment: (<InputAdornment position="start"><PersonIcon sx={{ color: '#fff' }} /></InputAdornment>),
                  sx: { borderRadius: 3, backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#fff' }
                }}
              />
              
              <TextField
                fullWidth
                placeholder="Secure Password"
                type={showPassword ? 'text' : 'password'}
                variant="outlined"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  startAdornment: (<InputAdornment position="start"><LockIcon sx={{ color: '#fff' }} /></InputAdornment>),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleClickShowPassword} sx={{ color: '#fff' }}>
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 3, backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#fff' }
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={isLoading}
                sx={{ mt: 2, height: 56, borderRadius: 3, fontWeight: 800, backgroundColor: '#2D6A4F' }}
              >
                {isLoading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Authenticate System'}
              </Button>
            </Stack>
          </form>

          <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, opacity: 0.7 }}>
             <ShieldMoonIcon sx={{ color: '#fff', fontSize: 16 }} />
             <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600 }}>
                End-to-End Encrypted Data Pipeline
             </Typography>
          </Box>
        </Paper>
      </Fade>
    </Box>
  );
};

export default Login;