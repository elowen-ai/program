use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};

use crate::{constants::*, enums::*, events::BuyPresaleTokenEvent, functions::*, state::*};

#[derive(Accounts)]
#[instruction(presale_type: PresaleType)]
pub struct BuyPresaleElw<'info> {
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
    // USDC mint
    #[account(address = USDC_MINT)]
    pub usdc_mint: Account<'info, Mint>,
    // WSOl mint
    #[account(address = WSOL_MINT)]
    pub wsol_mint: Account<'info, Mint>,

    // Receiver presale account
    #[account(
        init_if_needed,
        payer = receiver,
        space = get_account_size(PurchaseAccount::INIT_SPACE),
        seeds = [
            b"presale".as_ref(),
            receiver.key().as_ref(),
            &[presale_type as u8],
        ],
        bump,
    )]
    pub receiver_purchase_account: Account<'info, PurchaseAccount>,

    // Total sales account
    #[account(
        init_if_needed,
        payer = receiver,
        space = get_account_size(SummaryAccount::INIT_SPACE),
        seeds = [
            b"presale_summary".as_ref(),
        ],
        bump,
    )]
    pub presale_summary_account: Account<'info, SummaryAccount>,

    /// CHECK: Presale vault
    #[account(
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
    /// CHECK: Liquidity vault
    #[account(
        seeds = [
            b"liquidity".as_ref(),
        ],
        bump,
    )]
    pub liquidity_vault: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = receiver,
        associated_token::mint = usdc_mint,
        associated_token::authority = liquidity_vault
    )]
    pub liquidity_usdc_ata: Box<Account<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = receiver,
        associated_token::mint = wsol_mint,
        associated_token::authority = liquidity_vault
    )]
    pub liquidity_wsol_ata: Box<Account<'info, TokenAccount>>,
    /// CHECK: EDA vault
    #[account(
        mut,
        seeds = [
            b"eda".as_ref(),
        ],
        bump,
    )]
    pub eda_vault: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = receiver,
        associated_token::mint = usdc_mint,
        associated_token::authority = eda_vault
    )]
    pub eda_usdc_ata: Box<Account<'info, TokenAccount>>,

    // Receiver token account
    #[account(
        init_if_needed,
        payer = receiver,
        associated_token::mint = usdc_mint,
        associated_token::authority = receiver
    )]
    pub receiver_usdc_ata: Box<Account<'info, TokenAccount>>,

    // Official programs
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    // pyth program
    pub price_update: Box<Account<'info, PriceUpdateV2>>,
}

pub fn buy(
    ctx: Context<BuyPresaleElw>,
    presale_type: PresaleType,
    amount_to_buy: u64,
    currency: Currency,
) -> Result<()> {
    let summary_account = &mut ctx.accounts.presale_summary_account;
    let purchase_account = &mut ctx.accounts.receiver_purchase_account;

    PRESALE_RULES.conditions(
        amount_to_buy,
        summary_account.token_sold,
        purchase_account.amount,
    )?;

    let unlock_time = PRESALE_RULES.get_unlock_time(presale_type);
    let (payment_amount, eda_amount) =
        PRESALE_RULES.calculate_payment_amount_and_eda_amount(amount_to_buy, presale_type);

    let receiver_usdc_ata_amount = ctx.accounts.receiver_usdc_ata.amount;
    let receiver = &ctx.accounts.receiver.to_account_info();
    let eda_vault = &ctx.accounts.eda_vault.to_account_info();
    let eda_usdc_ata = &ctx.accounts.eda_usdc_ata.to_account_info();
    let token_program = &ctx.accounts.token_program.to_account_info();
    let liquidity_wsol_ata = &ctx.accounts.liquidity_wsol_ata.to_account_info();
    let liquidity_usdc_ata = &ctx.accounts.liquidity_usdc_ata.to_account_info();
    let receiver_usdc_ata = &ctx.accounts.receiver_usdc_ata.to_account_info();

    if currency == Currency::USDC {
        require!(
            receiver_usdc_ata_amount >= payment_amount + eda_amount,
            CustomError::InsufficientBalance,
        );

        transfer_token(
            token_program,
            receiver_usdc_ata,
            liquidity_usdc_ata,
            receiver,
            payment_amount,
        )?;

        transfer_token(
            token_program,
            receiver_usdc_ata,
            eda_usdc_ata,
            receiver,
            eda_amount,
        )?;

        summary_account.usdc_sent_to_eda += eda_amount;
        summary_account.usdc_sent_to_liquidity += payment_amount;
        summary_account.token_sold_for_usdc += amount_to_buy;
        summary_account.usdc_raised += payment_amount + eda_amount;
    } else if currency == Currency::SOL {
        let feed_id = get_feed_id_from_hex(
            "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
        )?;
        let price_update = &ctx.accounts.price_update;
        let price_data = price_update.get_price_unchecked(&feed_id)?;
        let price = price_data.price + price_data.conf as i64; // see: https://docs.pyth.network/price-feeds/use-real-time-data/solana
        let sol_payment_amount = usdc_to_sol(payment_amount, price, price_data.exponent);
        let sol_eda_amount = usdc_to_sol(eda_amount, price, price_data.exponent);

        let sol_balance = **receiver.to_account_info().try_borrow_lamports()?;

        require!(
            sol_balance >= sol_payment_amount + sol_eda_amount,
            CustomError::InsufficientBalance,
        );

        transfer_sol(receiver, eda_vault, sol_eda_amount)?;
        transfer_sol(receiver, liquidity_wsol_ata, sol_payment_amount)?;

        // Wrap SOL for liquidity pool
        wrap_sol(token_program, liquidity_wsol_ata)?;

        summary_account.sol_sent_to_eda += sol_eda_amount;
        summary_account.sol_sent_to_liquidity += sol_payment_amount;
        summary_account.token_sold_for_sol += amount_to_buy;
        summary_account.sol_raised += sol_payment_amount + sol_eda_amount;
    } else {
        require!(false, CustomError::InvalidCurrency);
    }

    // presale summary account
    summary_account.token_sold += amount_to_buy;
    // write for the first time
    if summary_account.total_amount == 0 {
        summary_account.total_amount = PRESALE_RULES.total_amount;
    }
    // receiver purchase account
    purchase_account.amount += amount_to_buy;
    purchase_account.unlock_time = unlock_time;
    purchase_account.presale_type = presale_type as u8;

    emit!(BuyPresaleTokenEvent {
        receiver: ctx.accounts.receiver.key(),
        amount: amount_to_buy,
    });

    Ok(())
}
