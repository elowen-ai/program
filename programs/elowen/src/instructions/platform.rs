use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::{constants::*, enums::*, events::ElwBurnEvent, functions::*, state::*};

#[derive(Accounts)]
pub struct WithdrawPlatformELW<'info> {
    #[account(
        mut,
        constraint = signer.key() == MULTISIG @ CustomError::Unauthorized,
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

    // Token mint
    #[account(address = platform.elw_mint)]
    pub elw_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = elw_mint,
        associated_token::authority = platform
    )]
    pub platform_token_ata: Account<'info, TokenAccount>,

    // Receiver
    pub receiver: SystemAccount<'info>,
    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = elw_mint,
        associated_token::authority = receiver
    )]
    pub receiver_token_ata: Account<'info, TokenAccount>,

    // Official programs
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    // mining state
    #[account(
        init_if_needed,
        payer = signer,
        space = get_account_size(MiningStateAccount::INIT_SPACE),
        seeds = [
            b"mining_state".as_ref(),
            &[Currency::USDC as u8],
        ],
        bump,
    )]
    pub usdc_state: Account<'info, MiningStateAccount>,
    #[account(
        init_if_needed,
        payer = signer,
        space = get_account_size(MiningStateAccount::INIT_SPACE),
        seeds = [
            b"mining_state".as_ref(),
            &[Currency::SOL as u8],
        ],
        bump,
    )]
    pub sol_state: Account<'info, MiningStateAccount>,
}

fn get_available_amount(
    platform_token_ata: &TokenAccount,
    usdc_state: &MiningStateAccount,
    sol_state: &MiningStateAccount,
) -> u64 {
    let usdc_pool_locked_amount = usdc_state.get_locked_reward_amount(platform_token_ata.amount);
    let sol_pool_locked_amount = sol_state.get_locked_reward_amount(platform_token_ata.amount);
    let locked_amount = usdc_pool_locked_amount.saturating_add(sol_pool_locked_amount);
    platform_token_ata.amount.saturating_sub(locked_amount)
}

pub fn withdraw(ctx: Context<WithdrawPlatformELW>, amount: u64) -> Result<()> {
    let platform_token_ata = &ctx.accounts.platform_token_ata;

    let available_amount = get_available_amount(
        platform_token_ata,
        &ctx.accounts.usdc_state,
        &ctx.accounts.sol_state,
    );

    require!(
        amount <= available_amount,
        CustomError::ThisAmountIsLockedForMiningRewards
    );

    let sender_account = &platform_token_ata.to_account_info();
    let token_program = &ctx.accounts.token_program.to_account_info();
    let authority_account = &ctx.accounts.platform.to_account_info();
    let receiver_account = &ctx.accounts.receiver_token_ata.to_account_info();

    transfer_token_with_pda_key(
        "platform",
        ctx.bumps.platform,
        token_program,
        sender_account,
        receiver_account,
        authority_account,
        amount,
    )?;

    Ok(())
}

#[derive(Accounts)]
pub struct BurnPlatformELW<'info> {
    #[account(
        mut,
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

    // Token mint
    #[account(mut, address = platform.elw_mint)]
    pub elw_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = elw_mint,
        associated_token::authority = platform
    )]
    pub platform_token_ata: Account<'info, TokenAccount>,

    // Official programs
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,

    // mining state
    #[account(
        init_if_needed,
        payer = signer,
        space = get_account_size(MiningStateAccount::INIT_SPACE),
        seeds = [
            b"mining_state".as_ref(),
            &[Currency::USDC as u8],
        ],
        bump,
    )]
    pub usdc_state: Account<'info, MiningStateAccount>,
    #[account(
        init_if_needed,
        payer = signer,
        space = get_account_size(MiningStateAccount::INIT_SPACE),
        seeds = [
            b"mining_state".as_ref(),
            &[Currency::SOL as u8],
        ],
        bump,
    )]
    pub sol_state: Account<'info, MiningStateAccount>,
}

pub fn burn(ctx: Context<BurnPlatformELW>, amount: u64) -> Result<()> {
    let platform_token_ata = &ctx.accounts.platform_token_ata;

    let available_amount = get_available_amount(
        platform_token_ata,
        &ctx.accounts.usdc_state,
        &ctx.accounts.sol_state,
    );

    require!(
        amount <= available_amount,
        CustomError::ThisAmountIsLockedForMiningRewards
    );

    let from_account = &platform_token_ata.to_account_info();
    let mint_account = &ctx.accounts.elw_mint.to_account_info();
    let token_program = &ctx.accounts.token_program.to_account_info();
    let authority_account = &ctx.accounts.platform.to_account_info();

    burn_token_with_pda_key(
        "platform",
        ctx.bumps.platform,
        token_program,
        mint_account,
        from_account,
        authority_account,
        amount,
    )?;

    emit!(ElwBurnEvent {
        amount,
        process: "platform".to_string(),
    });

    Ok(())
}
