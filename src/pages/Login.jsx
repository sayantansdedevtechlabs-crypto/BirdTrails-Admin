import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Alert, InputAdornment,
  IconButton, CircularProgress, Stack, GlobalStyles,
} from '@mui/material';
import { supabase } from '../supabaseClient';
import newsLogo from '../assets/News-Logo-1-removebg-preview.png';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ShieldMoonIcon from '@mui/icons-material/ShieldMoon';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

/* ------------------------------------------------------------------
   CONTENT: birds recorded at the East Kolkata Wetlands.
   Each bird: name, scientific, blurb, habitat, status, image (URL or
   imported asset), tint (fallback colour shown if no image).
   Replace blurbs/images with the NEWS website content when ready.
------------------------------------------------------------------- */
const BIRDS = [
  {
    name: 'Northern Pintail',
    scientific: 'Anas acuta',
    fact: 'Some pintails fly thousands of kilometres from their breeding grounds in the far north to reach India for the winter.',
    blurb: 'An elegant duck with a long, slender neck and a pointed tail. Flocks arrive on the fish ponds each winter.',
    habitat: 'Open water and fish ponds',
    status: 'Winter visitor',
    image: 'https://images.pexels.com/photos/36037567/pexels-photo-36037567.jpeg',
    tint: '#8C7B6B',
  },
  {
    name: 'Garganey',
    scientific: 'Spatula querquedula',
    fact: 'Males make a dry, crackling call that sounds like a wooden rattle. It is a long-distance migrant that winters in the tropics.',
    blurb: 'A small dabbling duck with a bold white stripe above the eye. It feeds in shallow, weedy water.',
    habitat: 'Shallow, vegetated ponds',
    status: 'Winter visitor',
    image: 'https://media.istockphoto.com/id/1167551204/photo/garganey-department.jpg?b=1&s=612x612&w=0&k=20&c=yYVguMljfdZvBBwOMJs7V95xug_FHc6lRJEpU_v8tl4=',
    tint: '#5E7F6E',
  },
  {
    name: 'Wood Sandpiper',
    scientific: 'Tringa glareola',
    fact: 'On its northern breeding grounds it sometimes nests in trees, using the old nests of other birds.',
    blurb: 'A slim, speckled wader that probes the muddy edges of ponds and flooded fields, bobbing as it walks.',
    habitat: 'Muddy edges and paddy fields',
    status: 'Winter visitor',
    image: 'https://images.pexels.com/photos/33216052/pexels-photo-33216052.jpeg',
    tint: '#A38F6A',
  },
  {
    name: 'Western Marsh Harrier',
    scientific: 'Circus aeruginosus',
    fact: 'During courtship the male passes food to the female in mid-air, and she flips over to catch it.',
    blurb: 'Glides low over the reeds with wings held in a shallow V, watching for movement below.',
    habitat: 'Reed beds and open marsh',
    status: 'Winter visitor',
    image: 'https://images.pexels.com/photos/5491710/pexels-photo-5491710.jpeg',
    tint: '#7A5C3E',
  },
  {
    name: 'Little Cormorant',
    scientific: 'Microcarbo niger',
    fact: 'Cormorant feathers soak up water, which helps them dive. That is why you see them standing with wings spread to dry.',
    blurb: 'A compact diver that chases fish underwater, then perches with wings spread out to dry.',
    habitat: 'Fish ponds and canals',
    status: 'Resident',
    image: 'https://images.pexels.com/photos/34826721/pexels-photo-34826721.jpeg',
    tint: '#2F4B4F',
  },
  {
    name: 'Great Egret',
    scientific: 'Ardea alba',
    fact: 'In the late 1800s egrets were hunted for their breeding plumes, which fashion trade used on hats. The outcry helped start bird protection laws and groups.',
    blurb: 'A tall white heron that stands very still in the shallows, then strikes at fish with its long neck.',
    habitat: 'Shallow ponds and wetland edges',
    status: 'Resident',
    image: 'https://images.pexels.com/photos/14936433/pexels-photo-14936433.jpeg',
    tint: '#9FB8B0',
  },
  {
    name: 'White-throated Kingfisher',
    scientific: 'Halcyon smyrnensis',
    fact: 'Despite the name, it often hunts far from water, catching insects, lizards and small rodents as well as fish.',
    blurb: 'A bright blue and chestnut kingfisher with a loud, rattling call. It hunts insects and fish from low perches.',
    habitat: 'Dikes, banks and ponds',
    status: 'Resident',
    image: 'https://images.pexels.com/photos/38430438/pexels-photo-38430438.jpeg',
    tint: '#1F8FA3',
  },
  {
    name: 'Purple Heron',
    scientific: 'Ardea purpurea',
    fact: 'Its very long toes spread its weight, so it can walk across floating plants without sinking.',
    blurb: 'A secretive heron with a long, striped neck. It hides in dense reeds and hunts from the cover.',
    habitat: 'Dense reeds and emergent vegetation',
    status: 'Resident',
    image: 'https://images.pexels.com/photos/35589023/pexels-photo-35589023.jpeg',
    tint: '#6B5B7B',
  },
];

