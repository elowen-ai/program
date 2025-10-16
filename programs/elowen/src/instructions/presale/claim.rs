use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::{constants::*, enums::*, functions::*, state::*};

#[derive(Accounts)]
#[instruction(presale_type: PresaleType)]
pub struct ClaimPresaleElw<'info> {
    #[account(mut)]
    pub receiver: Signer<'info>,

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

    // Receiver presale account
    #[account(
        mut,
        seeds = [
            b"presale".as_ref(),
            receiver.key().as_ref(),
            &[presale_type as u8],
        ],
        bump,
    )]
    pub receiver_purchase_account: Account<'info, PurchaseAccount>,

    /// CHECK: Presale vault
    #[account(
        mut,
        seeds = [
            b"presale".as_ref(),
        ],
        bump,
    )]
    pub presale_vault: UncheckedAccount<'info>,
    #[account(
        mut,
        address = get_vault_account_token_ata(elw_mint.key(), VaultAccount::Presale),
    )]
    pub presale_token_ata: Account<'info, TokenAccount>,

    // Receiver token account
    #[account(
        init_if_needed,
        payer = receiver,
        associated_token::mint = elw_mint,
        associated_token::authority = receiver
    )]
    pub receiver_token_ata: Account<'info, TokenAccount>,

    // Official programs
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn claim(ctx: Context<ClaimPresaleElw>) -> Result<()> {
    let purchase_account = &mut ctx.accounts.receiver_purchase_account;

    require!(
        PRESALE_RULES.is_presale_ended(),
        CustomError::PresaleIsNotEnded
    );

    let current_time = Clock::get()?.unix_timestamp;

    require!(
        current_time >= purchase_account.unlock_time,
        CustomError::CannotClaimUntilUnlockTime
    );

    require!(!purchase_account.claimed, CustomError::TokensAlreadyClaimed);

    let receiver = &ctx.accounts.receiver.to_account_info();
    let presale_vault = &ctx.accounts.presale_vault.to_account_info();
    let token_program = &ctx.accounts.token_program.to_account_info();
    let presale_token_ata = &ctx.accounts.presale_token_ata.to_account_info();
    let receiver_token_ata = &ctx.accounts.receiver_token_ata.to_account_info();

    transfer_token_with_pda_key(
        "presale",
        ctx.bumps.presale_vault,
        token_program,
        presale_token_ata,
        receiver_token_ata,
        presale_vault,
        purchase_account.amount,
    )?;

    purchase_account.claimed = true;

    if ctx.accounts.presale_token_ata.amount == 0 {
        close_token_account_with_pda_key(
            "presale",
            ctx.bumps.presale_vault,
            token_program,
            presale_token_ata,
            receiver,
            presale_vault,
        )?;
    }

    Ok(())
}
