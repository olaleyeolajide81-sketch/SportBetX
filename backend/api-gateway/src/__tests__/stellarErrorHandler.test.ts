import express from 'express';
import request from 'supertest';
import {
  parseStellarError,
  stellarErrorMiddleware,
  StellarTransactionError,
} from '../middleware/stellarErrorHandler';

// ---------------------------------------------------------------------------
// Unit tests for parseStellarError
// ---------------------------------------------------------------------------

describe('parseStellarError', () => {
  it('returns human-readable message for tx_bad_seq and marks it retryable', () => {
    const err: StellarTransactionError = Object.assign(new Error('tx error'), {
      response: { data: { extras: { result_codes: { transaction: 'tx_bad_seq' } } } },
    });
    const result = parseStellarError(err);
    expect(result.code).toBe('tx_bad_seq');
    expect(result.message).toBe('Transaction sequence number mismatch. Please retry.');
    expect(result.retryable).toBe(true);
  });

  it('returns human-readable message for tx_insufficient_balance and marks it non-retryable', () => {
    const err: StellarTransactionError = Object.assign(new Error('tx error'), {
      response: { data: { extras: { result_codes: { transaction: 'tx_insufficient_balance' } } } },
    });
    const result = parseStellarError(err);
    expect(result.code).toBe('tx_insufficient_balance');
    expect(result.message).toBe('Insufficient balance to complete this transaction.');
    expect(result.retryable).toBe(false);
  });

  it('prefers operation-level error over transaction-level error', () => {
    const err: StellarTransactionError = Object.assign(new Error('tx error'), {
      response: {
        data: {
          extras: {
            result_codes: {
              transaction: 'tx_failed',
              operations: ['op_underfunded'],
            },
          },
        },
      },
    });
    const result = parseStellarError(err);
    expect(result.code).toBe('op_underfunded');
    expect(result.message).toBe('Insufficient funds for this operation.');
  });

  it('marks op_bad_seq (via tx_bad_seq) as retryable', () => {
    const err: StellarTransactionError = Object.assign(new Error('tx error'), {
      response: {
        data: {
          extras: {
            result_codes: {
              transaction: 'tx_bad_seq',
              operations: [],
            },
          },
        },
      },
    });
    const result = parseStellarError(err);
    expect(result.retryable).toBe(true);
  });

  it('handles ContractError in message', () => {
    const err: StellarTransactionError = Object.assign(
      new Error('ContractError: execution failed'),
      { response: undefined }
    );
    const result = parseStellarError(err);
    expect(result.code).toBe('contract_error');
    expect(result.message).toBe('Smart contract execution failed. Please check your inputs.');
    expect(result.retryable).toBe(false);
  });

  it('falls back to generic message for unknown error code', () => {
    const err: StellarTransactionError = Object.assign(new Error('unknown'), {
      response: { data: { extras: { result_codes: { transaction: 'tx_unknown_code' } } } },
    });
    const result = parseStellarError(err);
    expect(result.code).toBe('tx_unknown_code');
    expect(result.message).toBe('Transaction failed. Please try again.');
    expect(result.retryable).toBe(false);
  });

  it('falls back to generic message when no result_codes present', () => {
    const err: StellarTransactionError = Object.assign(new Error('network error'), {
      response: undefined,
    });
    const result = parseStellarError(err);
    expect(result.message).toBe('Transaction failed. Please try again.');
    expect(result.retryable).toBe(false);
  });

  it('uses error.code when response result_codes are absent', () => {
    const err: StellarTransactionError = Object.assign(new Error('tx error'), {
      code: 'tx_bad_auth',
      response: undefined,
    });
    const result = parseStellarError(err);
    expect(result.code).toBe('tx_bad_auth');
    expect(result.message).toBe('Transaction authorization failed. Check your signing key.');
  });

  it('handles all known tx error codes', () => {
    const knownCodes = [
      'tx_insufficient_balance',
      'tx_bad_seq',
      'tx_bad_auth',
      'tx_no_account',
      'tx_insufficient_fee',
      'tx_bad_auth_extra',
      'tx_internal_error',
    ];
    for (const code of knownCodes) {
      const err: StellarTransactionError = Object.assign(new Error('tx error'), {
        response: { data: { extras: { result_codes: { transaction: code } } } },
      });
      const result = parseStellarError(err);
      expect(result.code).toBe(code);
      expect(result.message).not.toBe('Transaction failed. Please try again.');
    }
  });

  it('handles all known op error codes', () => {
    const knownOpCodes = ['op_no_destination', 'op_underfunded', 'op_low_reserve'];
    for (const code of knownOpCodes) {
      const err: StellarTransactionError = Object.assign(new Error('tx error'), {
        response: {
          data: { extras: { result_codes: { transaction: 'tx_failed', operations: [code] } } },
        },
      });
      const result = parseStellarError(err);
      expect(result.code).toBe(code);
      expect(result.message).not.toBe('Transaction failed. Please try again.');
    }
  });
});

// ---------------------------------------------------------------------------
// Integration tests for stellarErrorMiddleware
// ---------------------------------------------------------------------------

function buildApp() {
  const app = express();
  app.use(express.json());

  // Route that throws a Stellar tx error
  app.get('/test/stellar-tx', (_req, _res, next) => {
    const err: StellarTransactionError = Object.assign(new Error('tx error'), {
      response: { data: { extras: { result_codes: { transaction: 'tx_bad_seq' } } } },
    });
    next(err);
  });

  // Route that throws a ContractError
  app.get('/test/contract-error', (_req, _res, next) => {
    next(new Error('ContractError: execution reverted'));
  });

  // Route that throws a non-Stellar error
  app.get('/test/generic-error', (_req, _res, next) => {
    next(new Error('Something went wrong'));
  });

  app.use(stellarErrorMiddleware);
  // Minimal fallback error handler so non-Stellar errors don't hang
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: err.message });
  });

  return app;
}

describe('stellarErrorMiddleware', () => {
  const app = buildApp();

  it('returns 422 with structured body for Stellar tx error', async () => {
    const res = await request(app).get('/test/stellar-tx');
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('StellarTransactionError');
    expect(res.body.code).toBe('tx_bad_seq');
    expect(res.body.retryable).toBe(true);
    expect(typeof res.body.message).toBe('string');
  });

  it('returns 422 for ContractError', async () => {
    const res = await request(app).get('/test/contract-error');
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('contract_error');
    expect(res.body.retryable).toBe(false);
  });

  it('passes non-Stellar errors to the next error handler', async () => {
    const res = await request(app).get('/test/generic-error');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Something went wrong');
  });
});