// Number of birds shown per visit. Raise it (max 8) to show more.
const VISIBLE_COUNT = 5;

// Fisher-Yates shuffle (unbiased), returns a new array.
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Photos: drop files into public/birds/ named like northern-pintail.jpg
// (slug of the bird name). Missing files show an illustrated placeholder.
const slug = (n) => n.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
BIRDS.forEach((b) => { if (!b.image) b.image = `/birds/${slug(b.name)}.jpg`; });

const C = {
  forest: '#06180F',
  moss: '#2D6A4F',
  mint: '#B7E4C7',
  mist: '#EAF3EC',
  sun: '#F2C14E',
};

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* Tracks scroll position with rAF so animations stay smooth. */
const useScrollY = () => {
  const [y, setY] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setY(window.scrollY));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);
  return y;
};


const useInView = (threshold = 0.35) => {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen];
};

const Counter = ({ to, run }) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(to); return undefined; }
    let raf; const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / 1600);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, to]);
  return <>{v.toLocaleString('en-IN')}</>;
};

/* Placeholder shown until a real photo exists in public/birds/ */
const BirdArt = ({ tint }) => (
  <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: `linear-gradient(160deg, ${tint}, ${C.forest})` }}>
    <svg viewBox="0 0 200 200" width="55%" aria-hidden="true" style={{ opacity: 0.9, animation: 'drift 4s ease-in-out infinite' }}>
      <path fill="#fff" fillOpacity=".92" d="M30 118c18-34 52-52 88-46l30-18-6 24c14 8 24 22 26 40-14-10-30-12-46-6-16 24-46 36-76 24l-16 10 4-20c-6-2-10-6-4-8z" />
      <circle cx="136" cy="72" r="4" fill={tint} />
    </svg>
  </Box>
);

