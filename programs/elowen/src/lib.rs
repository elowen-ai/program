#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

declare_id!("3R63fNvrbn2mb2Em28i4UTPEJN83EAVQDmFuNzrkXVKw");

mod constants;
mod enums;
mod functions;
mod instructions;
mod state;
mod events;

use instructions::{
    alt::{self, *},
    elw::{self, *},
    team::{self, *},
    reward::{self, *},
    platform::{self, *},
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

    // extra
    pub fn save_address_lookup_table(
        ctx: Context<SaveAddressLookupTable>,
        lookup_table: Pubkey,
    ) -> Result<()> {
        alt::save_address_lookup_table(ctx, lookup_table)
    }
}
