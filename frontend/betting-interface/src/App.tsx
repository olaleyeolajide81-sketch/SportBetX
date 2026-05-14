import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { WagmiConfig } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';

import { Header } from './components/Header';
import { BettingInterface } from './pages/BettingInterface';
import { LiveBetting } from './pages/LiveBetting';
import { BetHistory } from './pages/BetHistory';
import { Profile } from './pages/Profile';
import { Leaderboard } from './pages/Leaderboard';
import { useThemeStore } from './store/themeStore';
import { wagmiConfig, rainbowKitTheme } from './utils/walletConfig';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

function App() {
  const { isDarkMode } = useThemeStore();

  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider theme={rainbowKitTheme}>
        <QueryClientProvider client={queryClient}>
          <Router>
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
                  </Routes>
                </main>
              </motion.div>
            </div>
          </Router>
        </QueryClientProvider>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default App;
