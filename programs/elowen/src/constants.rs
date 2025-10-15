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

// squad multisig wallet
#[cfg(feature = "devnet")]
pub const MULTISIG: Pubkey = pubkey!("537dhD3qji3rSCYrkbZFNEHB5etnip8zhdDK7nK9RSpT");
#[cfg(not(feature = "devnet"))]
pub const MULTISIG: Pubkey = pubkey!("537dhD3qji3rSCYrkbZFNEHB5etnip8zhdDK7nK9RSpT");

// team wallets and their percentages
#[cfg(feature = "devnet")]
pub const TEAM_WALLETS: &[(Pubkey, u16)] = &[
    (
        pubkey!("2FuPdqnyPAGRBtsURuzVpjiYePqCQMLENBz6ZAsLUxxw"),
        4300,
    ),
    (
        pubkey!("9AVAef1rAuyhzyjJxquUBjEgWn9zyoN4ZRZuSaibSaEv"),
        3700,
    ),
    (pubkey!("5QvcwUs3DkxcY1FHj7hjSFcrYyvXhhXkpFSGk94PLkV"), 2000),
];
#[cfg(not(feature = "devnet"))]
pub const TEAM_WALLETS: &[(Pubkey, u16)] = &[
    (
        pubkey!("EXPjTRuSHDSMxzxd8UbhcaktyPBn1Eg3ZZFJKn77zrp2"),
        4300,
    ),
    (
        pubkey!("7XeTie8StTYcH4XDePKJ6Gjz24o5RurYX2DU2uWFpnk6"),
        3700,
    ),
    (
        pubkey!("5n7c3o6cS9zjt3c6yDNDi3eXBRFoRitunaQuLMmEyqcW"),
        2000,
    ),
];

// all percentages
pub const EDA_PERCENTAGE: u16 = 1000;
pub const TEAM_PERCENTAGE: u16 = 1000;
pub const REWARD_PERCENTAGE: u16 = 5000;
pub const PRESALE_PERCENTAGE: u16 = 1000;
pub const LIQUIDITY_PERCENTAGE: u16 = 2000;

pub struct PresaleRules {
    pub three_months_lockup_price: u64,
    pub six_months_lockup_price: u64,
    pub min_contribution: u64,
    pub max_contribution: u64,
    pub total_amount: u64,
    pub start_time: i64,
    pub end_time: i64,
}

// 3 months lockup presale price USD
// 6 months lockup presale price USD
// %0.1 of presale supply
// %2 of presale supply
// 10% of presale earnings
// 2025-10-15 00:00:00
// 2025-12-15 00:00:00
pub const PRESALE_RULES: PresaleRules = PresaleRules {
    three_months_lockup_price: (0.008 * 1000000.0) as u64,
    six_months_lockup_price: (0.004 * 1000000.0) as u64,
    min_contribution: 1000 * 10u64.pow(9),
    max_contribution: 2_000_000 * 10u64.pow(9),
    total_amount: 100_000_000 * 10u64.pow(9),
    start_time: 1746940053,
    end_time: 1765756800,
};
