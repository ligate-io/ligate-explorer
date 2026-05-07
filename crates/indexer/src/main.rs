//! Entry point for `ligate-indexer`.
//!
//! Reads the Ligate Chain REST API and writes blocks, transactions,
//! schemas, attestor sets, and attestations into Postgres so the
//! explorer can serve the list, range, and aggregate queries the
//! chain itself deliberately does not. See the chain repo's
//! [`docs/protocol/rest-api.md`] for the upstream surface.
//!
//! v0 surface: slots + chain-identity bootstrap. `transactions`,
//! `schemas`, `attestor_sets`, `attestations` come in subsequent
//! migrations as the chain modules they consume stabilize.
//!
//! [`docs/protocol/rest-api.md`]:
//!   https://github.com/ligate-io/ligate-chain/blob/main/docs/protocol/rest-api.md

mod client;
mod db;
mod error;
mod ingest;

use anyhow::Result;
use clap::Parser;
use tracing::info;

#[derive(Debug, Parser)]
#[command(
    name = "ligate-indexer",
    version,
    about = "Indexer service for the Ligate Chain block explorer"
)]
struct Args {
    /// URL of a Ligate Chain node's REST API root, e.g.
    /// `http://127.0.0.1:12346` for a local devnet or
    /// `https://rpc.ligate.io` for the public hosted node.
    #[arg(long, env = "RPC_URL", default_value = "http://127.0.0.1:12346")]
    rpc_url: String,

    /// Postgres connection URL. Required.
    #[arg(long, env = "DATABASE_URL")]
    database_url: String,

    /// Slot height to start backfilling from. Defaults to the last
    /// indexed slot in DB + 1, or 1 if none.
    #[arg(long, env = "START_HEIGHT")]
    start_height: Option<u64>,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "ligate_indexer=info,sqlx=warn".into()),
        )
        .init();

    let args = Args::parse();
    info!(
        rpc_url = %args.rpc_url,
        start_height = ?args.start_height,
        "ligate-indexer starting"
    );

    let client = client::NodeClient::new(&args.rpc_url)?;
    let pool = db::connect(&args.database_url).await?;

    info!("db connected, migrations applied");
    ingest::run(client, pool, args.start_height).await
}