const BirdImage = ({ bird, active }) => {
  const [failed, setFailed] = useState(!bird.image);
  return (
    <Box sx={{ position: 'absolute', inset: 0, opacity: active ? 1 : 0, transform: active ? 'scale(1)' : 'scale(1.12)', transition: 'opacity .8s ease, transform 1.2s ease' }}>
      {failed
        ? <BirdArt tint={bird.tint} />
        : <img src={bird.image} alt={active ? bird.name : ''} onError={() => setFailed(true)} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
    </Box>
  );
};

/* Facts below come from public sources about NEWS (founded 1991, Kolkata). */
const PILLARS = [
  {
    key: 'Mangroves', tint: '#2D6A4F',
    title: 'Restoring the Sundarbans mangroves',
    text: 'Since 2010 NEWS has worked with island communities to bring mangroves back. Mangroves shield the earthen embankments from tides and floods, and about 500 local people have been trained as mangrove stewards.',
  },
  {
    key: 'Wildlife', tint: '#8A6B2F',
    title: 'Helping wildlife in the city',
    text: 'In 2017 Kolkata airport authorities asked NEWS to safely capture golden jackals living inside the airport grounds, so that both animals and flights stay safe.',
  },
  {
    key: 'Community', tint: '#1F6F8B',
    title: 'Learning with local communities',
    text: 'NEWS runs awareness camps across the Sundarbans and trains villagers in low-cost, sustainable methods, including integrated farming that blends traditional practice with new technology.',
  },
];

const About = () => {
  const [ref, seen] = useInView(0.25);
  const [tab, setTab] = useState(0);
  const p = PILLARS[tab];
  const stats = [
    { to: 35, label: 'years of conservation work since 1991' },
    { to: 500, label: 'mangrove stewards trained with local communities' },
    { to: 400000, label: 'mangroves planned in one Bali Island project (2008)' },
  ];
  return (
    <Box ref={ref} id="about" sx={{ bgcolor: C.mist, color: C.forest, py: { xs: 9, md: 14 } }}>
      <Box sx={{ maxWidth: 1240, mx: 'auto', px: { xs: 2.5, md: 6 } }}>
        <Typography component="h2" sx={{ fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: 800, fontSize: { xs: '2.2rem', md: '4rem' }, lineHeight: 1.05, letterSpacing: '-0.03em', maxWidth: 860 }}>
          Conservation that starts with the people who live closest to nature.
        </Typography>
        <Typography sx={{ mt: 3, maxWidth: 640, fontSize: { xs: '1rem', md: '1.15rem' }, lineHeight: 1.7, color: '#34503F' }}>
          Nature Environment &amp; Wildlife Society (NEWS) is a conservation non-profit based in Kolkata. Founded in 1991, it combines research, community work and policy advocacy to protect wildlife, ecology and natural resources while supporting sustainable livelihoods.
        </Typography>

        <Box sx={{ mt: { xs: 6, md: 9 }, display: 'grid', gap: { xs: 4, md: 6 }, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
          {stats.map((st) => (
            <Box key={st.label}>
              <Typography sx={{ fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: 800, fontSize: { xs: '3.4rem', md: '4.6rem' }, lineHeight: 1, letterSpacing: '-0.03em', color: C.moss }}>
                <Counter to={st.to} run={seen} />
              </Typography>
              <Typography sx={{ mt: 1, maxWidth: 260, color: '#34503F' }}>{st.label}</Typography>
            </Box>
          ))}
        </Box>

        {/* interactive pillars */}
        <Box sx={{ mt: { xs: 7, md: 10 }, display: 'grid', gap: { xs: 2.5, md: 4 }, gridTemplateColumns: { xs: '1fr', md: '0.8fr 1.2fr' } }}>
          <Stack role="tablist" aria-label="What NEWS does" direction={{ xs: 'row', md: 'column' }} spacing={1.5} sx={{ overflowX: 'auto', pb: { xs: 1, md: 0 } }}>
            {PILLARS.map((pl, i) => (
              <Box
                key={pl.key} component="button" role="tab" aria-selected={i === tab} onClick={() => setTab(i)}
                sx={{
                  cursor: 'pointer', textAlign: 'left', border: 0, font: 'inherit', whiteSpace: 'nowrap',
                  px: 3, py: { xs: 1.6, md: 2.6 }, borderRadius: '18px',
                  fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: 800, fontSize: { xs: '1.05rem', md: '1.6rem' },
                  bgcolor: i === tab ? C.forest : 'transparent', color: i === tab ? '#fff' : C.forest,
                  boxShadow: i === tab ? '0 14px 34px rgba(6,24,15,0.25)' : 'inset 0 0 0 1.5px rgba(6,24,15,0.18)',
                  transform: i === tab ? 'translateX(0)' : 'none',
                  transition: 'all .3s ease',
                  '&:hover': { bgcolor: i === tab ? C.forest : 'rgba(45,106,79,0.12)' },
                  '&:focus-visible': { outline: `3px solid ${C.moss}`, outlineOffset: 3 },
                }}
              >
                {pl.key}
              </Box>
            ))}
          </Stack>

          <Box
            key={tab} role="tabpanel"
            sx={{
              p: { xs: 3.5, md: 6 }, borderRadius: '32px', color: '#fff', minHeight: { md: 340 },
              background: `linear-gradient(150deg, ${p.tint}, ${C.forest})`,
              animation: 'rise .5s ease-out both',
            }}
          >
            <Typography component="h3" sx={{ fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: 800, fontSize: { xs: '1.7rem', md: '2.4rem' }, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              {p.title}
            </Typography>
            <Typography sx={{ mt: 2.5, maxWidth: 560, fontSize: { xs: '1rem', md: '1.12rem' }, lineHeight: 1.7, color: 'rgba(255,255,255,0.88)' }}>
              {p.text}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '14px',
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.08)',
    transition: 'background-color .2s, box-shadow .2s',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.18)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
    '&.Mui-focused': { backgroundColor: 'rgba(255,255,255,0.14)', boxShadow: `0 0 0 4px ${C.mint}33` },
    '&.Mui-focused fieldset': { borderColor: C.mint, borderWidth: 1 },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
  '& .MuiInputLabel-root.Mui-focused': { color: C.mint },
  '& input:-webkit-autofill': {
    WebkitBoxShadow: '0 0 0 100px #12301F inset',
    WebkitTextFillColor: '#fff',
  },
};

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const y = useScrollY();
  const exploreRef = useRef(null);
  const [progress, setProgress] = useState(0);

  // Progress (0 to 1) through the pinned "Explore birds" section.
  useEffect(() => {
    const el = exploreRef.current;
    if (!el) return;
    const top = el.offsetTop;
    const total = el.offsetHeight - window.innerHeight;
    setProgress(clamp((y - top) / total));
  }, [y]);

  // Picks a fresh random order (and selection) on every page load.
  const [birds] = useState(() => shuffle(BIRDS).slice(0, VISIBLE_COUNT));
  const active = Math.min(birds.length - 1, Math.floor(progress * birds.length));
  const heroFade = clamp(1 - y / 600);
  const [showFact, setShowFact] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  useEffect(() => { setShowFact(false); }, [active]);

  const onTilt = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTilt({ x: ((e.clientX - r.left) / r.width - 0.5) * 10, y: -((e.clientY - r.top) / r.height - 0.5) * 10 });
  };
  const jumpTo = (i) => {
    const el = exploreRef.current;
    const total = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: el.offsetTop + ((i + 0.5) / birds.length) * total, behavior: 'smooth' });
  };
  const goTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      navigate('/');
    } catch (err) {
      setError(err.message || 'Sign in failed. Check your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToExplore = () =>
    exploreRef.current?.scrollIntoView({ behavior: 'smooth' });

  return (
    <Box sx={{ bgcolor: C.forest, color: '#fff', fontFamily: '"Manrope", sans-serif' }}>
      <GlobalStyles styles={`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,800&family=Manrope:wght@400;500;700&display=swap');
        html { scroll-behavior: smooth; }
        @keyframes drift { 0%,100% { transform: translate3d(0,0,0) } 50% { transform: translate3d(0,-14px,0) } }
        @keyframes rise { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: none } }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
        }
      `} />

      {/* ============ FLOATING NAV ============ */}
      <Stack
        component="nav" aria-label="Sections" direction="row" spacing={0.5}
        sx={{
          position: 'fixed', top: 14, left: '50%', zIndex: 20, p: 0.6, borderRadius: '999px',
          bgcolor: 'rgba(6,24,15,0.62)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.14)',
          opacity: y > 420 ? 1 : 0, pointerEvents: y > 420 ? 'auto' : 'none',
          transform: `translateX(-50%) translateY(${y > 420 ? 0 : -16}px)`, transition: 'opacity .35s, transform .35s',
        }}
      >
        {[['Sign in', () => window.scrollTo({ top: 0, behavior: 'smooth' })], ['Explore birds', () => scrollToExplore()], ['About us', () => goTo('about')]].map(([label, fn]) => (
          <Button key={label} onClick={fn} sx={{ color: '#fff', textTransform: 'none', fontWeight: 700, borderRadius: '999px', px: { xs: 1.4, sm: 2.2 }, fontSize: { xs: '.8rem', sm: '.95rem' }, whiteSpace: 'nowrap', '&:hover': { bgcolor: 'rgba(183,228,199,0.18)' } }}>
            {label}
          </Button>
        ))}
      </Stack>

      {/* ============ HERO + LOGIN ============ */}
      <Box sx={{ position: 'relative', minHeight: '100svh', overflow: 'hidden' }}>
        <Box
          sx={{
            position: 'absolute', inset: '-8% 0',
            backgroundImage: 'url(https://plus.unsplash.com/premium_photo-1730160763932-4cba5dcc299e?w=1600&auto=format&fit=crop&q=70)',
            backgroundSize: 'cover', backgroundPosition: 'center',
            transform: `translate3d(0, ${y * 0.25}px, 0) scale(${1 + y * 0.0002})`,
            willChange: 'transform',
          }}
        />
        <Box sx={{ position: 'absolute', inset: 0, background: `linear-gradient(100deg, ${C.forest}F2 0%, ${C.forest}99 45%, ${C.forest}40 100%), linear-gradient(0deg, ${C.forest} 0%, transparent 35%)` }} />

        <Box
          sx={{
            position: 'relative', zIndex: 2, minHeight: '100svh',
            maxWidth: 1240, mx: 'auto', px: { xs: 2.5, md: 6 }, py: { xs: 4, md: 6 },
            display: 'grid', alignItems: 'center', gap: { xs: 5, md: 8 },
            gridTemplateColumns: { xs: '1fr', md: '1.15fr 0.85fr' },
          }}
        >
          {/* Headline */}
          <Box sx={{ opacity: heroFade, transform: `translateY(${y * -0.12}px)`, animation: 'rise .9s ease-out both' }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: { xs: 3, md: 5 } }}>
              <img src={newsLogo} alt="NEWS" style={{ height: 52, width: 'auto' }} />
              <Typography sx={{ fontWeight: 700, color: C.mint }}>BirdTrails Admin</Typography>
            </Stack>
            <Typography
              component="h1"
              sx={{
                fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: 800,
                fontSize: { xs: '2.6rem', sm: '3.6rem', md: '5.2rem' },
                lineHeight: 1.02, letterSpacing: '-0.03em', maxWidth: 680,
              }}
            >
              Every flight leaves a trail.
            </Typography>
            <Typography sx={{ mt: 3, maxWidth: 520, fontSize: { xs: '1.05rem', md: '1.2rem' }, lineHeight: 1.6, color: 'rgba(255,255,255,0.78)' }}>
              Sign in to manage sightings, species records and field reports from the NEWS bird surveys.
            </Typography>
            <Button
              onClick={scrollToExplore}
              endIcon={<KeyboardArrowDownIcon sx={{ animation: 'drift 2.4s ease-in-out infinite' }} />}
              sx={{ mt: 4, color: '#fff', textTransform: 'none', fontWeight: 700, fontSize: '1rem', px: 0, '&:hover': { bgcolor: 'transparent', color: C.mint } }}
            >
              Explore the birds
            </Button>
          </Box>

          {/* Login card */}
          <Box
            sx={{
              justifySelf: { xs: 'stretch', md: 'end' }, width: '100%', maxWidth: 440,
              p: { xs: 3, sm: 4.5 }, borderRadius: '28px',
              bgcolor: 'rgba(10, 32, 20, 0.55)', backdropFilter: 'blur(22px) saturate(140%)',
              WebkitBackdropFilter: 'blur(22px) saturate(140%)',
              border: '1px solid rgba(255,255,255,0.16)',
              boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
              animation: 'rise 1s .15s ease-out both',
            }}
          >
            <Typography component="h2" sx={{ fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.02em' }}>
              Welcome back
            </Typography>
            <Typography sx={{ mt: 0.5, mb: 3, color: 'rgba(255,255,255,0.7)' }}>
              Sign in with your administrator account.
            </Typography>

            {error && <Alert severity="error" variant="filled" sx={{ mb: 2.5, borderRadius: '12px' }}>{error}</Alert>}

            <form onSubmit={handleLogin} noValidate>
              <Stack spacing={2.2}>
                <TextField
                  fullWidth required label="Email" type="email" autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)} sx={fieldSx}
                  InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon sx={{ color: C.mint }} /></InputAdornment> }}
                />
                <TextField
                  fullWidth required label="Password" autoComplete="current-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password} onChange={(e) => setPassword(e.target.value)} sx={fieldSx}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: C.mint }} /></InputAdornment>,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowPassword((s) => !s)} edge="end" sx={{ color: 'rgba(255,255,255,0.8)' }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  type="submit" fullWidth disabled={isLoading}
                  sx={{
                    mt: 1, height: 56, borderRadius: '14px', textTransform: 'none',
                    fontSize: '1.05rem', fontWeight: 800, color: C.forest, bgcolor: C.mint,
                    transition: 'transform .2s, box-shadow .2s, background-color .2s',
                    '&:hover': { bgcolor: '#fff', transform: 'translateY(-2px)', boxShadow: `0 12px 30px ${C.mint}44` },
                    '&:active': { transform: 'translateY(0)' },
                    '&.Mui-disabled': { bgcolor: `${C.mint}88`, color: C.forest },
                  }}
                >
                  {isLoading ? <CircularProgress size={24} sx={{ color: C.forest }} /> : 'Sign in'}
                </Button>
              </Stack>
            </form>

            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mt: 3, opacity: 0.75 }}>
              <ShieldMoonIcon sx={{ fontSize: 16, color: C.mint }} />
              <Typography variant="caption">Your connection is encrypted</Typography>
            </Stack>
          </Box>
        </Box>
      </Box>

      {/* ============ EXPLORE BIRDS (pinned, scroll-driven) ============ */}
      <Box ref={exploreRef} sx={{ position: 'relative', height: `${birds.length * 100 + 100}vh` }}>
        <Box sx={{ position: 'sticky', top: 0, height: '100svh', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
          {/* background tint that follows the active bird */}
          {birds.map((b, i) => (
            <Box
              key={b.name}
              sx={{
                position: 'absolute', inset: 0,
                background: `radial-gradient(70% 60% at 70% 45%, ${b.tint}66, transparent 70%)`,
                opacity: i === active ? 1 : 0, transition: 'opacity .8s ease',
              }}
            />
          ))}

          <Box sx={{ position: 'relative', maxWidth: 1240, mx: 'auto', width: '100%', px: { xs: 2.5, md: 6 }, display: 'grid', alignItems: 'center', gap: { xs: 3, md: 8 }, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            <Box sx={{ order: { xs: 2, md: 1 } }}>
              <Typography component="h2" sx={{ fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: 800, fontSize: { xs: '1.1rem', md: '1.3rem' }, color: C.mint, mb: 2 }}>
                Explore birds
              </Typography>

              {birds.map((b, i) => {
                const on = i === active;
                return (
                  <Box
                    key={b.name}
                    aria-hidden={!on}
                    sx={{
                      display: on ? 'block' : 'none',
                      animation: on ? 'rise .6s ease-out both' : 'none',
                    }}
                  >
                    <Typography sx={{ fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: 800, fontSize: { xs: '2.4rem', md: '4.2rem' }, lineHeight: 1.04, letterSpacing: '-0.03em' }}>
                      {b.name}
                    </Typography>
                    <Typography sx={{ mt: 1, fontStyle: 'italic', color: 'rgba(255,255,255,0.6)' }}>{b.scientific}</Typography>
                    <Typography sx={{ mt: 3, maxWidth: 460, fontSize: { xs: '1rem', md: '1.15rem' }, lineHeight: 1.65, color: 'rgba(255,255,255,0.85)' }}>
                      {b.blurb}
                    </Typography>
                    <Typography sx={{ mt: 2, fontWeight: 700, color: C.sun }}>{b.status} · {b.habitat}</Typography>
                    <Button
                      onClick={() => setShowFact((v) => !v)} aria-expanded={showFact}
                      sx={{ mt: 3, px: 2.6, py: 1, borderRadius: '999px', textTransform: 'none', fontWeight: 800, color: C.forest, bgcolor: C.sun, '&:hover': { bgcolor: '#fff', transform: 'translateY(-2px)' }, transition: 'transform .2s' }}
                    >
                      {showFact ? 'Hide fact' : 'Did you know?'}
                    </Button>
                    <Box sx={{ display: 'grid', gridTemplateRows: showFact ? '1fr' : '0fr', transition: 'grid-template-rows .5s ease' }}>
                      <Box sx={{ overflow: 'hidden' }}>
                        <Typography sx={{ mt: 2, pl: 2, maxWidth: 460, lineHeight: 1.65, borderLeft: `3px solid ${C.sun}`, color: 'rgba(255,255,255,0.9)' }}>
                          {b.fact}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                );
              })}

              {/* progress indicator: click to jump */}
              <Stack direction="row" spacing={1} sx={{ mt: 4 }}>
                {birds.map((b, i) => (
                  <Box
                    key={b.name} component="button" onClick={() => jumpTo(i)} aria-label={`Show ${b.name}`} aria-current={i === active}
                    sx={{ p: 0, border: 0, cursor: 'pointer', height: 6, borderRadius: 3, width: i === active ? 44 : 16, bgcolor: i === active ? C.mint : 'rgba(255,255,255,0.28)', transition: 'all .4s ease', '&:hover': { bgcolor: C.mint }, '&:focus-visible': { outline: `2px solid ${C.mint}`, outlineOffset: 3 } }}
                  />
                ))}
              </Stack>
            </Box>

            {/* Image stage: scales and rotates slightly with scroll, like Apple product pages */}
            <Box sx={{ order: { xs: 1, md: 2 }, display: 'flex', justifyContent: 'center' }}>
              <Box
                onMouseMove={onTilt} onMouseLeave={() => setTilt({ x: 0, y: 0 })}
                sx={{
                  transition: 'transform .25s ease-out', position: 'relative', width: { xs: '72vw', md: '100%' }, maxWidth: 520, aspectRatio: '4 / 5',
                  borderRadius: '32px', overflow: 'hidden',
                  boxShadow: '0 40px 90px rgba(0,0,0,0.5)',
                  transform: `perspective(900px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg) scale(${0.92 + progress * 0.08})`,
                  willChange: 'transform',
                }}
              >
                {birds.map((b, i) => <BirdImage key={b.name} bird={b} active={i === active} />)}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ============ ABOUT US ============ */}
      <About />

      {/* ============ FOOTER ============ */}
      <Box sx={{ py: 6, textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <Typography sx={{ color: 'rgba(255,255,255,0.6)', mb: 2 }}>Nature Environment &amp; Wildlife Society, Kolkata. Founded 1991.</Typography>
        <Button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          sx={{ color: C.forest, bgcolor: C.mint, borderRadius: '999px', px: 4, py: 1.2, textTransform: 'none', fontWeight: 800, '&:hover': { bgcolor: '#fff' } }}
        >
          Back to sign in
        </Button>
      </Box>
    </Box>
  );
};

export default Login;