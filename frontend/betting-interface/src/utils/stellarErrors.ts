export type StellarErrorCode =
  | 'tx_insufficient_balance'
  | 'tx_bad_seq'
  | 'tx_bad_auth'
  | 'tx_no_account'
  | 'tx_fee_bump_inner_failed'
  | 'contract_error'
  | 'network_error'
  | 'unknown';

export interface StellarTxError {
  code: StellarErrorCode;
  message: string;
  retryable: boolean;
}

const ERROR_MAP: Record<string, StellarTxError> = {
  tx_insufficient_balance: {
    code: 'tx_insufficient_balance',
    message: 'Insufficient XLM balance to complete this transaction.',
    retryable: false,
  },
  tx_bad_seq: {
    code: 'tx_bad_seq',
    message: 'Transaction sequence mismatch. Please retry.',
    retryable: true,
  },
  tx_bad_auth: {
    code: 'tx_bad_auth',
    message: 'Invalid transaction signature.',
    retryable: false,
  },
  tx_no_account: {
    code: 'tx_no_account',
    message: 'Account not found on the Stellar network.',
    retryable: false,
  },
  tx_fee_bump_inner_failed: {
    code: 'tx_fee_bump_inner_failed',
    message: 'Inner transaction failed.',
    retryable: false,
  },
};

export function parseStellarError(error: unknown): StellarTxError {
  if (error instanceof Error) {
    // stellar-sdk TransactionSubmitError exposes extras.result_codes
    const anyErr = error as any;
    const codes: string[] = anyErr?.response?.extras?.result_codes?.transaction
      ? [anyErr.response.extras.result_codes.transaction]
      : anyErr?.response?.extras?.result_codes?.operations ?? [];

    for (const code of codes) {
      if (ERROR_MAP[code]) return ERROR_MAP[code];
    }

    // Contract errors
    if (error.message.includes('ContractError') || error.message.includes('contract')) {
      return { code: 'contract_error', message: `Smart contract error: ${error.message}`, retryable: false };
    }

    // Network / fetch errors
    if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
      return { code: 'network_error', message: 'Network error. Check your connection and retry.', retryable: true };
    }
  }

  return { code: 'unknown', message: 'An unexpected error occurred. Please try again.', retryable: true };
}
