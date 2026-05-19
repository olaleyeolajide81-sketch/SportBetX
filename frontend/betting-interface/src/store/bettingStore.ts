import { create } from 'zustand';
import {
  TransactionBuilder,
  Networks,
  Contract,
  nativeToScVal,
  xdr,
  rpc as StellarRpc,
} from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import { SportsEvent, BetSelection, BetSlipItem, OddsFormat } from '../types/sports';

const SOROBAN_RPC_URL =
  import.meta.env.VITE_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE =
  import.meta.env.VITE_NETWORK_PASSPHRASE || Networks.TESTNET;
const BETTING_CONTRACT_ID =
  import.meta.env.VITE_BETTING_CONTRACT_ID || '';
const HORIZON_EXPLORER =
  import.meta.env.VITE_HORIZON_EXPLORER || 'https://stellar.expert/explorer/testnet/tx';

export interface PlacedBet {
  id: string;
  eventId: string;
  eventTitle: string;
  selection: string;
  odds: number;
  stake: number;
  txHash: string;
  explorerUrl: string;
  status: 'pending' | 'won' | 'lost';
  createdAt: string;
}

interface BettingState {
  events: SportsEvent[];
  selectedEvents: BetSelection[];
  betSlip: BetSlipItem[];
  oddsFormat: OddsFormat;
  betHistory: PlacedBet[];
  isPlacingBet: boolean;
  lastTxHash: string | null;
  betError: string | null;
  setEvents: (events: SportsEvent[]) => void;
  setSelectedEvents: (events: BetSelection[]) => void;
  setBetSlip: (slip: BetSlipItem[]) => void;
  setOddsFormat: (format: OddsFormat) => void;
  placeBet: (account: string) => Promise<void>;
  clearBetError: () => void;
}

async function buildAndSubmitBet(
  account: string,
  betSlip: BetSlipItem[],
): Promise<string> {
  const server = new StellarRpc.Server(SOROBAN_RPC_URL);
  const accountData = await server.getAccount(account);

  const contract = new Contract(BETTING_CONTRACT_ID);

  // Build args: bettor pubkey, array of {event_id, selection, odds, stake}
  const betsArg = xdr.ScVal.scvVec(
    betSlip.map((item) =>
      xdr.ScVal.scvMap([
        new xdr.ScMapEntry({
          key: nativeToScVal('event_id', { type: 'symbol' }),
          val: nativeToScVal(item.event.id),
        }),
        new xdr.ScMapEntry({
          key: nativeToScVal('selection', { type: 'symbol' }),
          val: nativeToScVal(item.selection),
        }),
        new xdr.ScMapEntry({
          key: nativeToScVal('odds', { type: 'symbol' }),
          val: nativeToScVal(item.odds, { type: 'i128' }),
        }),
        new xdr.ScMapEntry({
          key: nativeToScVal('stake', { type: 'symbol' }),
          val: nativeToScVal(
            BigInt(Math.round((item.stake ?? 1) * 10_000_000)),
            { type: 'i128' },
          ),
        }),
      ]),
    ),
  );

  const tx = new TransactionBuilder(accountData, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('place_bet', nativeToScVal(account, { type: 'address' }), betsArg))
    .setTimeout(30)
    .build();

  // Simulate to get footprint
  const simResult = await server.simulateTransaction(tx);
  if (StellarRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  const preparedTx = StellarRpc.assembleTransaction(tx, simResult).build();
  const txXdr = preparedTx.toXDR();

  // Sign with Freighter
  const signResult = await signTransaction(txXdr, { networkPassphrase: NETWORK_PASSPHRASE });
  if (signResult.error) {
    throw new Error(signResult.error.message);
  }

  // Submit
  const submitResult = await server.sendTransaction(
    TransactionBuilder.fromXDR(signResult.signedTxXdr, NETWORK_PASSPHRASE),
  );

  if (submitResult.status === 'ERROR') {
    throw new Error(`Transaction failed: ${submitResult.errorResult?.toXDR('base64')}`);
  }

  // Poll for confirmation
  let getResult = await server.getTransaction(submitResult.hash);
  let attempts = 0;
  while (
    getResult.status === StellarRpc.Api.GetTransactionStatus.NOT_FOUND &&
    attempts < 10
  ) {
    await new Promise((r) => setTimeout(r, 2000));
    getResult = await server.getTransaction(submitResult.hash);
    attempts++;
  }

  if (getResult.status === StellarRpc.Api.GetTransactionStatus.FAILED) {
    throw new Error('Transaction was rejected by the network');
  }

  return submitResult.hash;
}

export const useBettingStore = create<BettingState>((set, get) => ({
  events: [],
  selectedEvents: [],
  betSlip: [],
  oddsFormat: 'decimal',
  betHistory: [],
  isPlacingBet: false,
  lastTxHash: null,
  betError: null,

  setEvents: (events) => set({ events }),
  setSelectedEvents: (selectedEvents) => set({ selectedEvents }),
  setBetSlip: (betSlip) => set({ betSlip }),
  setOddsFormat: (oddsFormat) => set({ oddsFormat }),
  clearBetError: () => set({ betError: null }),

  placeBet: async (account: string) => {
    const { betSlip } = get();
    if (!account || betSlip.length === 0) return;

    set({ isPlacingBet: true, betError: null, lastTxHash: null });

    try {
      const txHash = await buildAndSubmitBet(account, betSlip);
      const explorerUrl = `${HORIZON_EXPLORER}/${txHash}`;

      // Add to local history with pending status
      const newBets: PlacedBet[] = betSlip.map((item) => ({
        id: `${txHash}-${item.event.id}`,
        eventId: item.event.id,
        eventTitle: item.event.title,
        selection: item.selection,
        odds: item.odds,
        stake: item.stake ?? 1,
        txHash,
        explorerUrl,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }));

      set((state) => ({
        betHistory: [...newBets, ...state.betHistory],
        betSlip: [],
        selectedEvents: [],
        lastTxHash: txHash,
        isPlacingBet: false,
      }));
    } catch (err) {
      set({
        isPlacingBet: false,
        betError: err instanceof Error ? err.message : 'Failed to place bet',
      });
      throw err;
    }
  },
}));
