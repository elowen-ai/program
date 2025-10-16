use anchor_lang::prelude::*;

use crate::{enums::{CustomError, PresaleType}, functions::{calculate_by_percentage, get_months_later}};

// reward calculation start time
pub const BASE_REWARD: u64 = 62_500_000 * 10u64.pow(9); // 62.5M tokens for first period

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

// Payment token USDC in mainnet and Test USDC in devnet
#[cfg(feature = "devnet")]
pub const USDC_MINT: Pubkey = pubkey!("28zvdJE2BwGLMeqtP1punErLRE38rE2qM7uvVAnXBKaL");
#[cfg(not(feature = "devnet"))]
pub const USDC_MINT: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

// WSOL mint for using SOL in the program processes
pub const WSOL_MINT: Pubkey = pubkey!("So11111111111111111111111111111111111111112");

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

impl PresaleRules {
    pub fn get_remaining_amount(&self, token_sold: u64) -> u64 {
        self.total_amount - token_sold
    }

    pub fn is_presale_active(&self) -> bool {
        self.is_presale_started() && !self.is_presale_ended()
    }

    pub fn is_presale_ended(&self) -> bool {
        let clock = Clock::get().unwrap();
        clock.unix_timestamp >= self.end_time
    }

    pub fn is_presale_started(&self) -> bool {
        let clock = Clock::get().unwrap();
        clock.unix_timestamp >= self.start_time
    }

    pub fn conditions<'info>(
        &self,
        amount_to_buy: u64,
        token_sold: u64,
        purchase_amount: u64,
    ) -> Result<()> {
        let remaining_amount = self.get_remaining_amount(token_sold);

        require!(remaining_amount > 0, CustomError::AllTokensSold);

        require!(self.is_presale_started(), CustomError::PresaleIsNotStarted);
        require!(self.is_presale_active(), CustomError::PresaleIsEnded);

        require!(
            amount_to_buy <= remaining_amount,
            CustomError::ExceedsTheRemainingAmount
        );

        let min_contribution = if remaining_amount > self.min_contribution {
            self.min_contribution
        } else {
            remaining_amount
        };

        require!(
            amount_to_buy >= min_contribution,
            CustomError::BelowTheMinimumContribution
        );

        require!(
            (amount_to_buy + purchase_amount) <= self.max_contribution,
            CustomError::ExceedsTheMaximumContribution
        );

        Ok(())
    }

    pub fn get_unlock_time(&self, presale_type: PresaleType) -> i64 {
        match presale_type {
            PresaleType::ThreeMonthsLockup => get_months_later(self.end_time, 3),
            PresaleType::SixMonthsLockup => get_months_later(self.end_time, 6),
        }
    }

    pub fn get_price_per_token(&self, presale_type: PresaleType) -> u64 {
        match presale_type {
            PresaleType::ThreeMonthsLockup => self.three_months_lockup_price,
            PresaleType::SixMonthsLockup => self.six_months_lockup_price,
        }
    }

    pub fn calculate_payment_amount(&self, amount_to_buy: u64, presale_type: PresaleType) -> u64 {
        let price_per_token = self.get_price_per_token(presale_type);
        (amount_to_buy as u128)
            .checked_mul(price_per_token as u128)
            .unwrap()
            .checked_div(10u128.pow(9 - 6))
            .unwrap()
            .checked_div(10u128.pow(6))
            .unwrap() as u64
    }

    pub fn calculate_payment_amount_and_eda_amount(
        &self,
        amount_to_buy: u64,
        presale_type: PresaleType,
    ) -> (u64, u64) {
        let payment_amount = self.calculate_payment_amount(amount_to_buy, presale_type);
        let eda_amount = calculate_by_percentage(payment_amount, EDA_PERCENTAGE);
        ((payment_amount - eda_amount), eda_amount)
    }
}
