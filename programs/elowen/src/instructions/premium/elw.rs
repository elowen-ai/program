use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::{constants::*, enums::*, functions::*};

#[derive(Accounts)]
pub struct WithdrawTreasuryELW<'info> {
    #[account(
        mut,
        constraint = signer.key() == MULTISIG @ CustomError::Unauthorized,
    )]
    pub signer: Signer<'info>,

    // Token mint
    pub elw_mint: Account<'info, Mint>,

    /// CHECK: Treasury vault
    #[account(
        seeds = [
            b"treasury".as_ref(),
        ],
        bump,
    )]
    pub treasury_vault: UncheckedAccount<'info>,
    #[account(mut)]
    pub treasury_token_ata: Account<'info, TokenAccount>,

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
}

pub fn withdraw(ctx: Context<WithdrawTreasuryELW>, amount: u64) -> Result<()> {
    let treasury_token_ata = &ctx.accounts.treasury_token_ata;

    require!(
        treasury_token_ata.amount >= amount,
        CustomError::NotEnoughBalanceInVault
    );

    let sender_account = &treasury_token_ata.to_account_info();
    let token_program = &ctx.accounts.token_program.to_account_info();
    let authority_account = &ctx.accounts.treasury_vault.to_account_info();
    let receiver_account = &ctx.accounts.receiver_token_ata.to_account_info();

    transfer_token_with_pda_key(
        "treasury",
        ctx.bumps.treasury_vault,
        token_program,
        sender_account,
        receiver_account,
        authority_account,
        amount,
    )?;

    Ok(())
}
