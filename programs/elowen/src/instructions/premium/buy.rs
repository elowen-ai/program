use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::{
    constants::*,
    enums::*,
    events::{BuyPremiumEvent, ElwBurnEvent},
    functions::*,
};

#[derive(Accounts)]
pub struct BuyPremium<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>, // user account
    #[account(
        constraint = signer.key() == SIGNER @ CustomError::Unauthorized,
    )]
    pub signer: Signer<'info>,
    // ELW mint
    #[account(mut)]
    pub elw_mint: Account<'info, Mint>,
    // USDC mint
    #[account(address = USDC_MINT)]
    pub usdc_mint: Account<'info, Mint>,

    /// CHECK: Treasury vault
    #[account(
        mut,
        seeds = [
            b"treasury".as_ref(),
        ],
        bump,
    )]
    pub treasury_vault: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = usdc_mint,
        associated_token::authority = treasury_vault
    )]
    pub treasury_usdc_ata: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = elw_mint,
        associated_token::authority = treasury_vault
    )]
    pub treasury_token_ata: Account<'info, TokenAccount>,

    // Buyer token account
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = elw_mint,
        associated_token::authority = buyer
    )]
    pub buyer_token_ata: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = usdc_mint,
        associated_token::authority = buyer
    )]
    pub buyer_usdc_ata: Account<'info, TokenAccount>,

    // Official programs
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn buy(ctx: Context<BuyPremium>, amount_to_pay: u64, currency: Currency) -> Result<()> {
    let buyer = &ctx.accounts.buyer;
    let elw_mint = &ctx.accounts.elw_mint;
    let token_program = &ctx.accounts.token_program;
    let buyer_usdc_ata = &ctx.accounts.buyer_usdc_ata;
    let buyer_token_ata = &ctx.accounts.buyer_token_ata;
    let treasury_usdc_ata = &ctx.accounts.treasury_usdc_ata;
    let treasury_token_ata = &ctx.accounts.treasury_token_ata;

    if currency == Currency::USDC {
        require!(
            buyer_usdc_ata.amount >= amount_to_pay,
            CustomError::InsufficientBalance,
        );

        transfer_token(
            &token_program.to_account_info(),
            &buyer_usdc_ata.to_account_info(),
            &treasury_usdc_ata.to_account_info(),
            &buyer.to_account_info(),
            amount_to_pay,
        )?;
    } else if currency == Currency::ELW {
        require!(
            buyer_token_ata.amount >= amount_to_pay,
            CustomError::InsufficientBalance,
        );

        let burn_amount = calculate_by_percentage(amount_to_pay, PREMIUM_ELW_BURN_PERCENTAGE);

        burn_token(
            &token_program.to_account_info(),
            &elw_mint.to_account_info(),
            &buyer_token_ata.to_account_info(),
            &buyer.to_account_info(),
            burn_amount,
        )?;

        emit!(ElwBurnEvent {
            process: "premium".to_string(),
            amount: burn_amount,
        });

        transfer_token(
            &token_program.to_account_info(),
            &buyer_token_ata.to_account_info(),
            &treasury_token_ata.to_account_info(),
            &buyer.to_account_info(),
            amount_to_pay - burn_amount,
        )?;
    } else {
        require!(false, CustomError::InvalidCurrency);
    }

    emit!(BuyPremiumEvent {
        buyer: buyer.key(),
        amount: amount_to_pay,
        currency,
    });

    Ok(())
}
