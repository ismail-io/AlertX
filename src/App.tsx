import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import AuthGuard from './components/AuthGuard';

import Home from './pages/Home';
import Report from './pages/Report';
import DefenceDashboard from './pages/DefenceDashboard';
import PoliceDashboard from './pages/PoliceDashboard';
import Login from './pages/Login';
import AuditTrail from './pages/AuditTrail';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/report" element={<Report />} />
              <Route
                path="/defence"
                element={
                  <AuthGuard allowedRoles={['defence']}>
                    <DefenceDashboard />
                  </AuthGuard>
                }
              />
              <Route
                path="/police"
                element={
                  <AuthGuard allowedRoles={['police']}>
                    <PoliceDashboard />
                  </AuthGuard>
                }
              />
              <Route
                path="/audit"
                element={
                  <AuthGuard allowedRoles={['defence', 'police']}>
                    <AuditTrail />
                  </AuthGuard>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
