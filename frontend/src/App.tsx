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
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected App Workspace Routes */}
        <Route element={<AppShell />}>
          <Route path="/console" element={<DashboardPage />} />
          <Route path="/scanner" element={<ScannerPage />} />
          <Route path="/investigations/:id" element={<InvestigationPage />} />
          <Route path="/advertisements" element={<AdvertisementsPage />} />
          <Route path="/network" element={<ThreatNetworkPage />} />
          <Route path="/cases" element={<CasesPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
