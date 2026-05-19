import React from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import { BetSlipItem } from '../types/sports';

interface Props {
  betSlip: BetSlipItem[];
  onPlaceBet: () => void;
  onRemoveBet: (index: number) => void;
  formatOdds: (odds: number) => string;
  isPlacingBet?: boolean;
  lastTxHash?: string | null;
  betError?: string | null;
  explorerBaseUrl?: string;
}

export const BetSlip: React.FC<Props> = ({
  betSlip,
  onPlaceBet,
  onRemoveBet,
  formatOdds,
  isPlacingBet = false,
  lastTxHash = null,
  betError = null,
  explorerBaseUrl = 'https://stellar.expert/explorer/testnet/tx',
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
    <h2 className="font-semibold mb-3">Bet Slip ({betSlip.length})</h2>

    {/* Success: tx hash */}
    {lastTxHash && (
      <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg text-sm">
        <p className="text-green-700 dark:text-green-300 font-medium mb-1">Bet placed! ✓</p>
        <a
          href={`${explorerBaseUrl}/${lastTxHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-blue-600 dark:text-blue-400 text-xs break-all hover:underline"
        >
          {lastTxHash.slice(0, 16)}…{lastTxHash.slice(-8)}
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
        </a>
      </div>
    )}

    {/* Error */}
    {betError && (
      <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/30 rounded-lg text-sm text-red-700 dark:text-red-300">
        {betError}
      </div>
    )}

    {betSlip.length === 0 ? (
      <p className="text-sm text-gray-500">No selections yet.</p>
    ) : (
      <>
        {betSlip.map((item, i) => (
          <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
            <div className="text-sm">
              <div className="font-medium">{item.event.title}</div>
              <div className="text-gray-500">{item.selection} @ {formatOdds(item.odds)}</div>
              {item.stake && (
                <div className="text-gray-400 text-xs">{item.stake} XLM</div>
              )}
            </div>
            <button onClick={() => onRemoveBet(i)} className="text-red-500 text-xs ml-2">✕</button>
          </div>
        ))}
        <button
          onClick={onPlaceBet}
          disabled={isPlacingBet}
          className="mt-3 w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isPlacingBet && <Loader2 className="w-4 h-4 animate-spin" />}
          {isPlacingBet ? 'Signing & Submitting…' : 'Place Bet'}
        </button>
      </>
    )}
  </div>
);
