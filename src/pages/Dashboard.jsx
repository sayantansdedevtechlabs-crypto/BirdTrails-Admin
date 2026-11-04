import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Avatar, Button, Divider, Chip, Badge, ButtonBase,
  Skeleton, Alert, Tooltip, IconButton, GlobalStyles,
} from '@mui/material';

// --- DATABASE CLIENT ---
import { supabase } from '../supabaseClient';

// Icons
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import FiberNewRoundedIcon from '@mui/icons-material/FiberNewRounded';

const C = { deep: '#06180F', forest: '#1B4332', moss: '#2D6A4F', mint: '#B7E4C7', sun: '#F2C14E', line: '#E2E8F0' };
const HEADING = '"Bricolage Grotesque", sans-serif';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const timeAgo = (iso) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d > 1 ? 's' : ''} ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fullDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const initialsOf = (name) => name.trim().split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase();

const AVATAR_COLORS = ['#2D6A4F', '#0369A1', '#8A6B2F', '#6B5B7B', '#1F8FA3', '#9A4D3A'];
const colorFor = (name) => AVATAR_COLORS[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AVATAR_COLORS.length];

/* Numbers count up when data arrives */
const CountUp = ({ value }) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(value); return undefined; }
    let raf; const t0 = performance.now(); const from = 0;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / 900);
      setV(Math.round(from + (value - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{v.toLocaleString('en-IN')}</>;
};

const Dashboard = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState({ totalSpecies: 0, pendingLogs: 0, activeResearchers: 0, censusLogs: 0, pendingFeedback: 0 });
  const [activityFeed, setActivityFeed] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [live, setLive] = useState(false);
  const [adminName, setAdminName] = useState('Admin');

  const fetchDashboardStats = useCallback(async (showLoading = true) => {
    try {
      setError('');
      if (showLoading) setIsLoading(true);

      const [
        { count: speciesCount },
        { count: pendingCount },
        { count: researcherCount },
        { count: censusCount },
        { count: feedbackCount },
        { data: recentLogs },
      ] = await Promise.all([
        supabase.from('birds').select('*', { count: 'exact', head: true }),
        supabase.from('observations').select('*', { count: 'exact', head: true }).eq('is_verified', false),
        supabase.from('app_users').select('*', { count: 'exact', head: true }).neq('role', 'admin'),
        supabase.from('observations').select('*', { count: 'exact', head: true }).eq('type', 'census'),
        supabase.from('observations').select('*', { count: 'exact', head: true }).eq('needs_feedback', true).eq('feedback_status', 'pending'),
        supabase.from('observations').select('*').order('created_at', { ascending: false }).limit(5),
      ]);

      setStats({
        totalSpecies: speciesCount || 0,
        pendingLogs: pendingCount || 0,
        activeResearchers: researcherCount || 0,
        censusLogs: censusCount || 0,
        pendingFeedback: feedbackCount || 0,
      });

      if (recentLogs && recentLogs.length > 0) {
        const userIds = [...new Set(recentLogs.map((l) => l.user_id).filter(Boolean))];
        const profilesMap = {};
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase.from('app_users').select('id, full_name').in('id', userIds);
          (profilesData || []).forEach((p) => { profilesMap[p.id] = p.full_name; });
        }
        setActivityFeed(recentLogs.map((log) => {
          const name = profilesMap[log.user_id] || 'Unknown Explorer';
          return {
            id: log.id, user: name, verified: Boolean(log.is_verified),
            subject: log.bird_name || 'an unknown species', createdAt: log.created_at, avatar: initialsOf(name),
          };
        }));
      } else {
        setActivityFeed([]);
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching dashboard stats:', err.message);
      setError('Could not load the latest numbers. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Admin's own name for the greeting
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      if (profile?.full_name) setAdminName(profile.full_name.split(' ')[0]);
    })();
  }, []);

  useEffect(() => {
    fetchDashboardStats();
    const refresh = () => fetchDashboardStats(false);
    const channel = supabase
      .channel('dashboard_live_updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedback_messages', filter: 'sender_type=eq.user' }, refresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'observations' }, refresh)
      .subscribe((status) => setLive(status === 'SUBSCRIBED'));
    return () => { supabase.removeChannel(channel); };
  }, [fetchDashboardStats]);

  const cards = [
    { label: 'Cataloged species', value: stats.totalSpecies, icon: <ExploreRoundedIcon />, color: '#2E7D32', bg: '#E8F5E9', path: '/species' },
    { label: 'Pending observations', value: stats.pendingLogs, icon: <PendingActionsRoundedIcon />, color: '#B45309', bg: '#FFF4D6', path: '/observations', alert: stats.pendingLogs > 0 },
    { label: 'App users', value: stats.activeResearchers, icon: <GroupsRoundedIcon />, color: '#4B5563', bg: '#EEF0F3', path: '/users' },
    { label: 'Total census logs', value: stats.censusLogs, icon: <AssessmentRoundedIcon />, color: '#0369A1', bg: '#E0F2FE', path: '/census' },
  ];

  const attention = [
    stats.pendingLogs > 0 && { text: `${stats.pendingLogs} sighting${stats.pendingLogs > 1 ? 's' : ''} to review`, path: '/observations' },
    stats.pendingFeedback > 0 && { text: `${stats.pendingFeedback} expert request${stats.pendingFeedback > 1 ? 's' : ''}`, path: '/feedback' },
  ].filter(Boolean);

  const panelSx = { borderRadius: '24px', border: `1px solid ${C.line}`, boxShadow: '0 6px 28px rgba(6,24,15,0.04)', overflow: 'hidden', bgcolor: '#fff' };

  return (
    <Box>
      <GlobalStyles styles={`
        @keyframes trail { from { stroke-dashoffset: 1 } to { stroke-dashoffset: 0 } }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulseDot { 0%,100% { box-shadow: 0 0 0 0 rgba(180,83,9,.45) } 50% { box-shadow: 0 0 0 7px rgba(180,83,9,0) } }
        @keyframes rowIn { from { opacity: 0; transform: translateX(-10px) } to { opacity: 1; transform: none } }
      `} />

      {/* ============ WELCOME BANNER ============ */}
      <Box
        sx={{
          position: 'relative', overflow: 'hidden', mb: { xs: 3, md: 4 }, p: { xs: 3, md: 5 }, borderRadius: '28px', color: '#fff',
          background: `radial-gradient(90% 120% at 100% 0%, ${C.moss} 0%, transparent 60%), linear-gradient(135deg, ${C.deep} 0%, ${C.forest} 100%)`,
          boxShadow: '0 18px 50px rgba(6,24,15,0.22)',
        }}
      >
        <svg viewBox="0 0 400 200" preserveAspectRatio="xMaxYMid slice" aria-hidden="true"
          style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: '55%', opacity: 0.55, pointerEvents: 'none' }}>
          <path d="M-10 190 C 80 160, 120 40, 220 70 S 360 120, 420 20" pathLength="1" fill="none" stroke={C.mint} strokeWidth="2" strokeLinecap="round"
            strokeDasharray="1" style={{ animation: 'trail 2.6s ease-out .2s both' }} />
          <path d="M-10 210 C 90 190, 150 90, 250 110 S 370 150, 430 70" pathLength="1" fill="none" stroke={C.sun} strokeWidth="1.5" strokeLinecap="round"
            strokeDasharray="1" style={{ animation: 'trail 3.2s ease-out .5s both' }} />
        </svg>

        <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography component="h1" sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: { xs: '2rem', md: '3.1rem' }, lineHeight: 1.05, letterSpacing: '-0.03em' }}>
              {greeting()}, {adminName}.
            </Typography>
            <Typography sx={{ mt: 1.2, fontSize: { xs: '1rem', md: '1.15rem' }, color: 'rgba(255,255,255,0.8)' }}>
              {isLoading ? 'Checking the field…' : attention.length ? 'Here is what needs your attention today.' : 'Nothing is waiting for review. The field is quiet.'}
            </Typography>

            {!isLoading && attention.length > 0 && (
              <Box sx={{ mt: 2.5, display: 'flex', gap: 1.2, flexWrap: 'wrap' }}>
                {attention.map((a) => (
                  <Chip
                    key={a.text} label={a.text} onClick={() => navigate(a.path)} clickable
                    deleteIcon={<ArrowOutwardRoundedIcon />} onDelete={() => navigate(a.path)}
                    sx={{ bgcolor: C.sun, color: C.deep, fontWeight: 800, height: 36, '&:hover': { bgcolor: '#fff' }, '& .MuiChip-deleteIcon': { color: C.deep } }}
                  />
                ))}
              </Box>
            )}
          </Box>

          <Button
            onClick={() => fetchDashboardStats(true)} disabled={isLoading}
            startIcon={<RefreshRoundedIcon sx={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />}
            sx={{ bgcolor: '#fff', color: C.forest, fontWeight: 800, textTransform: 'none', borderRadius: '999px', px: 3, py: 1.1, '&:hover': { bgcolor: C.mint }, '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.7)', color: C.forest } }}
          >
            Refresh data
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }} action={<Button color="inherit" size="small" onClick={() => fetchDashboardStats(true)}>Try again</Button>}>
          {error}
        </Alert>
      )}

      {/* ============ KPI CARDS ============ */}
      <Box sx={{ display: 'grid', gap: { xs: 2, md: 3 }, mb: { xs: 3, md: 4 }, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' } }}>
        {cards.map((c) => (
          <ButtonBase
            key={c.label} component="div" onClick={() => navigate(c.path)} aria-label={`${c.label}: ${c.value}. Open`}
            sx={{
              ...panelSx, display: 'block', textAlign: 'left', p: 3, position: 'relative',
              transition: 'transform .25s ease, box-shadow .25s ease, border-color .25s',
              '& .go': { opacity: 0, transform: 'translate(-6px, 6px)', transition: 'all .25s' },
              '&:hover': { transform: 'translateY(-5px)', boxShadow: '0 16px 40px rgba(6,24,15,0.12)', borderColor: c.color },
              '&:hover .go, &.Mui-focusVisible .go': { opacity: 1, transform: 'none' },
              '&.Mui-focusVisible': { outline: `3px solid ${C.moss}`, outlineOffset: 2 },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
              <Box sx={{ p: 1.4, borderRadius: '14px', bgcolor: c.bg, color: c.color, display: 'flex' }}>{c.icon}</Box>
              {c.alert
                ? <Chip label="Needs review" size="small" sx={{ bgcolor: c.bg, color: c.color, fontWeight: 800, '&::before': { content: '""', width: 8, height: 8, borderRadius: '50%', bgcolor: c.color, ml: 1.2, animation: 'pulseDot 1.8s infinite' } }} />
                : <ArrowOutwardRoundedIcon className="go" sx={{ color: c.color }} />}
            </Box>
            {isLoading ? <Skeleton variant="text" width={90} sx={{ fontSize: '3rem' }} /> : (
              <Typography sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: { xs: '2.8rem', md: '3.2rem' }, lineHeight: 1, letterSpacing: '-0.03em', color: C.deep }}>
                <CountUp value={c.value} />
              </Typography>
            )}
            <Typography sx={{ mt: 1.2, fontWeight: 600, color: 'text.secondary' }}>{c.label}</Typography>
          </ButtonBase>
        ))}
      </Box>

      {/* ============ ACTIVITY + QUICK LINKS ============ */}
      <Box sx={{ display: 'grid', gap: { xs: 3, md: 4 }, gridTemplateColumns: { xs: '1fr', lg: '1.7fr 1fr' } }}>
        <Paper elevation={0} sx={{ ...panelSx, height: '100%' }}>
          <Box sx={{ px: 3, py: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.line}` }}>
            <Box>
              <Typography component="h2" sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: '1.35rem', letterSpacing: '-0.01em', color: C.deep }}>
                Recent field activity
              </Typography>
              {lastUpdated && (
                <Typography variant="caption" color="text.secondary">
                  Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </Typography>
              )}
            </Box>
            <Tooltip title="Refresh">
              <IconButton aria-label="Refresh activity" onClick={() => fetchDashboardStats(false)}><RefreshRoundedIcon /></IconButton>
            </Tooltip>
          </Box>

          {isLoading ? (
            <Box sx={{ p: 3, display: 'grid', gap: 2.5 }}>
              {[0, 1, 2, 3].map((i) => (
                <Box key={i} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Skeleton variant="circular" width={44} height={44} />
                  <Box sx={{ flex: 1 }}><Skeleton width="70%" /><Skeleton width="30%" /></Box>
                </Box>
              ))}
            </Box>
          ) : activityFeed.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: '1.2rem', color: C.deep }}>No sightings yet</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8, maxWidth: 360, mx: 'auto' }}>
                When app users sync their logs, the newest ones will appear here as they arrive.
              </Typography>
            </Box>
          ) : (
            <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
              {activityFeed.map((a, i) => (
                <React.Fragment key={a.id}>
                  <Box
                    component="li"
                    sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 3, py: 2.2, animation: `rowIn .4s ${i * 0.06}s ease-out both`, transition: 'background-color .2s', '&:hover': { bgcolor: '#F8FAFC' } }}
                  >
                    <Avatar sx={{ bgcolor: colorFor(a.user), width: 44, height: 44, fontWeight: 700, fontSize: '.95rem' }}>{a.avatar}</Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ lineHeight: 1.45 }}>
                        <Box component="span" sx={{ fontWeight: 800, color: C.deep }}>{a.user}</Box>
                        {a.verified ? ' verified a sighting of ' : ' logged a new sighting of '}
                        <Box component="span" sx={{ fontWeight: 800, color: '#0369A1' }}>{a.subject}</Box>
                      </Typography>
                      <Tooltip title={fullDate(a.createdAt)} placement="bottom-start">
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>{timeAgo(a.createdAt)}</Typography>
                      </Tooltip>
                    </Box>
                    <Chip
                      size="small" icon={a.verified ? <VerifiedRoundedIcon /> : <FiberNewRoundedIcon />} label={a.verified ? 'Verified' : 'New'}
                      sx={{ display: { xs: 'none', sm: 'inline-flex' }, fontWeight: 700, bgcolor: a.verified ? '#E8F5E9' : '#FFF4D6', color: a.verified ? '#2E7D32' : '#B45309', '& .MuiChip-icon': { color: 'inherit' } }}
                    />
                  </Box>
                  {i < activityFeed.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </Box>
          )}
        </Paper>

        <Paper elevation={0} sx={{ ...panelSx, p: 3, height: '100%' }}>
          <Typography component="h2" sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: '1.35rem', letterSpacing: '-0.01em', color: C.deep, mb: 2.5 }}>
            Quick links
          </Typography>
          <Box sx={{ display: 'grid', gap: 1.6 }}>
            <Button
              onClick={() => navigate('/feedback')} fullWidth
              startIcon={<Badge badgeContent={stats.pendingFeedback} color="error"><ForumRoundedIcon /></Badge>}
              sx={{ py: 1.6, px: 2.5, justifyContent: 'flex-start', borderRadius: '16px', textTransform: 'none', fontWeight: 800, color: '#B45309', bgcolor: '#FFF4D6', '&:hover': { bgcolor: '#FFE9B0', transform: 'translateX(4px)' }, transition: 'transform .2s, background-color .2s' }}
            >
              Review expert requests
            </Button>
            <Button
              onClick={() => navigate('/observations')} fullWidth startIcon={<PendingActionsRoundedIcon />}
              sx={{ py: 1.6, px: 2.5, justifyContent: 'flex-start', borderRadius: '16px', textTransform: 'none', fontWeight: 800, color: C.forest, bgcolor: '#EAF3EC', '&:hover': { bgcolor: C.mint, transform: 'translateX(4px)' }, transition: 'transform .2s, background-color .2s' }}
            >
              Open general ledger
            </Button>
            {/* NOTE: no territory-map route was provided; change this path when you add one */}
            <Button
              onClick={() => navigate('/observations')} fullWidth startIcon={<MapRoundedIcon />}
              sx={{ py: 1.6, px: 2.5, justifyContent: 'flex-start', borderRadius: '16px', textTransform: 'none', fontWeight: 800, color: '#0369A1', bgcolor: '#E0F2FE', '&:hover': { bgcolor: '#BAE0F7', transform: 'translateX(4px)' }, transition: 'transform .2s, background-color .2s' }}
            >
              Open territory map
            </Button>

            <Box sx={{ mt: 1, p: 2.2, borderRadius: '16px', border: `1px dashed ${live ? '#9CCFB0' : '#E0B8A0'}`, bgcolor: '#F8FAFC' }}>
              <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.secondary', mb: 1 }}>System status</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: live ? '#4CAF50' : '#E0A030', boxShadow: `0 0 10px ${live ? 'rgba(76,175,80,.55)' : 'rgba(224,160,48,.55)'}` }} />
                <Typography variant="caption" sx={{ fontWeight: 700 }}>{live ? 'Live updates on' : 'Reconnecting…'}</Typography>
              </Box>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                {live ? 'New sightings and requests appear automatically.' : 'Use Refresh data to update manually.'}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default Dashboard;