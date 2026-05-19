import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  isConnected as freighterIsConnected,
  requestAccess,
  getAddress,
  getNetworkDetails,
} from '@stellar/freighter-api';
import axios from 'axios';

const HORIZON_URL = import.meta.env.VITE_HORIZON_URL || 'https://horizon-testnet.stellar.org';

interface WalletState {
  isConnected: boolean;
  account: string | null;
  balance: string | null;
  network: string | null;
  isFreighterInstalled: boolean;
  isLoading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
}

async function fetchXlmBalance(publicKey: string): Promise<string | null> {
  try {
    const { data } = await axios.get(`${HORIZON_URL}/accounts/${publicKey}`);
    const xlmBalance = data.balances?.find(
      (b: { asset_type: string }) => b.asset_type === 'native',
    );
    return xlmBalance ? parseFloat(xlmBalance.balance).toFixed(2) : '0.00';
  } catch {
    return null;
  }
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      isConnected: false,
      account: null,
      balance: null,
      network: null,
      isFreighterInstalled: false,
      isLoading: false,
      error: null,

      connect: async () => {
        set({ isLoading: true, error: null });
        try {
          // Check if Freighter is installed
          const { isConnected: installed } = await freighterIsConnected();
          if (!installed) {
            set({
              isFreighterInstalled: false,
              isLoading: false,
              error: 'Freighter wallet is not installed. Please install it from https://freighter.app',
            });
            return;
          }
          set({ isFreighterInstalled: true });

          // Request access
          const accessResult = await requestAccess();
          if (accessResult.error) {
            set({ isLoading: false, error: accessResult.error.message });
            return;
          }

          // Get public key
          const addressResult = await getAddress();
          if (addressResult.error) {
            set({ isLoading: false, error: addressResult.error.message });
            return;
          }
          const publicKey = addressResult.address;

          // Get network
          const networkResult = await getNetworkDetails();
          const network = networkResult.error ? null : networkResult.network;

          // Fetch XLM balance
          const balance = await fetchXlmBalance(publicKey);

          set({ isConnected: true, account: publicKey, balance, network, isLoading: false });
        } catch (err) {
          set({ isLoading: false, error: err instanceof Error ? err.message : 'Connection failed' });
        }
      },

      disconnect: () => {
        set({ isConnected: false, account: null, balance: null, network: null, error: null });
      },

      refreshBalance: async () => {
        const { account } = get();
        if (!account) return;
        const balance = await fetchXlmBalance(account);
        set({ balance });
      },
    }),
    {
      name: 'sportbetx-wallet',
      partialize: (state) => ({ isConnected: state.isConnected, account: state.account, network: state.network }),
    },
  ),
);
