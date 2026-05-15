import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { motion } from 'framer-motion';

import { Header } from './components/Header';
import { Toast } from './components/Toast';
import { BettingInterface } from './pages/BettingInterface';
import { LiveBetting } from './pages/LiveBetting';
import { BetHistory } from './pages/BetHistory';
import { Profile } from './pages/Profile';
import { Leaderboard } from './pages/Leaderboard';
import { Governance } from './pages/Governance';
import { useThemeStore } from './store/themeStore';
import { useToast } from './hooks/useToast';
import { I18nProvider } from './i18n/I18nProvider';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 3, refetchOnWindowFocus: false, staleTime: 30000 } },
});

function AppInner() {
  const { isDarkMode } = useThemeStore();
  const { toasts, dismiss } = useToast();

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : 'light'}`}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-900 dark:to-green-900"
      >
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<BettingInterface />} />
            <Route path="/betting" element={<BettingInterface />} />
            <Route path="/live" element={<LiveBetting />} />
            <Route path="/history" element={<BetHistory />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/governance" element={<Governance />} />
          </Routes>
        </main>
        <Toast toasts={toasts} onDismiss={dismiss} />
      </motion.div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <Router>
          <AppInner />
        </Router>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
