import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import ChatPage from './pages/Chat';
import SettingsPage from './pages/Settings';
import Layout from './components/Layout';

function AppShell() {
  return (
    <Layout>
      <main className="min-h-screen">
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </Layout>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  </React.StrictMode>
);