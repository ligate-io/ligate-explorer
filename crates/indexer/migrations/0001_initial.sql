-- Initial schema for the Ligate Chain block explorer indexer.
--
-- Tables denormalize what the explorer reads on hot paths (timestamps,
-- counts) and store the raw JSON returned by the chain REST API
-- alongside typed columns so we can reshape the typed surface without
-- re-indexing the chain. See `docs/protocol/rest-api.md` upstream for
-- the source endpoints.

-- ---- Indexer bookkeeping --------------------------------------------------

CREATE TABLE indexer_state (
    k          TEXT PRIMARY KEY,
    v          JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE indexer_state IS
    'Bookkeeping. Known keys: last_indexed_height, chain_id, chain_hash.';

-- ---- Slots (= "blocks" in explorer parlance) -----------------------------

CREATE TABLE slots (
    height       BIGINT PRIMARY KEY,
    hash         BYTEA NOT NULL UNIQUE,
    prev_hash    BYTEA NOT NULL,
    da_height    BIGINT,
    da_blob_size INTEGER,
    timestamp    TIMESTAMPTZ NOT NULL,
    state_root   BYTEA NOT NULL,
    batch_count  INTEGER NOT NULL,
    tx_count     INTEGER NOT NULL,
    event_count  INTEGER NOT NULL,
    finalized    BOOLEAN NOT NULL DEFAULT FALSE,
    raw          JSONB NOT NULL,
    ingested_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_slots_timestamp ON slots(timestamp DESC);
CREATE INDEX idx_slots_da_height ON slots(da_height);

-- ---- Batches (one slot has zero or more batches) -------------------------

CREATE TABLE batches (
    slot_height  BIGINT NOT NULL REFERENCES slots(height) ON DELETE CASCADE,
    batch_offset INTEGER NOT NULL,
    hash         BYTEA NOT NULL,
    sequencer    TEXT NOT NULL,
    tx_count     INTEGER NOT NULL,
    raw          JSONB NOT NULL,
    PRIMARY KEY (slot_height, batch_offset)
);
CREATE INDEX idx_batches_hash ON batches(hash);
CREATE INDEX idx_batches_sequencer ON batches(sequencer);

-- ---- Transactions --------------------------------------------------------

CREATE TABLE transactions (
    hash         BYTEA PRIMARY KEY,
    slot_height  BIGINT NOT NULL,
    batch_offset INTEGER NOT NULL,
    tx_offset    INTEGER NOT NULL,
    sender       TEXT,
    call_module  TEXT,
    call_variant TEXT,
    call_payload JSONB,
    status       TEXT NOT NULL,
    fee_paid     NUMERIC,
    gas_used     BIGINT,
    event_count  INTEGER NOT NULL,
    raw          JSONB NOT NULL,
    timestamp    TIMESTAMPTZ NOT NULL,
    FOREIGN KEY (slot_height, batch_offset)
        REFERENCES batches(slot_height, batch_offset) ON DELETE CASCADE
);
CREATE INDEX idx_tx_slot ON transactions(slot_height, batch_offset, tx_offset);
CREATE INDEX idx_tx_sender ON transactions(sender);
CREATE INDEX idx_tx_call ON transactions(call_module, call_variant);
CREATE INDEX idx_tx_timestamp ON transactions(timestamp DESC);

-- ---- Events --------------------------------------------------------------

CREATE TABLE events (
    id             BIGSERIAL PRIMARY KEY,
    chain_event_id BIGINT NOT NULL UNIQUE,
    tx_hash        BYTEA NOT NULL REFERENCES transactions(hash) ON DELETE CASCADE,
    event_offset   INTEGER NOT NULL,
    module         TEXT NOT NULL,
    type           TEXT NOT NULL,
    payload        JSONB NOT NULL,
    raw            JSONB NOT NULL
);
CREATE INDEX idx_events_tx ON events(tx_hash);
CREATE INDEX idx_events_type ON events(module, type);

-- ---- Attestation domain --------------------------------------------------

CREATE TABLE schemas (
    id                 TEXT PRIMARY KEY,
    owner              TEXT NOT NULL,
    name               TEXT NOT NULL,
    version            INTEGER NOT NULL,
    attestor_set_id    TEXT NOT NULL,
    fee_routing_bps    INTEGER NOT NULL,
    fee_routing_addr   TEXT,
    payload_shape_hash BYTEA,
    registered_tx_hash BYTEA NOT NULL REFERENCES transactions(hash),
    registered_at      TIMESTAMPTZ NOT NULL,
    attestation_count  BIGINT NOT NULL DEFAULT 0,
    raw                JSONB NOT NULL
);
CREATE INDEX idx_schemas_owner ON schemas(owner);
CREATE INDEX idx_schemas_attestor_set ON schemas(attestor_set_id);
CREATE INDEX idx_schemas_name ON schemas(name);

CREATE TABLE attestor_sets (
    id                 TEXT PRIMARY KEY,
    members            TEXT[] NOT NULL,
    threshold          INTEGER NOT NULL,
    registered_tx_hash BYTEA NOT NULL REFERENCES transactions(hash),
    registered_at      TIMESTAMPTZ NOT NULL,
    raw                JSONB NOT NULL
);

CREATE TABLE attestations (
    schema_id    TEXT NOT NULL REFERENCES schemas(id),
    payload_hash TEXT NOT NULL,
    submitter    TEXT NOT NULL,
    timestamp    TIMESTAMPTZ NOT NULL,
    tx_hash      BYTEA NOT NULL REFERENCES transactions(hash),
    signatures   JSONB NOT NULL,
    raw          JSONB NOT NULL,
    PRIMARY KEY (schema_id, payload_hash)
);
CREATE INDEX idx_attestations_submitter ON attestations(submitter);
CREATE INDEX idx_attestations_timestamp ON attestations(timestamp DESC);
CREATE INDEX idx_attestations_tx ON attestations(tx_hash);

-- ---- Address-side cache --------------------------------------------------

CREATE TABLE addresses (
    address                TEXT PRIMARY KEY,
    lgt_balance            NUMERIC NOT NULL DEFAULT 0,
    sequencer_bond         NUMERIC,
    attester_bond          NUMERIC,
    prover_bond            NUMERIC,
    tx_count_sent          BIGINT NOT NULL DEFAULT 0,
    attestations_submitted BIGINT NOT NULL DEFAULT 0,
    schemas_owned          INTEGER NOT NULL DEFAULT 0,
    last_seen_height       BIGINT,
    last_refreshed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
