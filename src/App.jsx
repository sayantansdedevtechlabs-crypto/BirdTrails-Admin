import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { appTheme } from './theme/theme';

// Import our new pages
import Login from './pages/Login';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import SpeciesList from './pages/SpeciesList';
import ObservationList from './pages/ObservationList';
import UserManagement from './pages/UserManagement'; 
import CensusSessions from './pages/CensusSessions';

// Temporary placeholders for the other pages so the sidebar doesn't crash when clicked
const DummyPage = ({ title }) => <h2 style={{ color: '#2D3436' }}>{title} Module Coming Soon!</h2>;

function App() {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline /> 
      
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Notice how MainLayout wraps these nested routes! 
            Whatever is active below gets injected into the <Outlet /> of MainLayout.
          */}
          <Route path="/" element={<MainLayout />}>
            {/* Auto-redirect the base URL to dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="directory" element={<SpeciesList />} />
            <Route path="observations" element={<ObservationList />} />
            <Route path="census" element={<CensusSessions />} />
            <Route path="users" element={<UserManagement />} />
          </Route>
          
          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;