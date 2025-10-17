use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::{constants::*, enums::*, functions::*};

#[derive(Accounts)]
pub struct WithdrawEdaELW<'info> {
    #[account(
        mut,
        constraint = signer.key() == MULTISIG @ CustomError::Unauthorized,
    )]
    pub signer: Signer<'info>,

    // Token mint
    pub elw_mint: Account<'info, Mint>,

    /// CHECK: EDA vault
    #[account(
        seeds = [
            b"eda".as_ref(),
        ],
        bump,
    )]
    pub eda_vault: UncheckedAccount<'info>,
    #[account(mut)]
    pub eda_token_ata: Account<'info, TokenAccount>,

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

pub fn withdraw(ctx: Context<WithdrawEdaELW>, amount: u64) -> Result<()> {
    let eda_token_ata = &ctx.accounts.eda_token_ata;

    require!(
        eda_token_ata.amount >= amount,
        CustomError::NotEnoughBalanceInVault
    );

    let sender_account = &eda_token_ata.to_account_info();
    let token_program = &ctx.accounts.token_program.to_account_info();
    let authority_account = &ctx.accounts.eda_vault.to_account_info();
    let receiver_account = &ctx.accounts.receiver_token_ata.to_account_info();

    transfer_token_with_pda_key(
        "eda",
        ctx.bumps.eda_vault,
        token_program,
        sender_account,
        receiver_account,
        authority_account,
        amount,
    )?;

    Ok(())
}
