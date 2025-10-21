#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

declare_id!("48ug74S2RBzih8DtNpyDqhTCZnzUoYuYyzwttmHEiMRS");

mod constants;
mod enums;
mod events;
mod functions;
mod instructions;
mod state;

use enums::*;
use instructions::{
    alt::{self, *},
    eda::{self, *},
    elw::{self, *},
    liquidity::{self, *},
    platform::{self, *},
    premium::{self, *},
    presale::{self, *},
    reward::{self, *},
    team::{self, *},
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

    // team
    pub fn claim_team_elw(ctx: Context<ClaimTeamELW>) -> Result<()> {
        team::claim(ctx)
    }
    // team

    // platform
    pub fn withdraw_platform_elw(ctx: Context<WithdrawPlatformELW>, amount: u64) -> Result<()> {
        platform::withdraw(ctx, amount)
    }

    pub fn burn_platform_elw(ctx: Context<BurnPlatformELW>, amount: u64) -> Result<()> {
        platform::burn(ctx, amount)
    }
    // platform

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

    // reward
    pub fn claim_elw_reward(
        ctx: Context<ClaimReward>,
        claimable_rewards: Vec<ClaimableReward>,
    ) -> Result<()> {
        reward::claim(ctx, claimable_rewards)
    }
    // reward

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

    pub fn collect_locked_liquidity_fees(
        ctx: Context<CollectLockedLiquidityFees>,
        currency: Currency,
    ) -> Result<()> {
        liquidity::cpmm::collect(ctx, currency)
    }

    pub fn deposit_mining_liquidity(
        ctx: Context<LiquidityMiningDeposit>,
        currency: Currency,
        lp_token_amount: u64,
        maximum_elw_amount: u64,
        maximum_quote_amount: u64,
    ) -> Result<()> {
        liquidity::mining::deposit(
            ctx,
            currency,
            lp_token_amount,
            maximum_elw_amount,
            maximum_quote_amount,
        )
    }

    pub fn withdraw_mining_liquidity(
        ctx: Context<LiquidityMiningWithdraw>,
        currency: Currency,
        lp_token_amount: u64,
        minimum_elw_amount: u64,
        minimum_quote_amount: u64,
    ) -> Result<()> {
        liquidity::mining::withdraw(
            ctx,
            currency,
            lp_token_amount,
            minimum_elw_amount,
            minimum_quote_amount,
        )
    }

    pub fn claim_mining_rewards(
        ctx: Context<LiquidityMiningClaim>,
        _currency: Currency,
    ) -> Result<()> {
        liquidity::mining::claim(ctx)
    }

    pub fn swap_cpmm(
        ctx: Context<LiquiditySwap>,
        amount_in: u64,
        amount_out: u64,
        input_currency: Currency,
        output_currency: Currency,
        swap_direction: SwapDirection,
    ) -> Result<()> {
        liquidity::cpmm::swap(
            ctx,
            amount_in,
            amount_out,
            input_currency,
            output_currency,
            swap_direction,
        )
    }

    pub fn vault_swap_cpmm(
        ctx: Context<LiquidityVaultSwap>,
        amount_in: u64,
        amount_out: u64,
        vault: VaultAccount,
        input_currency: Currency,
        output_currency: Currency,
        swap_direction: SwapDirection,
    ) -> Result<()> {
        liquidity::cpmm::vault_swap(
            ctx,
            amount_in,
            amount_out,
            vault,
            input_currency,
            output_currency,
            swap_direction,
        )
    }
    // liquidity

    // extra
    pub fn save_address_lookup_table(
        ctx: Context<SaveAddressLookupTable>,
        lookup_table: Pubkey,
    ) -> Result<()> {
        alt::save_address_lookup_table(ctx, lookup_table)
    }
}
