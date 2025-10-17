use anchor_lang::prelude::*;

use crate::{constants::*, enums::*, functions::*};

#[derive(Accounts)]
pub struct WithdrawEdaSOL<'info> {
    #[account(
        mut,
        constraint = signer.key() == MULTISIG @ CustomError::Unauthorized,
    )]
    pub signer: Signer<'info>,
    /// CHECK: EDA vault
    #[account(
        mut,
        seeds = [
            b"eda".as_ref(),
        ],
        bump,
    )]
    pub eda_vault: UncheckedAccount<'info>,
    // Receiver for SOL
    #[account(mut)]
    pub receiver: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn withdraw(ctx: Context<WithdrawEdaSOL>, amount: u64) -> Result<()> {
    let lamports = ctx.accounts.eda_vault.lamports();

    require!(lamports >= amount, CustomError::NotEnoughBalanceInVault);

    transfer_sol_with_pda_key(
        "eda",
        ctx.bumps.eda_vault,
        &ctx.accounts.eda_vault,
        &ctx.accounts.receiver,
        amount,
    )?;

    Ok(())
}
