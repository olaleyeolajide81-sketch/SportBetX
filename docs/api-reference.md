# SportBetX API Reference

Base URL: `https://api.sportbetx.io/api/v1` (production) or `http://localhost:3000/api/v1` (development)

## Authentication

### POST /auth/register
Register a new user with their Stellar wallet address.

**Request Body:**
```json
{
  "address": "GB...",
  "username": "bettor123",
  "signature": "optional-signed-challenge"
}
```

**Response (201):**
```json
{
  "data": {
    "user": { "address": "GB...", "username": "bettor123", "role": "user" },
    "token": "eyJhbG..."
  }
}
```

### POST /auth/login
Login with an existing Stellar address.

**Request Body:**
```json
{
  "address": "GB..."
}
```

**Response (200):**
```json
{
  "data": {
    "user": { "address": "GB...", "username": "bettor123", "role": "user" },
    "token": "eyJhbG..."
  }
}
```

### GET /auth/me
Get the currently authenticated user's profile. Requires Bearer token.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "data": { "address": "GB...", "username": "bettor123", "role": "user" }
}
```

---

## Betting

### GET /betting/events
List all available betting events (cached 30s).

**Response (200):**
```json
{
  "data": [
    {
      "id": "1",
      "title": "Lakers vs Celtics",
      "sport": "basketball",
      "status": "upcoming"
    }
  ]
}
```

### GET /betting/events/:eventId/odds
Get current odds for a specific event (cached 5s).

**Response (200):**
```json
{
  "data": { "home": 180, "away": 200, "draw": 350 }
}
```

### GET /betting/:address/history
Get bet history for a specific address.

**Query Parameters:**
| Param    | Type    | Description |
|----------|---------|-------------|
| status   | string  | Filter: pending, won, lost |
| sport    | string  | Filter by sport type |
| page     | integer | Page number (default: 1) |
| pageSize | integer | Items per page (default: 20, max: 100) |

**Response (200):**
```json
{
  "data": [{ "id": "bet-1", "eventId": "event-1", "amount": 100, "status": "won" }],
  "pagination": { "page": 1, "pageSize": 20, "total": 5 },
  "summary": { "totalStaked": 500, "totalWon": 180, "roi": -64 }
}
```

### POST /betting/place
Place a new bet on an event.

**Request Body:**
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 100,
  "selection": "home"
}
```

**Response (201):**
```json
{
  "data": { "id": "bet-1700000000000", "eventId": "...", "amount": 100, "status": "pending" }
}
```

---

## Odds

### GET /odds/format
Convert odds between different formats. The frontend supports decimal, American, and fractional formats. Conversion utilities are available in `src/utils/oddsConverter.ts`.

| Format     | Example    | Description |
|------------|------------|-------------|
| decimal    | 2.00       | Total return per unit staked |
| american   | +100       | Profit on 100 unit stake |
| fractional | 1/1        | Profit relative to stake |

---

## Liquidity

### GET /liquidity/pools
List all liquidity pools.

**Response (200):**
```json
{
  "data": [
    { "id": "pool-1", "sport": "football", "totalLiquidity": 1000000, "apy": 12.5 }
  ]
}
```

### POST /liquidity/deposit
Deposit liquidity into a pool.

**Request Body:**
```json
{
  "poolId": "pool-1",
  "amount": 1000
}
```

**Response (201):**
```json
{
  "data": { "poolId": "pool-1", "amount": 1000, "status": "pending" }
}
```

---

## Search

### GET /search/events
Search for events with debounced query support.

**Query Parameters:**
| Param    | Type    | Description |
|----------|---------|-------------|
| q        | string  | Search term (matches title, teams, sport) |
| sport    | string  | Filter by sport (e.g., football, basketball) |
| status   | string  | Filter: upcoming, live, finished |
| page     | integer | Page number (default: 1) |
| pageSize | integer | Items per page (default: 20, max: 50) |

