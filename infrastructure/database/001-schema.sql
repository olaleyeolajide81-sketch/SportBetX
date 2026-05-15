-- SportBetX Database Schema
-- PostgreSQL 15+

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Users & Authentication
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stellar_address VARCHAR(56) NOT NULL UNIQUE,
    username        VARCHAR(30) NOT NULL,
    role            VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    avatar_url      TEXT,
    reputation      INTEGER NOT NULL DEFAULT 0,
    verified        BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_stellar_address ON users(stellar_address);
CREATE INDEX idx_users_username ON users(username);

-- ============================================================
-- Sports Events
-- ============================================================

CREATE TABLE IF NOT EXISTS sports_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(255) NOT NULL,
    sport           VARCHAR(50) NOT NULL,
    home_team       VARCHAR(100) NOT NULL,
    away_team       VARCHAR(100) NOT NULL,
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'finished', 'canceled', 'postponed')),
    outcome         VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (outcome IN ('pending', 'home_win', 'away_win', 'draw', 'canceled')),
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sports_events_status ON sports_events(status);
CREATE INDEX idx_sports_events_sport ON sports_events(sport);
CREATE INDEX idx_sports_events_start_time ON sports_events(start_time);

-- ============================================================
-- Betting Markets
-- ============================================================

CREATE TABLE IF NOT EXISTS betting_markets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id        UUID NOT NULL REFERENCES sports_events(id) ON DELETE CASCADE,
    market_type     VARCHAR(50) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'suspended', 'settled')),
    total_volume    BIGINT NOT NULL DEFAULT 0,
    liquidity_pool_id UUID,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_betting_markets_event ON betting_markets(event_id);
CREATE INDEX idx_betting_markets_status ON betting_markets(status);

-- ============================================================
-- Odds
-- ============================================================

CREATE TABLE IF NOT EXISTS odds_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_id       UUID NOT NULL REFERENCES betting_markets(id) ON DELETE CASCADE,
    selection       VARCHAR(50) NOT NULL,
    odds_value      INTEGER NOT NULL,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_odds_history_market ON odds_history(market_id);
CREATE INDEX idx_odds_history_recorded ON odds_history(recorded_at);

-- ============================================================
-- Bets
-- ============================================================

CREATE TABLE IF NOT EXISTS bets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    market_id       UUID NOT NULL REFERENCES betting_markets(id) ON DELETE CASCADE,
    bet_type        VARCHAR(20) NOT NULL CHECK (bet_type IN ('moneyline', 'spread', 'total', 'parlay', 'prop', 'live')),
    selection       VARCHAR(50) NOT NULL,
    amount          BIGINT NOT NULL CHECK (amount > 0),
    odds_at_placement INTEGER NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'refunded', 'canceled')),
    payout          BIGINT NOT NULL DEFAULT 0,
    tx_hash         VARCHAR(64),
    placed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    settled_at      TIMESTAMPTZ,
    metadata        JSONB DEFAULT '{}'
);

CREATE INDEX idx_bets_user ON bets(user_id);
CREATE INDEX idx_bets_market ON bets(market_id);
CREATE INDEX idx_bets_status ON bets(status);
CREATE INDEX idx_bets_placed_at ON bets(placed_at);

-- ============================================================
-- Parlay Legs
-- ============================================================

CREATE TABLE IF NOT EXISTS parlay_legs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bet_id          UUID NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
    market_id       UUID NOT NULL REFERENCES betting_markets(id) ON DELETE CASCADE,
    selection       VARCHAR(50) NOT NULL,
    odds_at_placement INTEGER NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost'))
);

CREATE INDEX idx_parlay_legs_bet ON parlay_legs(bet_id);

-- ============================================================
-- Liquidity Pools
-- ============================================================

CREATE TABLE IF NOT EXISTS liquidity_pools (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL,
    pool_type       VARCHAR(20) NOT NULL CHECK (pool_type IN ('event', 'sport', 'parlay', 'insurance')),
    total_liquidity BIGINT NOT NULL DEFAULT 0,
    total_shares    BIGINT NOT NULL DEFAULT 0,
    fees_collected  BIGINT NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'frozen', 'liquidating')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Liquidity Positions
-- ============================================================

