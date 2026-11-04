import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box, Typography, Paper, Avatar, TextField, IconButton, Chip, CircularProgress, Skeleton,
  InputAdornment, ButtonBase, Stack, Tooltip, Snackbar, Alert, GlobalStyles, useMediaQuery, useTheme,
} from '@mui/material';

// --- DATABASE CLIENT ---
import { supabase } from '../supabaseClient';

// Icons
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import AccessTimeFilledRoundedIcon from '@mui/icons-material/AccessTimeFilledRounded';
import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';

const C = { deep: '#06180F', forest: '#1B4332', moss: '#2D6A4F', mint: '#B7E4C7', line: '#E2E8F0' };
const HEADING = '"Bricolage Grotesque", sans-serif';

const AVATAR_COLORS = ['#2D6A4F', '#0369A1', '#8A6B2F', '#6B5B7B', '#1F8FA3', '#9A4D3A'];
const colorFor = (n) => AVATAR_COLORS[[...n].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AVATAR_COLORS.length];
const initialsOf = (n) => n.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

const timeAgo = (iso) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24); if (d < 7) return `${d} d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};
const dayLabel = (iso) => {
  const d = new Date(iso); const today = new Date();
  const y = new Date(); y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};
const clock = (iso) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

const QUICK_REPLIES = [
  'Thanks, this looks correct. I have verified the sighting.',
  'Could you add a clearer photo of this bird?',
  'Please confirm the exact location of this sighting.',
];

const FeedbackHub = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [contextImage, setContextImage] = useState('');
  const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });

  const chatEndRef = useRef(null);
  const selectedId = selectedRequest?.id;
  const notify = (msg, severity = 'success') => setToast({ open: true, msg, severity });

  // --- 1. FETCH requests flagged for feedback ---
  const fetchFeedbackRequests = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const { data: obsData, error: obsError } = await supabase.from('observations').select('*').eq('needs_feedback', true).order('created_at', { ascending: false });
      if (obsError) throw obsError;

      const userIds = [...new Set(obsData.map((o) => o.user_id))];
      const profilesMap = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('app_users').select('id, full_name').in('id', userIds);
        profiles?.forEach((p) => { profilesMap[p.id] = p.full_name; });
      }
      const list = obsData.map((obs) => {
        const name = profilesMap[obs.user_id] || 'Unknown Explorer';
        return { ...obs, explorer_name: name, avatar: initialsOf(name) };
      });
      setRequests(list);
      setSelectedRequest((prev) => (prev ? list.find((r) => r.id === prev.id) || prev : prev));
    } catch (error) {
      console.error('Error fetching requests:', error);
      notify('Could not load feedback requests. Check your connection and refresh.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbackRequests();
    // New researcher messages refresh the list so new requests show up on their own
    const channel = supabase
      .channel('feedback_hub_list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedback_messages', filter: 'sender_type=eq.user' }, () => fetchFeedbackRequests(false))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // --- 2. LOAD CHAT for the selected request ---
  useEffect(() => {
    if (!selectedId) return undefined;
    let cancelled = false;
    setMessages([]);
    setChatLoading(true);

    (async () => {
      const { data, error } = await supabase.from('feedback_messages').select('*').eq('observation_id', selectedId).order('created_at', { ascending: true });
      if (cancelled) return;
      if (error) notify('Could not load this conversation.', 'error'); else setMessages(data || []);
      setChatLoading(false);
      // Mark researcher messages as read
      await supabase.from('feedback_messages').update({ is_read: true }).eq('observation_id', selectedId).eq('sender_type', 'user').eq('is_read', false);
    })();

    const channel = supabase
      .channel(`admin_chat_${selectedId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedback_messages', filter: `observation_id=eq.${selectedId}` }, async (payload) => {
        setMessages((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]));
        if (payload.new.sender_type === 'user') await supabase.from('feedback_messages').update({ is_read: true }).eq('id', payload.new.id);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'feedback_messages', filter: `observation_id=eq.${selectedId}` }, (payload) => {
        setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? payload.new : m)));
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [selectedId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length, chatLoading]);

  // Photo for the context header (falls back to the bird directory when the phone's local file is unusable)
  useEffect(() => {
    setContextImage('');
    if (!selectedRequest) return undefined;
    const uri = selectedRequest.image_uri;
    if (uri && !uri.startsWith('file://')) { setContextImage(uri); return undefined; }
    if (!selectedRequest.bird_name) return undefined;
    let cancelled = false;
    supabase.from('birds').select('image_url').eq('common_name', selectedRequest.bird_name).maybeSingle().then(({ data }) => {
      if (!cancelled && data?.image_url) setContextImage(data.image_url);
    });
    return () => { cancelled = true; };
  }, [selectedId, selectedRequest?.image_uri, selectedRequest?.bird_name]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- 3. SEND ADMIN REPLY ---
  const handleSendReply = async () => {
    const text = replyText.trim();
    if (!text || !selectedRequest || isSending) return;
    setIsSending(true);
    setReplyText('');
    const { data, error } = await supabase.from('feedback_messages')
      .insert([{ observation_id: selectedRequest.id, user_id: selectedRequest.user_id, sender_type: 'admin', text }]).select().single();

    if (error) {
      console.error('Error sending reply:', error);
      setReplyText(text);
      notify('Could not send your message. It is still in the box, so you can try again.', 'error');
      setIsSending(false);
      return;
    }
    setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));

    if (selectedRequest.feedback_status !== 'answered') {
      const { error: updateError } = await supabase.from('observations').update({ feedback_status: 'answered' }).eq('id', selectedRequest.id);
      if (!updateError) {
        setRequests((list) => list.map((r) => (r.id === selectedRequest.id ? { ...r, feedback_status: 'answered' } : r)));
        setSelectedRequest((s) => (s ? { ...s, feedback_status: 'answered' } : s));
      }
    }
    setIsSending(false);
  };

  // --- derived data ---
  const counts = useMemo(() => ({
    all: requests.length,
    pending: requests.filter((r) => r.feedback_status !== 'answered').length,
    answered: requests.filter((r) => r.feedback_status === 'answered').length,
  }), [requests]);

  const visibleRequests = useMemo(() => {
    const q = search.toLowerCase();
    return requests.filter((r) => {
      const matchText = (r.explorer_name || '').toLowerCase().includes(q) || (r.bird_name || '').toLowerCase().includes(q);
      const answered = r.feedback_status === 'answered';
      return matchText && (filter === 'all' || (filter === 'answered' ? answered : !answered));
    });
  }, [requests, search, filter]);

  const showList = !isMobile || !selectedRequest;
  const showChat = !isMobile || !!selectedRequest;

  return (
    <Box sx={{ height: { xs: 'calc(100vh - 118px)', md: 'calc(100vh - 150px)' }, minHeight: 520, display: 'flex', flexDirection: 'column' }}>
      <GlobalStyles styles={`
        @keyframes msgIn { from { opacity: 0; transform: translateY(10px) scale(.98) } to { opacity: 1; transform: none } }
      `} />

      {!(isMobile && selectedRequest) && (
        <Box sx={{ mb: 2.5 }}>
          <Typography component="h1" sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: { xs: '2rem', md: '2.8rem' }, lineHeight: 1.05, letterSpacing: '-0.03em', color: C.deep }}>
            Expert feedback hub
          </Typography>
          <Typography sx={{ mt: 0.8, color: 'text.secondary' }}>
            {isLoading ? 'Loading requests…' : `${counts.pending} waiting for your reply, ${counts.answered} answered.`}
          </Typography>
        </Box>
      )}

      <Paper elevation={0} sx={{ display: 'flex', flex: 1, minHeight: 0, borderRadius: '24px', overflow: 'hidden', border: `1px solid ${C.line}`, boxShadow: '0 6px 28px rgba(6,24,15,0.04)' }}>
        {/* LEFT: request list */}
        {showList && (
          <Box sx={{ width: { xs: '100%', md: 370 }, flexShrink: 0, borderRight: { md: `1px solid ${C.line}` }, display: 'flex', flexDirection: 'column', bgcolor: '#FAFBFA' }}>
            <Box sx={{ p: 2, bgcolor: '#fff', borderBottom: `1px solid ${C.line}`, display: 'grid', gap: 1.5 }}>
              <TextField size="small" placeholder="Search researcher or species" value={search} onChange={(e) => setSearch(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '999px', bgcolor: '#F4F7F6' } }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon color="action" /></InputAdornment> }} inputProps={{ 'aria-label': 'Search requests' }} />
              <Stack direction="row" spacing={1}>
                {[['all', 'All'], ['pending', 'Pending'], ['answered', 'Answered']].map(([k, label]) => (
                  <Chip key={k} clickable size="small" onClick={() => setFilter(k)} label={`${label} (${counts[k]})`}
                    sx={{ fontWeight: 700, bgcolor: filter === k ? C.forest : '#EEF2F0', color: filter === k ? '#fff' : '#475569', '&:hover': { bgcolor: filter === k ? C.forest : '#E2E8F0' } }} />
                ))}
              </Stack>
            </Box>

            <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, flex: 1, overflowY: 'auto' }}>
              {isLoading ? (
                [0, 1, 2, 3].map((i) => (
                  <Box component="li" key={i} sx={{ display: 'flex', gap: 2, p: 2.5 }}>
                    <Skeleton variant="circular" width={44} height={44} /><Box sx={{ flex: 1 }}><Skeleton width="60%" /><Skeleton width="40%" /></Box>
                  </Box>
                ))
              ) : visibleRequests.length === 0 ? (
                <Box component="li" sx={{ p: 5, textAlign: 'center' }}>
                  <Typography sx={{ fontFamily: HEADING, fontWeight: 800, color: C.deep }}>{requests.length === 0 ? 'No feedback requests' : 'Nothing matches'}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.6 }}>
                    {requests.length === 0 ? 'When a researcher asks for help on a sighting, it appears here.' : 'Try another name or filter.'}
                  </Typography>
                </Box>
              ) : visibleRequests.map((req) => {
                const active = selectedId === req.id;
                const answered = req.feedback_status === 'answered';
                return (
                  <Box component="li" key={req.id} sx={{ borderBottom: `1px solid ${C.line}` }}>
                    <ButtonBase onClick={() => setSelectedRequest(req)} aria-current={active ? 'true' : undefined}
                      sx={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 2, p: 2.2, textAlign: 'left', bgcolor: active ? '#EAF3EC' : 'transparent', borderLeft: `4px solid ${active ? C.moss : 'transparent'}`, transition: 'background-color .2s', '&:hover': { bgcolor: active ? '#EAF3EC' : '#F4F7F6' }, '&.Mui-focusVisible': { outline: `2px solid ${C.moss}`, outlineOffset: -2 } }}>
                      <Avatar sx={{ bgcolor: colorFor(req.explorer_name), fontWeight: 700, width: 44, height: 44 }}>{req.avatar}</Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                          <Typography sx={{ fontWeight: 800, color: C.deep }} noWrap>{req.explorer_name}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>{timeAgo(req.created_at)}</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: '#4B5563', mb: 0.8 }} noWrap>{req.bird_name || 'Unknown species'}</Typography>
                        <Chip size="small" icon={answered ? <CheckCircleRoundedIcon /> : <AccessTimeFilledRoundedIcon />} label={answered ? 'Answered' : 'Pending'}
                          sx={{ height: 22, fontWeight: 800, fontSize: '.7rem', bgcolor: answered ? '#DCFCE7' : '#FEF3C7', color: answered ? '#166534' : '#92400E', '& .MuiChip-icon': { color: 'inherit', fontSize: 14 } }} />
                      </Box>
                    </ButtonBase>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        {/* RIGHT: conversation */}
        {showChat && (
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', bgcolor: '#F4F7F6' }}>
            {selectedRequest ? (
              <>
                <Box sx={{ p: { xs: 1.5, md: 2.5 }, borderBottom: `1px solid ${C.line}`, bgcolor: '#fff', display: 'flex', gap: 2, alignItems: 'center' }}>
                  {isMobile && <IconButton onClick={() => setSelectedRequest(null)} aria-label="Back to requests"><ArrowBackRoundedIcon /></IconButton>}
                  <Box sx={{ width: 68, height: 68, borderRadius: '16px', overflow: 'hidden', flexShrink: 0, bgcolor: '#E5E7EB', display: 'grid', placeItems: 'center' }}>
                    {contextImage
                      ? <Box component="img" src={contextImage} alt={selectedRequest.bird_name} onError={() => setContextImage('')} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <ImageNotSupportedIcon color="disabled" />}
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>About this sighting</Typography>
                    <Typography sx={{ fontFamily: HEADING, fontWeight: 800, fontSize: '1.35rem', lineHeight: 1.15, color: C.deep }} noWrap>{selectedRequest.bird_name || 'Unknown species'}</Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {selectedRequest.explorer_name} | {new Date(selectedRequest.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}{selectedRequest.location_name ? ` | ${selectedRequest.location_name}` : ''}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, md: 4 }, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                  {chatLoading ? (
                    <Box sx={{ m: 'auto' }}><CircularProgress size={30} sx={{ color: C.moss }} /></Box>
                  ) : messages.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 8 }}>No messages yet. Send a reply to start the conversation.</Typography>
                  ) : messages.map((msg, i) => {
                    const isAdmin = msg.sender_type === 'admin';
                    const newDay = i === 0 || new Date(messages[i - 1].created_at).toDateString() !== new Date(msg.created_at).toDateString();
                    const prevSame = i > 0 && !newDay && messages[i - 1].sender_type === msg.sender_type;
                    return (
                      <React.Fragment key={msg.id}>
                        {newDay && <Box sx={{ alignSelf: 'center', my: 1.5 }}><Chip size="small" label={dayLabel(msg.created_at)} sx={{ bgcolor: '#E3EBE6', fontWeight: 700, color: '#475569' }} /></Box>}
                        <Box sx={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start', mt: prevSame ? 0 : 1, animation: 'msgIn .3s ease-out both' }}>
                          <Box sx={{
                            maxWidth: { xs: '86%', md: '70%' }, px: 2, py: 1.3, borderRadius: '20px',
                            bgcolor: isAdmin ? C.moss : '#fff', color: isAdmin ? '#fff' : '#111827', border: isAdmin ? 'none' : `1px solid ${C.line}`,
                            borderBottomRightRadius: isAdmin ? 6 : 20, borderBottomLeftRadius: isAdmin ? 20 : 6, boxShadow: '0 2px 6px rgba(6,24,15,0.05)',
                          }}>
                            <Typography sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5 }}>{msg.text}</Typography>
                            <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', justifyContent: isAdmin ? 'flex-end' : 'flex-start', gap: 0.6, opacity: 0.8 }}>
                              <Typography variant="caption">{clock(msg.created_at)}</Typography>
                              {isAdmin && (
                                <Tooltip title={msg.is_read ? 'Read by the researcher' : 'Delivered'}>
                                  <DoneAllRoundedIcon sx={{ fontSize: 16, color: msg.is_read ? '#7DD3FC' : 'rgba(255,255,255,0.65)' }} />
                                </Tooltip>
                              )}
                            </Box>
                          </Box>
                        </Box>
                      </React.Fragment>
                    );
                  })}
                  <div ref={chatEndRef} />
                </Box>

                <Box sx={{ p: { xs: 1.5, md: 2.5 }, bgcolor: '#fff', borderTop: `1px solid ${C.line}` }}>
                  <Stack direction="row" spacing={1} sx={{ mb: 1.5, overflowX: 'auto', pb: 0.5 }}>
                    {QUICK_REPLIES.map((q) => (
                      <Chip key={q} clickable size="small" label={q} onClick={() => setReplyText(q)}
                        sx={{ flexShrink: 0, fontWeight: 600, bgcolor: '#EAF3EC', color: C.forest, '&:hover': { bgcolor: C.mint } }} />
                    ))}
                  </Stack>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
                    <TextField fullWidth multiline maxRows={4} placeholder="Type your expert reply. Enter sends, Shift+Enter adds a new line."
                      value={replyText} onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                      inputProps={{ 'aria-label': 'Reply message' }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '20px', bgcolor: '#F4F7F6' } }} />
                    <IconButton onClick={handleSendReply} disabled={!replyText.trim() || isSending} aria-label="Send reply"
                      sx={{ bgcolor: C.moss, color: '#fff', width: 52, height: 52, flexShrink: 0, transition: 'transform .2s', '&:hover': { bgcolor: C.forest, transform: 'scale(1.06)' }, '&.Mui-disabled': { bgcolor: '#E5E7EB', color: '#fff' } }}>
                      {isSending ? <CircularProgress size={22} color="inherit" /> : <SendRoundedIcon />}
                    </IconButton>
                  </Box>
                </Box>
              </>
            ) : (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', p: 4 }}>
                <ForumRoundedIcon sx={{ fontSize: 64, color: '#CBD5E1' }} />
                <Typography sx={{ mt: 2, fontFamily: HEADING, fontWeight: 800, fontSize: '1.4rem', color: C.deep }}>Select a request to start reviewing</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8, maxWidth: 340 }}>Pick a researcher on the left to read their question and reply.</Typography>
              </Box>
            )}
          </Box>
        )}
      </Paper>

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast((t) => ({ ...t, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.severity} variant="filled" onClose={() => setToast((t) => ({ ...t, open: false }))} sx={{ borderRadius: '14px', fontWeight: 600 }}>{toast.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default FeedbackHub;