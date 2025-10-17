use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::{constants::*, enums::*, functions::*};

#[derive(Accounts)]
pub struct WithdrawTreasuryUSDC<'info> {
    #[account(
        mut,
        constraint = signer.key() == MULTISIG @ CustomError::Unauthorized,
    )]
    pub signer: Signer<'info>,

    // Token mint
    #[account(address = USDC_MINT)]
    pub usdc_mint: Account<'info, Mint>,

    /// CHECK: Treasury vault
    #[account(
        seeds = [
            b"treasury".as_ref(),
        ],
        bump,
    )]
    pub treasury_vault: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = usdc_mint,
        associated_token::authority = treasury_vault
    )]
    pub treasury_usdc_ata: Account<'info, TokenAccount>,

    // Receiver
    pub receiver: SystemAccount<'info>,
    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = usdc_mint,
        associated_token::authority = receiver
    )]
    pub receiver_usdc_ata: Account<'info, TokenAccount>,

    // Official programs
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn withdraw(ctx: Context<WithdrawTreasuryUSDC>, amount: u64) -> Result<()> {
    let treasury_usdc_ata = &ctx.accounts.treasury_usdc_ata;

    require!(
        treasury_usdc_ata.amount >= amount,
        CustomError::NotEnoughBalanceInVault
    );

    let sender_account = &treasury_usdc_ata.to_account_info();
    let token_program = &ctx.accounts.token_program.to_account_info();
    let authority_account = &ctx.accounts.treasury_vault.to_account_info();
    let receiver_account = &ctx.accounts.receiver_usdc_ata.to_account_info();

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
