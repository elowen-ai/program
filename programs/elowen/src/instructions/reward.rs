use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::{constants::*, enums::*, events::ClaimRewardEvent, functions::*, state::*};

pub const TOTAL_REWARD: u64 = 500_000_000 * 10u64.pow(9);

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(mut)]
    pub receiver: Signer<'info>, // user account
    #[account(
        constraint = signer.key() == SIGNER @ CustomError::Unauthorized,
    )]
    pub signer: Signer<'info>,

    // Platform PDA
    #[account(
        seeds = [
            b"platform".as_ref(),
        ],
        bump,
    )]
    pub platform: Account<'info, PlatformAccount>,

    /// CHECK: Reward vault
    #[account(
        seeds = [
            b"reward".as_ref(),
        ],
        bump,
    )]
    pub reward_vault: UncheckedAccount<'info>,
    #[account(mut)]
    pub reward_token_ata: Account<'info, TokenAccount>,

    // Token mint
    #[account(address = platform.elw_mint)]
    pub elw_mint: Account<'info, Mint>,

    /// CHECK: This is manual set authority
    #[account(
        constraint = if signer.key() == receiver.key() {
            ata_authority.key() == platform.key()
        } else {
            ata_authority.key() == receiver.key()
        },
    )]
    pub ata_authority: AccountInfo<'info>,

    // Receiver
    #[account(
        init_if_needed,
        payer = receiver,
        space = get_account_size(RewardAccount::INIT_SPACE),
        seeds = [
            b"reward".as_ref(),
            ata_authority.key().as_ref(),
        ],
        bump,
    )]
    pub reward_account: Account<'info, RewardAccount>,
    #[account(
        init_if_needed,
        payer = receiver,
        associated_token::mint = elw_mint,
        associated_token::authority = ata_authority
    )]
    pub receiver_token_ata: Account<'info, TokenAccount>,

    // Official programs
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ClaimableReward {
    pub timestamp: i64,
    pub percentage: u16,
}

pub fn claim(ctx: Context<ClaimReward>, claimable_rewards: Vec<ClaimableReward>) -> Result<()> {
    let reward_token_ata = &ctx.accounts.reward_token_ata;

    require!(reward_token_ata.amount > 0, CustomError::AllRewardsClaimed);

    for claimable_reward in claimable_rewards.iter() {
        let current_time = Clock::get()?.unix_timestamp;
        require!(
            claimable_reward.timestamp <= current_time,
            CustomError::ClaimableRewardNotReady
        );
    }

    let mut user_total_reward: u64 = 0;

    for claimable_reward in claimable_rewards.iter() {
        let total_distribution = calculate_reward_distribution(claimable_reward.timestamp);
        user_total_reward +=
            calculate_by_percentage(total_distribution, claimable_reward.percentage);
    }

    let token_program = &ctx.accounts.token_program;
    let reward_vault = &ctx.accounts.reward_vault;
    let receiver_token_ata = &ctx.accounts.receiver_token_ata;
    let reward_account = &mut ctx.accounts.reward_account;

    transfer_token_with_pda_key(
        "reward",
        ctx.bumps.reward_vault,
        &token_program.to_account_info(),
        &reward_token_ata.to_account_info(),
        &receiver_token_ata.to_account_info(),
        &reward_vault.to_account_info(),
        user_total_reward,
    )?;

    reward_account.amount += user_total_reward;

    // Calculate the percentage of the total prize to be distributed each time
    let percentage_f64 = (reward_account.amount as f64 / TOTAL_REWARD as f64) * 100.0;
    let percentage_u16 = (percentage_f64 * 100.0).round() as u16;

    reward_account.percentage = percentage_u16;

    emit!(ClaimRewardEvent {
        receiver: ctx.accounts.receiver.key(),
        amount: user_total_reward,
    });

    Ok(())
}
