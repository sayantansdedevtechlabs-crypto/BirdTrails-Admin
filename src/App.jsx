import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

// Layouts & Pages
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import SpeciesList from './pages/SpeciesList';
import ObservationList from './pages/ObservationList';
import CensusSessions from './pages/CensusSessions';
import UserManagement from './pages/UserManagement';
import Login from './pages/Login';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check current session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Listen for login/logout changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />

        {/* Private Routes (Protected by session) */}
        <Route path="/" element={session ? <MainLayout /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard />} />
          <Route path="species" element={<SpeciesList />} />
          <Route path="observations" element={<ObservationList />} />
          <Route path="census" element={<CensusSessions />} />
          <Route path="users" element={<UserManagement />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;