CREATE TABLE IF NOT EXISTS liquidity_positions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pool_id         UUID NOT NULL REFERENCES liquidity_pools(id) ON DELETE CASCADE,
    amount          BIGINT NOT NULL,
    shares          BIGINT NOT NULL,
    rewards         BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_liquidity_positions_user ON liquidity_positions(user_id);
CREATE INDEX idx_liquidity_positions_pool ON liquidity_positions(pool_id);

-- ============================================================
-- Oracle Reports
-- ============================================================

CREATE TABLE IF NOT EXISTS oracle_providers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL,
    stellar_address VARCHAR(56) NOT NULL UNIQUE,
    oracle_type     VARCHAR(20) NOT NULL CHECK (oracle_type IN ('sports_data', 'price_feed', 'weather', 'custom')),
    status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'blacklisted')),
    confidence_score INTEGER NOT NULL DEFAULT 0,
    total_reports   INTEGER NOT NULL DEFAULT 0,
    successful_reports INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS oracle_reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id     UUID NOT NULL REFERENCES oracle_providers(id) ON DELETE CASCADE,
    event_id        UUID NOT NULL REFERENCES sports_events(id) ON DELETE CASCADE,
    outcome         VARCHAR(20) NOT NULL,
    signature       TEXT,
    reported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oracle_reports_event ON oracle_reports(event_id);
CREATE INDEX idx_oracle_reports_provider ON oracle_reports(provider_id);

-- ============================================================
-- Governance Proposals
-- ============================================================

CREATE TABLE IF NOT EXISTS governance_proposals (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    proposal_type   VARCHAR(30) NOT NULL CHECK (proposal_type IN ('parameter_change', 'fee_adjustment', 'feature_upgrade', 'emergency_action', 'treasury_management', 'contract_upgrade', 'oracle_management')),
    title           VARCHAR(255) NOT NULL,
    description     TEXT NOT NULL,
    voting_start    TIMESTAMPTZ NOT NULL,
    voting_end      TIMESTAMPTZ NOT NULL,
    votes_for       INTEGER NOT NULL DEFAULT 0,
    votes_against   INTEGER NOT NULL DEFAULT 0,
    votes_abstain   INTEGER NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'passed', 'failed', 'executed', 'expired', 'cancelled')),
    executed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_governance_proposals_status ON governance_proposals(status);
CREATE INDEX idx_governance_proposals_end ON governance_proposals(voting_end);

-- ============================================================
-- Votes
-- ============================================================

CREATE TABLE IF NOT EXISTS votes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    proposal_id     UUID NOT NULL REFERENCES governance_proposals(id) ON DELETE CASCADE,
    choice          VARCHAR(10) NOT NULL CHECK (choice IN ('for', 'against', 'abstain')),
    power           BIGINT NOT NULL DEFAULT 1,
    voted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, proposal_id)
);

CREATE INDEX idx_votes_proposal ON votes(proposal_id);

-- ============================================================
-- Notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_subscriptions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint        TEXT NOT NULL,
    p256dh_key      TEXT NOT NULL,
    auth_key        TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

CREATE TABLE IF NOT EXISTS notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    body            TEXT,
    type            VARCHAR(30) NOT NULL DEFAULT 'general' CHECK (type IN ('bet_settled', 'odds_changed', 'event_reminder', 'general')),
    reference_id    UUID,
    read            BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

-- ============================================================
-- Rate Limiting
-- ============================================================

CREATE TABLE IF NOT EXISTS rate_limits (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stellar_address VARCHAR(56) NOT NULL,
    endpoint        VARCHAR(255) NOT NULL,
    window_start    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    request_count   INTEGER NOT NULL DEFAULT 1,
    UNIQUE(stellar_address, endpoint, window_start)
);

CREATE INDEX idx_rate_limits_address ON rate_limits(stellar_address);

-- ============================================================
-- Platform Settings
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_settings (
    key             VARCHAR(100) PRIMARY KEY,
    value           JSONB NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings
INSERT INTO platform_settings (key, value) VALUES
    ('platform_fee_bps', '200'),
    ('min_bet_amount', '1000000'),
    ('max_bet_amount', '100000000'),
    ('max_parlay_size', '8'),
    ('min_liquidity', '10000000'),
    ('max_exposure_per_event', '100000000'),
    ('max_exposure_per_user', '10000000')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- Migration Tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
    version         VARCHAR(50) PRIMARY KEY,
    applied_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (version) VALUES ('001-schema');
