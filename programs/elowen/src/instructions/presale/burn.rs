use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::{constants::*, enums::*, events::ElwBurnEvent, functions::*, state::*};

#[derive(Accounts)]
pub struct BurnUnsoldElw<'info> {
    #[account(
        constraint = signer.key() == SIGNER @ CustomError::Unauthorized,
    )]
    pub signer: Signer<'info>,

    // Token mint
    #[account(mut)]
    pub elw_mint: Account<'info, Mint>,

    /// CHECK: Presale vault
    #[account(
        mut,
        seeds = [
            b"presale".as_ref(),
        ],
        bump,
    )]
    pub presale_vault: UncheckedAccount<'info>,
    #[account(mut)]
    pub presale_token_ata: Account<'info, TokenAccount>,

    // Total sales account
    #[account(
        mut,
        seeds = [
            b"presale_summary".as_ref(),
        ],
        bump,
    )]
    pub presale_summary_account: Account<'info, SummaryAccount>,

    // Official programs
    pub token_program: Program<'info, Token>,
}

pub fn burn(ctx: Context<BurnUnsoldElw>) -> Result<()> {
    let summary_account = &mut ctx.accounts.presale_summary_account;

    let burn_amount = summary_account.total_amount - summary_account.token_sold;

    require!(burn_amount > 0, CustomError::AllTokensSold);

    require!(
        !summary_account.is_unsold_tokens_burned,
        CustomError::UnsoldTokensAlreadyBurned
    );

    require!(
        PRESALE_RULES.is_presale_ended(),
        CustomError::CannotBurnUntilPresaleDone
    );

    let signer = &ctx.accounts.signer.to_account_info();
    let mint_account = &ctx.accounts.elw_mint.to_account_info();
    let token_program = &ctx.accounts.token_program.to_account_info();
    let from_account = &ctx.accounts.presale_token_ata.to_account_info();
    let authority_account = &ctx.accounts.presale_vault.to_account_info();

    burn_token_with_pda_key(
        "presale",
        ctx.bumps.presale_vault,
        token_program,
        mint_account,
        from_account,
        authority_account,
        burn_amount,
    )?;

    emit!(ElwBurnEvent {
        process: "presale".to_string(),
        amount: burn_amount,
    });

    if ctx.accounts.presale_token_ata.amount == 0 {
        close_token_account_with_pda_key(
            "presale",
            ctx.bumps.presale_vault,
            token_program,
            from_account,
            signer,
            authority_account,
        )?;
    }

    summary_account.is_unsold_tokens_burned = true;

    Ok(())
}
