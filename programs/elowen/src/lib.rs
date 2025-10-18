#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

declare_id!("3R63fNvrbn2mb2Em28i4UTPEJN83EAVQDmFuNzrkXVKw");

mod constants;
mod enums;
mod functions;
mod instructions;
mod state;
mod events;

use enums::*;
use instructions::{
    alt::{self, *},
    elw::{self, *},
    eda::{self, *},
    team::{self, *},
    reward::{self, *},
    premium::{self, *},
    presale::{self, *},
    platform::{self, *},
    liquidity::{self, *}
};

#[cfg(not(feature = "no-entrypoint"))]
solana_security_txt::security_txt! {
    name: "Still test",
    preferred_languages: "en",
    project_url: "https://example.io",
    policy: "https://example.io/policy",
    contacts: "link:https://example.io/contact",
    source_code: "https://github.com/example/example",
    auditors: "https://github.com/example/exampl-auditors"
}

#[program]
pub mod elowen {
    use super::*;

    pub fn initialize_elw(ctx: Context<InitializeElw>, metadata_uri: String) -> Result<()> {
        elw::initialize(ctx, &metadata_uri)
    }

    // eda
    pub fn withdraw_eda_elw(ctx: Context<WithdrawEdaELW>, amount: u64) -> Result<()> {
        eda::elw::withdraw(ctx, amount)
    }

    pub fn withdraw_eda_sol(ctx: Context<WithdrawEdaSOL>, amount: u64) -> Result<()> {
        eda::sol::withdraw(ctx, amount)
    }

    pub fn withdraw_eda_usdc(ctx: Context<WithdrawEdaUSDC>, amount: u64) -> Result<()> {
        eda::usdc::withdraw(ctx, amount)
    }
    // eda

    // platform
    pub fn withdraw_platform_elw(ctx: Context<WithdrawPlatformELW>, amount: u64) -> Result<()> {
        platform::withdraw(ctx, amount)
    }

    pub fn burn_platform_elw(ctx: Context<BurnPlatformELW>, amount: u64) -> Result<()> {
        platform::burn(ctx, amount)
    }
    // platform

    // team
    pub fn claim_team_elw(ctx: Context<ClaimTeamELW>) -> Result<()> {
        team::claim(ctx)
    }
    // team

    // reward
    pub fn claim_elw_reward(
        ctx: Context<ClaimReward>,
        claimable_rewards: Vec<ClaimableReward>,
    ) -> Result<()> {
        reward::claim(ctx, claimable_rewards)
    }
    // reward

    // presale
    pub fn buy_presale_elw(
        ctx: Context<BuyPresaleElw>,
        presale_type: PresaleType,
        amount_to_buy: u64,
        currency: Currency,
    ) -> Result<()> {
        presale::buy(ctx, presale_type, amount_to_buy, currency)
    }

    pub fn claim_presale_elw(
        ctx: Context<ClaimPresaleElw>,
        _presale_type: PresaleType,
    ) -> Result<()> {
        presale::claim(ctx)
    }

    pub fn burn_unsold_presale_elw(ctx: Context<BurnUnsoldElw>) -> Result<()> {
        presale::burn(ctx)
    }
    // presale

    // liquidity
    pub fn initialize_cpmm_liquidity(
        ctx: Context<LiquidityInitialize>,
        currency: Currency,
        elw_amount: u64,
        quote_amount: u64,
        open_time: u64,
    ) -> Result<()> {
        liquidity::cpmm::initialize(ctx, currency, elw_amount, quote_amount, open_time)
    }

    pub fn deposit_cpmm_liquidity(
        ctx: Context<LiquidityDeposit>,
        currency: Currency,
        lp_token_amount: u64,
        maximum_elw_amount: u64,
        maximum_quote_amount: u64,
    ) -> Result<()> {
        liquidity::cpmm::deposit(
            ctx,
            currency,
            lp_token_amount,
            maximum_elw_amount,
            maximum_quote_amount,
        )
    }
    // liquidity

    // premium
    pub fn buy_premium(
        ctx: Context<BuyPremium>,
        amount_to_pay: u64,
        currency: Currency,
    ) -> Result<()> {
        premium::buy(ctx, amount_to_pay, currency)
    }

    pub fn withdraw_treasury_elw(ctx: Context<WithdrawTreasuryELW>, amount: u64) -> Result<()> {
        premium::elw::withdraw(ctx, amount)
    }

    pub fn withdraw_treasury_usdc(ctx: Context<WithdrawTreasuryUSDC>, amount: u64) -> Result<()> {
        premium::usdc::withdraw(ctx, amount)
    }
    // premium

    // extra
    pub fn save_address_lookup_table(
        ctx: Context<SaveAddressLookupTable>,
        lookup_table: Pubkey,
    ) -> Result<()> {
        alt::save_address_lookup_table(ctx, lookup_table)
    }
}
