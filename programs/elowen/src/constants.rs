use anchor_lang::prelude::*;

// token metadata
pub const SYMBOL: &str = "ELW";
pub const NAME: &str = "Elowen";
pub const SUPPLY: u64 = 1_000_000_000 * 10u64.pow(9);

// The signer wallet is to prevent unauthorized access to some methods with incorrect data.
// For example, in reward distribution
// So it's the wallet that the platform uses to access the contract basically, but there are no funds.
// All funds will be held in PDAs on the program at all times.
#[cfg(feature = "devnet")]
pub const SIGNER: Pubkey = pubkey!("2FuPdqnyPAGRBtsURuzVpjiYePqCQMLENBz6ZAsLUxxw");
#[cfg(not(feature = "devnet"))]
pub const SIGNER: Pubkey = pubkey!("2FuPdqnyPAGRBtsURuzVpjiYePqCQMLENBz6ZAsLUxxw");

// all percentages
pub const EDA_PERCENTAGE: u16 = 1000;
pub const TEAM_PERCENTAGE: u16 = 1000;
pub const REWARD_PERCENTAGE: u16 = 5000;
pub const PRESALE_PERCENTAGE: u16 = 1000;
pub const LIQUIDITY_PERCENTAGE: u16 = 2000;
