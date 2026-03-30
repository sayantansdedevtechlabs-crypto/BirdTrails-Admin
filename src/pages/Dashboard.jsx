import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Grid, Paper, Card, CardContent, Avatar, 
  Button, List, ListItem, ListItemAvatar, ListItemText, Divider, LinearProgress, Chip
} from '@mui/material';

// --- DATABASE CLIENT ---
import { supabase } from '../supabaseClient';

// Icons
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalSpecies: 0,
    pendingLogs: 0,
    activeResearchers: 0,
    censusLogs: 0
  });
  
  const [activityFeed, setActivityFeed] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true);
      
      const [
        { count: speciesCount },
        { count: pendingCount },
        { count: researcherCount },
        { count: censusCount },
        { data: recentLogs }
      ] = await Promise.all([
        supabase.from('birds').select('*', { count: 'exact', head: true }),
        supabase.from('observations').select('*', { count: 'exact', head: true }).eq('is_verified', false),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'researcher'),
        supabase.from('observations').select('*', { count: 'exact', head: true }).eq('type', 'census'),
        supabase.from('observations').select('*').order('created_at', { ascending: false }).limit(4)
      ]);

      setStats({
        totalSpecies: speciesCount || 0,
        pendingLogs: pendingCount || 0,
        activeResearchers: researcherCount || 0,
        censusLogs: censusCount || 0
      });

      // --- FETCH THE PROFILE NAMES FOR THE ACTIVITY FEED ---
      if (recentLogs && recentLogs.length > 0) {
        
        // 1. Extract all the unique user_ids from the recent logs
        const userIds = [...new Set(recentLogs.map(log => log.user_id).filter(Boolean))];
        
        let profilesMap = {};
        
        // 2. Fetch only the profiles that match those IDs
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('app_users')
            .select('id, full_name')
            .in('id', userIds);
            
          if (profilesData) {
            // Create a quick lookup dictionary { "id": "Full Name" }
            profilesData.forEach(p => { profilesMap[p.id] = p.full_name; });
          }
        }

        // 3. Format the Activity Feed with the Real Names
        const formattedActivity = recentLogs.map((log) => {
          const dateStr = new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
          
          // Look up the name, fallback to 'Unknown Explorer' if not found
          const actualName = profilesMap[log.user_id] || 'Unknown Explorer';
          
          return {
            id: log.id,
            user: actualName,
            action: log.is_verified ? 'verified a sighting of' : 'logged a new sighting of',
            subject: log.bird_name || 'an unknown species',
            time: dateStr,
            avatar: actualName.substring(0, 2).toUpperCase()
          };
        });
        
        setActivityFeed(formattedActivity);
      } else {
        setActivityFeed([]);
      }

    } catch (error) {
      console.error('Error fetching dashboard stats:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      
      {/* WELCOME BANNER */}
      <Box sx={{ 
        p: 4, mb: 4, borderRadius: 4, 
        background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
        color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 10px 30px rgba(27, 67, 50, 0.2)'
      }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, letterSpacing: -1 }}>
            Welcome back, Admin.
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 400, opacity: 0.9 }}>
            Here is what's happening in the field today.
          </Typography>
        </Box>
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2 }}>
          <Button onClick={fetchDashboardStats} variant="contained" sx={{ bgcolor: 'white', color: '#1B4332', fontWeight: 700, '&:hover': { bgcolor: '#f0f0f0' } }}>
            Refresh Data
          </Button>
        </Box>
      </Box>

      {/* KPI STAT CARDS */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #E2E8F0', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#E8F5E9', color: '#2E7D32' }}><ExploreRoundedIcon /></Box>
                {isLoading && <LinearProgress sx={{ width: 40, borderRadius: 2 }} />}
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.dark' }}>{stats.totalSpecies}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mt: 1 }}>Cataloged Species</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #E2E8F0', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#FFF8E1', color: '#F57F17' }}><PendingActionsRoundedIcon /></Box>
                <Chip label="Needs Review" size="small" sx={{ bgcolor: '#FFF8E1', color: '#F57F17', fontWeight: 700, fontSize: '0.7rem' }} />
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.dark' }}>{stats.pendingLogs}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mt: 1 }}>Pending Observations</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #E2E8F0', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#F3F4F6', color: '#4B5563' }}><GroupsRoundedIcon /></Box>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.dark' }}>{stats.activeResearchers}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mt: 1 }}>Active Field Researchers</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #E2E8F0', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#E0F2FE', color: '#0369A1' }}><AssessmentRoundedIcon /></Box>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.dark' }}>{stats.censusLogs}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mt: 1 }}>Total Census Logs</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* LOWER SECTION: Activity & Quick Actions */}
      <Grid container spacing={4}>
        
        <Grid item xs={12} md={8}>
          <Paper sx={{ borderRadius: 4, border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', overflow: 'hidden', height: '100%' }}>
            <Box sx={{ p: 3, borderBottom: '1px solid #E2E8F0', bgcolor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.dark' }}>Recent Field Activity</Typography>
            </Box>
            
            {activityFeed.length === 0 && !isLoading ? (
               <Box sx={{ p: 5, textAlign: 'center', color: 'text.secondary' }}>
                 <Typography variant="body1">No recent activity found.</Typography>
                 <Typography variant="caption">When mobile users sync their logs, they will appear here instantly.</Typography>
               </Box>
            ) : (
              <List disablePadding>
                {activityFeed.map((activity, index) => (
                  <React.Fragment key={activity.id}>
                    <ListItem sx={{ py: 2.5, px: 3 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', fontWeight: 700 }}>{activity.avatar}</Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={
                          <Typography variant="body1">
                            <Box component="span" sx={{ fontWeight: 700, color: 'primary.dark' }}>{activity.user}</Box> 
                            {' '}{activity.action}{' '}
                            <Box component="span" sx={{ fontWeight: 700, color: '#0369A1' }}>{activity.subject}</Box>
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            {activity.time}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {index < activityFeed.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ borderRadius: 4, border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.dark', mb: 3 }}>Quick Links</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button variant="outlined" color="primary" fullWidth startIcon={<PendingActionsRoundedIcon />} sx={{ py: 1.5, justifyContent: 'flex-start', px: 3, borderRadius: 3, fontWeight: 700, color: '#F57F17', borderColor: '#F57F17', '&:hover': { bgcolor: '#FFF8E1', borderColor: '#F57F17' } }}>
                Review Pending Logs
              </Button>
              <Button variant="outlined" color="primary" fullWidth startIcon={<MapRoundedIcon />} sx={{ py: 1.5, justifyContent: 'flex-start', px: 3, borderRadius: 3, fontWeight: 700 }}>
                Open Territory Map
              </Button>
              <Box sx={{ mt: 2, p: 2, bgcolor: '#F8FAFC', borderRadius: 3, border: '1px dashed #B0BEC5' }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1 }}>System Status</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#4CAF50', boxShadow: '0 0 10px rgba(76, 175, 80, 0.5)' }} />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>Mobile Sync Active</Typography>
                </Box>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>Connected to production database.</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

      </Grid>
    </Box>
  );
};

export default Dashboard;