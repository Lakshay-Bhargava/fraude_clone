import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { ScannerPage } from './pages/ScannerPage';
import { InvestigationPage } from './pages/InvestigationPage';
import { AdvertisementsPage } from './pages/AdvertisementsPage';
import { ThreatNetworkPage } from './pages/ThreatNetworkPage';
import { CasesPage } from './pages/CasesPage';
import { AlertsPage } from './pages/AlertsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Landing & Login */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* FinGuard AI Workspace Routes wrapped in AppShell */}
        <Route element={<AppShell />}>
          {/* 1. Dashboard */}
          <Route path="/console" element={<DashboardPage />} />
          <Route path="/dashboard" element={<Navigate to="/console" replace />} />

          {/* 2. Flagged Posts */}
          <Route path="/flagged-posts" element={<AdvertisementsPage />} />
          <Route path="/investigations" element={<Navigate to="/flagged-posts" replace />} />
          <Route path="/advertisements" element={<Navigate to="/flagged-posts" replace />} />
          <Route path="/investigations/:id" element={<InvestigationPage />} />

          {/* Dedicated Scanner */}
          <Route path="/scanner" element={<ScannerPage />} />

          {/* 3. Clusters / Networks */}
          <Route path="/network" element={<ThreatNetworkPage />} />
          <Route path="/clusters" element={<Navigate to="/network" replace />} />

          {/* 4. Reports */}
          <Route path="/reports" element={<ReportsPage />} />

          {/* 5. Settings */}
          <Route path="/settings" element={<SettingsPage />} />

          {/* Auxiliary pages */}
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/cases" element={<CasesPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
