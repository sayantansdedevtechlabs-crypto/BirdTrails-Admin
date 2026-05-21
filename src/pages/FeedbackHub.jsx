import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, Typography, Paper, List, ListItem, ListItemAvatar, Avatar, ListItemText, 
  Divider, TextField, IconButton, Chip, CircularProgress, Grid, Card, CardMedia, CardContent
} from '@mui/material';

// --- DATABASE CLIENT ---
import { supabase } from '../supabaseClient';

// Icons
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import AccessTimeFilledRoundedIcon from '@mui/icons-material/AccessTimeFilledRounded';
import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded'; // ➤ FIX: Replaced Mobile Icon with Web Icon

const FeedbackHub = () => {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const chatEndRef = useRef(null);

  // --- 1. INITIAL FETCH: Get all observations flagged for feedback ---
  useEffect(() => {
    fetchFeedbackRequests();
  }, []);

  const fetchFeedbackRequests = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch observations that need feedback
      const { data: obsData, error: obsError } = await supabase
        .from('observations')
        .select('*')
        .eq('needs_feedback', true) 
        .order('created_at', { ascending: false });

      if (obsError) throw obsError;

      // 2. Fetch User Profiles to get names
      const userIds = [...new Set(obsData.map(o => o.user_id))];
      let profilesMap = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('app_users').select('id, full_name').in('id', userIds);
        profiles?.forEach(p => { profilesMap[p.id] = p.full_name; });
      }

      // 3. Format the list
      const formattedRequests = obsData.map(obs => ({
        ...obs,
        explorer_name: profilesMap[obs.user_id] || 'Unknown Explorer',
        avatar: (profilesMap[obs.user_id] || 'U').substring(0, 2).toUpperCase()
      }));

      setRequests(formattedRequests);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. SELECT REQUEST & LOAD CHAT ---
  useEffect(() => {
    if (!selectedRequest) return;

    const fetchChat = async () => {
      // Fetch messages
      const { data, error } = await supabase
        .from('feedback_messages')
        .select('*')
        .eq('observation_id', selectedRequest.id)
        .order('created_at', { ascending: true });

      if (!error && data) setMessages(data);
      scrollToBottom();

      // ➤ NEW: Mark all user messages in this chat as READ (Blue Ticks!)
      await supabase
        .from('feedback_messages')
        .update({ is_read: true })
        .eq('observation_id', selectedRequest.id)
        .eq('sender_type', 'user')
        .eq('is_read', false);
    };

    fetchChat();

    // ➤ REAL-TIME LISTENER FOR NEW MESSAGES
    const channel = supabase
      .channel(`admin_chat_${selectedRequest.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedback_messages', filter: `observation_id=eq.${selectedRequest.id}` }, 
      async (payload) => {
        setMessages(prev => [...prev, payload.new]);
        scrollToBottom();
        
        // ➤ NEW: If the user sends a message WHILE we are looking at the chat, mark it read instantly.
        if (payload.new.sender_type === 'user') {
           await supabase.from('feedback_messages').update({ is_read: true }).eq('id', payload.new.id);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedRequest]);

  const scrollToBottom = () => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // --- 3. SEND ADMIN REPLY ---
  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedRequest) return;

    const newMsgText = replyText.trim();
    setReplyText('');

    const newMsg = {
      observation_id: selectedRequest.id,
      user_id: selectedRequest.user_id, 
      sender_type: 'admin',
      text: newMsgText,
    };

    const { error } = await supabase.from('feedback_messages').insert([newMsg]);
    if (error) {
      console.error("Error sending reply:", error);
      alert("Failed to send message.");
      return;
    }

    // Mark the observation as "answered" in the database
    if (selectedRequest.feedback_status !== 'answered') {
      await supabase
        .from('observations')
        .update({ feedback_status: 'answered' })
        .eq('id', selectedRequest.id);
        
      // Update local state to reflect the change
      setRequests(requests.map(req => req.id === selectedRequest.id ? { ...req, feedback_status: 'answered' } : req));
      setSelectedRequest({ ...selectedRequest, feedback_status: 'answered' });
    }
  };

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-in-out', height: 'calc(100vh - 100px)' }}>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.dark' }}>Expert Feedback Hub</Typography>
        <Typography variant="body1" color="text.secondary">Review field logs and chat directly with researchers.</Typography>
      </Box>

      <Paper sx={{ display: 'flex', height: '100%', borderRadius: 4, overflow: 'hidden', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        
        {/* LEFT PANE: Request List */}
        <Box sx={{ width: 350, borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', bgcolor: '#FAFAFA' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #E2E8F0', bgcolor: '#fff' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Active Requests ({requests.length})</Typography>
          </Box>
          
          <List sx={{ flexGrow: 1, overflowY: 'auto', p: 0 }}>
            {isLoading ? (
              <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress size={30} /></Box>
            ) : requests.length === 0 ? (
              <Box sx={{ p: 5, textAlign: 'center', color: 'text.secondary' }}>
                <Typography variant="body2">No feedback requests pending.</Typography>
              </Box>
            ) : (
              requests.map((req) => (
                <Box key={req.id}>
                  <ListItem 
                    button 
                    onClick={() => setSelectedRequest(req)}
                    sx={{ 
                      p: 2.5, 
                      bgcolor: selectedRequest?.id === req.id ? '#F0FDF4' : 'transparent',
                      borderLeft: selectedRequest?.id === req.id ? '4px solid #16A34A' : '4px solid transparent'
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 700 }}>{req.avatar}</Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={<Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#111827' }}>{req.explorer_name}</Typography>}
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="body2" sx={{ color: '#4B5563', mb: 0.5 }}>{req.bird_name || 'Unknown Species'}</Typography>
                          <Chip 
                            size="small" 
                            icon={req.feedback_status === 'answered' ? <CheckCircleRoundedIcon /> : <AccessTimeFilledRoundedIcon />} 
                            label={req.feedback_status === 'answered' ? 'Answered' : 'Pending'} 
                            sx={{ height: 20, fontSize: '0.65rem', bgcolor: req.feedback_status === 'answered' ? '#DCFCE7' : '#FEF3C7', color: req.feedback_status === 'answered' ? '#166534' : '#92400E' }} 
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                  <Divider />
                </Box>
              ))
            )}
          </List>
        </Box>

        {/* RIGHT PANE: Chat Interface */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', bgcolor: '#F8FAFC' }}>
          {selectedRequest ? (
            <>
              {/* Context Header */}
              <Box sx={{ p: 3, borderBottom: '1px solid #E2E8F0', bgcolor: '#fff', display: 'flex', gap: 3, alignItems: 'center' }}>
                <Card sx={{ width: 80, height: 80, borderRadius: 2, flexShrink: 0 }}>
                  {selectedRequest.image_uri ? (
                    <CardMedia component="img" height="80" image={selectedRequest.image_uri} />
                  ) : (
                    <Box sx={{ height: '100%', bgcolor: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ImageNotSupportedIcon color="disabled" />
                    </Box>
                  )}
                </Card>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1 }}>OBSERVATION CONTEXT</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#111827', mt: 0.5 }}>{selectedRequest.bird_name || 'Unknown Species'}</Typography>
                  <Typography variant="body2" color="text.secondary">Logged on {new Date(selectedRequest.created_at).toLocaleDateString()} • {selectedRequest.location_name}</Typography>
                </Box>
              </Box>

              {/* Chat History Area */}
              <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {messages.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 10 }}>No messages yet. Send a reply to start the conversation.</Typography>
                ) : (
                  messages.map((msg) => {
                    const isAdmin = msg.sender_type === 'admin';
                    return (
                      <Box key={msg.id} sx={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start' }}>
                        <Box sx={{ 
                          maxWidth: '70%', 
                          p: 2, 
                          borderRadius: 3, 
                          bgcolor: isAdmin ? '#16A34A' : '#fff', 
                          color: isAdmin ? '#fff' : '#111827',
                          border: isAdmin ? 'none' : '1px solid #E2E8F0',
                          borderBottomRightRadius: isAdmin ? 4 : 24,
                          borderBottomLeftRadius: isAdmin ? 24 : 4,
                          boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                        }}>
                          <Typography variant="body1">{msg.text}</Typography>
                          <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7, textAlign: isAdmin ? 'right' : 'left' }}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </Box>

              {/* Input Area */}
              <Box sx={{ p: 3, bgcolor: '#fff', borderTop: '1px solid #E2E8F0' }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField 
                    fullWidth 
                    variant="outlined" 
                    placeholder="Type your expert reply here..." 
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyPress={(e) => { if (e.key === 'Enter') handleSendReply(); }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: '#F8FAFC' } }}
                  />
                  <IconButton 
                    color="primary" 
                    disabled={!replyText.trim()}
                    onClick={handleSendReply}
                    sx={{ bgcolor: replyText.trim() ? '#16A34A' : '#E5E7EB', color: '#fff', width: 56, height: 56, borderRadius: 3, '&:hover': { bgcolor: '#15803D' } }}
                  >
                    <SendRoundedIcon />
                  </IconButton>
                </Box>
              </Box>
            </>
          ) : (
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
              <ForumRoundedIcon sx={{ fontSize: 60, color: '#CBD5E1' }} />
              <Typography variant="h6" sx={{ mt: 2, fontWeight: 700, color: '#94A3B8' }}>Select a request to start reviewing</Typography>
            </Box>
          )}
        </Box>

      </Paper>
    </Box>
  );
};

export default FeedbackHub;