**Response (200):**
```json
{
  "data": [{ "id": "1", "title": "Lakers vs Celtics", "sport": "basketball" }],
  "pagination": { "page": 1, "pageSize": 20, "total": 10 },
  "query": { "q": "lakers", "sport": "all", "status": "all" }
}
```

---

## Oracle

### GET /oracle/status
Get oracle service status and provider information.

### GET /oracle/reports/:eventId
Get oracle reports for a specific event.

---

## Governance

### GET /governance/proposals
List governance proposals.

### POST /governance/proposals
Create a new governance proposal.

### POST /governance/vote
Cast a vote on an active proposal.

---

## Leaderboard

### GET /leaderboard
Get platform leaderboard.

**Query Parameters:**
| Param    | Type    | Description |
|----------|---------|-------------|
| period   | string  | Time period: daily, weekly, monthly, all |
| limit    | integer | Number of entries (default: 50) |

---

## WebSocket Events

Connection: `wss://api.sportbetx.io` (Socket.IO protocol)

### Client → Server

| Event             | Payload      | Description |
|-------------------|-------------|-------------|
| subscribe:event   | `eventId`   | Subscribe to event updates |
| unsubscribe:event | `eventId`   | Unsubscribe from event updates |
| subscribe:odds    | (none)      | Subscribe to live odds feed |
| unsubscribe:odds  | (none)      | Unsubscribe from live odds feed |

### Server → Client

| Event        | Payload                                      | Description |
|-------------|----------------------------------------------|-------------|
| odds:update | `{ eventId, odds: { home, away, draw }, timestamp }` | Real-time odds update |

---

## Smart Contract Interface

### Contracts (Soroban on Stellar)

| Contract         | Address      | Description |
|-----------------|-------------|-------------|
| Betting Market  | TBD         | Core betting logic |
| Liquidity Pool  | TBD         | Liquidity management |
| Governance      | TBD         | Voting and proposals |
| Oracle          | TBD         | External data feed |

### Shared Types

All contracts use shared types defined in `contracts/shared/src/types.rs`:

- `SportsEvent` - Event with id, title, teams, timing, status, outcome
- `Bet` - Bet with id, bettor, event, type, amount, odds, status, payout
- `BettingMarket` - Market with id, event, odds, volume, status
- `LiquidityPool` - Pool with id, liquidity, provider shares, fees
- `Oracle` - Oracle with provider, confidence, reports
- `GovernanceProposal` - Proposal with voting, execution tracking

### Error Codes

| Code | Error                  | Description |
|------|------------------------|-------------|
| 1    | Unauthorized           | Caller not authorized |
| 2    | MemberNotFound         | Member not found |
| 3    | CircleFull             | Group has reached capacity |
| 4    | AlreadyMember          | Already a member |
| 5    | CircleNotFound         | Circle does not exist |
| 6    | InvalidAmount          | Invalid bet/circle amount |
| 7    | RoundAlreadyFinalized  | Round already finalized |
| 8    | RoundNotFinalized      | Round not yet finalized |
| 9    | NotAllContributed      | Not all members contributed |
| 10   | PayoutNotScheduled     | Payout not scheduled |
| 11   | PayoutTooEarly         | Payout time not reached |

---

## Rate Limiting

- Global: 100 requests per 15-minute window per IP
- Bet placement: Subject to additional Stellar address-level rate limiting
- WebSocket connections: Max 10 concurrent connections per IP

## Pagination

List endpoints support pagination with `page` and `pageSize` query parameters:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

## Error Responses

### Standard Error
```json
{
  "error": "ErrorType",
  "message": "Human-readable description"
}
```

### Stellar Transaction Error
```json
{
  "error": "StellarTransactionError",
  "message": "Insufficient balance to complete this transaction.",
  "code": "tx_insufficient_balance",
  "retryable": false
}
```

### Validation Error
```json
{
  "errors": [
    { "type": "field", "msg": "amount must be a positive number", "path": "amount", "location": "body" }
  ]
}
```

## Monitoring

- `GET /health` - Health check endpoint
- `GET /metrics` - Prometheus metrics (restricted to internal network)
