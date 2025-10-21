use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::{enums::*, functions::*, state::*};

#[derive(Accounts)]
#[instruction(currency: Currency)]
pub struct LiquidityMiningClaim<'info> {
    #[account(mut)]
    pub miner: Signer<'info>,

    // Platform PDA
    #[account(
        seeds = [
            b"platform".as_ref(),
        ],
        bump,
    )]
    pub platform: Account<'info, PlatformAccount>,

    // Token mint
    #[account(address = platform.elw_mint)]
    pub elw_mint: Account<'info, Mint>,

    #[account(mut)]
    pub platform_token_ata: Account<'info, TokenAccount>,

    // Receiver
    #[account(
        init_if_needed,
        payer = miner,
        associated_token::mint = elw_mint,
        associated_token::authority = miner
    )]
    pub miner_token_ata: Account<'info, TokenAccount>,

    // Official programs
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,

    // mining states
    #[account(
        mut,
        seeds = [
            b"miner_state".as_ref(),
            miner.key().as_ref(),
            &[currency as u8],
        ],
        bump,
    )]
    pub miner_state: Account<'info, MinerStateAccount>,
    #[account(
        mut,
        seeds = [
            b"mining_state".as_ref(),
            &[currency as u8],
        ],
        bump,
    )]
    pub mining_state: Account<'info, MiningStateAccount>,
}

pub fn claim(ctx: Context<LiquidityMiningClaim>) -> Result<()> {
    let platform_elw_amount = ctx.accounts.platform_token_ata.amount;
    let miner_state = &mut ctx.accounts.miner_state;
    let mining_state = &mut ctx.accounts.mining_state;

    let claimable_rewards =
        mining_state.update_sync(miner_state, platform_elw_amount, 0, 0, MiningAction::Claim);

    require!(claimable_rewards > 0, CustomError::NoClaimableRewards);

    require!(
        claimable_rewards <= platform_elw_amount,
        CustomError::InsufficientReward
    );

    transfer_token_with_pda_key(
        "platform",
        ctx.bumps.platform,
        &ctx.accounts.token_program.to_account_info(),
        &ctx.accounts.platform_token_ata.to_account_info(),
        &ctx.accounts.miner_token_ata.to_account_info(),
        &ctx.accounts.platform.to_account_info(),
        claimable_rewards,
    )?;

    Ok(())
}
