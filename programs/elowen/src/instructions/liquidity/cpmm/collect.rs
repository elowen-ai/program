use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    memo::Memo,
    token::Token,
    token_2022::Token2022,
    token_interface::{Mint, TokenAccount},
};
use raydium_cp_swap::{
    cpi as cp_swap_cpi,
    program::RaydiumCpSwap,
    states::{AmmConfig, ObservationState, PoolState},
};
use raydium_locking_cpi::{
    cpi as locking_cpi, program::RaydiumLiquidityLocking, states::LockedCpLiquidityState,
};

use crate::{
    constants::*,
    enums::{Currency, CustomError},
    events::ElwBurnEvent,
    functions::*,
    state::PlatformAccount,
};

#[derive(Accounts)]
#[instruction(currency: Currency)]
pub struct CollectLockedLiquidityFees<'info> {
    #[account(
        mut,
        constraint = signer.key() == SIGNER @ CustomError::Unauthorized,
    )]
    pub signer: Signer<'info>,

    pub locking_program: Program<'info, RaydiumLiquidityLocking>,

    /// CHECK: the authority of token vault that cp is locked
    #[account(
        seeds = [
            raydium_locking_cpi::LOCK_CP_AUTH_SEED.as_bytes(),
        ],
        bump,
        seeds::program = locking_program.key(),
    )]
    pub locking_authority: UncheckedAccount<'info>,

    // Platform PDA
    #[account(
        seeds = [
            b"platform".as_ref(),
        ],
        bump,
    )]
    pub platform: Account<'info, PlatformAccount>,
    /// CHECK: Liquidity vault
    #[account(
        mut,
        seeds = [
            b"liquidity".as_ref(),
        ],
        bump,
    )]
    pub liquidity_vault: UncheckedAccount<'info>,

    /// Fee token account
    #[account(
        constraint = fee_nft_account.amount == 1,
        associated_token::authority = liquidity_vault,
        associated_token::mint = locked_liquidity.fee_nft_mint
    )]
    pub fee_nft_account: InterfaceAccount<'info, TokenAccount>,

    /// Store the locked the information of liquidity
    #[account(
        mut,
        constraint = locked_liquidity.fee_nft_mint == fee_nft_account.mint
    )]
    pub locked_liquidity: Account<'info, LockedCpLiquidityState>,

    /// cpmm program
    pub cpmm_program: Program<'info, RaydiumCpSwap>,

    /// CHECK: cp program vault and lp mint authority
    #[account(
        seeds = [
            raydium_cp_swap::AUTH_SEED.as_bytes(),
        ],
        bump,
        seeds::program = cpmm_program.key(),
    )]
    pub cp_swap_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        address = locked_liquidity.pool_id
    )]
    pub pool_state: AccountLoader<'info, PoolState>,

    #[account(mut, address = pool_state.load()?.observation_key)]
    pub observation_state: AccountLoader<'info, ObservationState>,

    // Which config the pool belongs to.
    #[account(address = pool_state.load()?.amm_config)]
    pub amm_config: Account<'info, AmmConfig>,

    #[account(
        mut,
        address = pool_state.load()?.lp_mint
    )]
    pub lp_mint: InterfaceAccount<'info, Mint>,

    // token mints
    #[account(mut, address = platform.elw_mint)]
    pub elw_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(address = get_quote_mint(currency).unwrap())]
    pub quote_mint: Box<InterfaceAccount<'info, Mint>>,

    // token accounts
    #[account(
        mut,
        associated_token::mint = elw_mint,
        associated_token::authority = liquidity_vault
    )]
    pub liquidity_elw_token_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        associated_token::mint = quote_mint,
        associated_token::authority = liquidity_vault
    )]
    pub liquidity_quote_token_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = elw_vault.key() == pool_state.load()?.token_0_vault
    )]
    pub elw_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = quote_vault.key() == pool_state.load()?.token_1_vault
    )]
    pub quote_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// locked lp token account
    #[account(
        mut,
        associated_token::mint = lp_mint,
        associated_token::authority = locking_authority
    )]
    pub locked_lp_token_ata: Box<InterfaceAccount<'info, TokenAccount>>,
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
        mut,
        associated_token::mint = elw_mint,
        associated_token::authority = eda_vault
    )]
    pub eda_elw_token_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = quote_mint,
        associated_token::authority = eda_vault
    )]
    pub eda_quote_token_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    // Official programs
    pub memo_program: Program<'info, Memo>,
    pub token_program: Program<'info, Token>,
    pub token_program_2022: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn collect(ctx: Context<CollectLockedLiquidityFees>, currency: Currency) -> Result<()> {
    let before_elw_amount = ctx.accounts.liquidity_elw_token_ata.amount;
    let before_quote_amount = ctx.accounts.liquidity_quote_token_ata.amount;

    let signer_seeds: &[&[&[u8]]] = &[&[b"liquidity".as_ref(), &[ctx.bumps.liquidity_vault]]];

    locking_cpi::collect_cp_fees(
        CpiContext::new_with_signer(
            ctx.accounts.locking_program.to_account_info(),
            locking_cpi::accounts::CollectCpFee {
                authority: ctx.accounts.locking_authority.to_account_info(),
                fee_nft_owner: ctx.accounts.liquidity_vault.to_account_info(),
                fee_nft_account: ctx.accounts.fee_nft_account.to_account_info(),
                locked_liquidity: ctx.accounts.locked_liquidity.to_account_info(),
                cpmm_program: ctx.accounts.cpmm_program.to_account_info(),
                cp_authority: ctx.accounts.cp_swap_authority.to_account_info(),
                pool_state: ctx.accounts.pool_state.to_account_info(),
                lp_mint: ctx.accounts.lp_mint.to_account_info(),
                recipient_token_0_account: ctx.accounts.liquidity_elw_token_ata.to_account_info(),
                recipient_token_1_account: ctx.accounts.liquidity_quote_token_ata.to_account_info(),
                token_0_vault: ctx.accounts.elw_vault.to_account_info(),
                token_1_vault: ctx.accounts.quote_vault.to_account_info(),
                vault_0_mint: ctx.accounts.elw_mint.to_account_info(),
                vault_1_mint: ctx.accounts.quote_mint.to_account_info(),
                locked_lp_vault: ctx.accounts.locked_lp_token_ata.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
                token_program_2022: ctx.accounts.token_program_2022.to_account_info(),
                memo_program: ctx.accounts.memo_program.to_account_info(),
            },
            signer_seeds,
        ),
        u64::MAX,
    )?;

    let updated_elw_token_amount =
        reload_token_account(&ctx.accounts.liquidity_elw_token_ata)?.amount;
    let updated_quote_token_amount =
        reload_token_account(&ctx.accounts.liquidity_quote_token_ata)?.amount;

    let withdraw_elw_amount = updated_elw_token_amount - before_elw_amount;
    let withdraw_quote_amount = updated_quote_token_amount - before_quote_amount;

    require!(withdraw_elw_amount > 0, CustomError::NoRewardInVault);

    let eda_elw_amount = calculate_by_percentage(withdraw_elw_amount, COLLECT_FEE_EDA_PERCENTAGE);
    let eda_quote_amount =
        calculate_by_percentage(withdraw_quote_amount, COLLECT_FEE_EDA_PERCENTAGE);

    let burn_elw_amount = calculate_by_percentage(withdraw_elw_amount, COLLECT_FEE_BURN_PERCENTAGE);
    let buyback_quote_amount =
        calculate_by_percentage(withdraw_quote_amount, COLLECT_FEE_BURN_PERCENTAGE);

    cp_swap_cpi::swap_base_input(
        CpiContext::new_with_signer(
            ctx.accounts.cpmm_program.to_account_info(),
            cp_swap_cpi::accounts::Swap {
                payer: ctx.accounts.liquidity_vault.to_account_info(),
                authority: ctx.accounts.cp_swap_authority.to_account_info(),
                pool_state: ctx.accounts.pool_state.to_account_info(),
                observation_state: ctx.accounts.observation_state.to_account_info(),
                amm_config: ctx.accounts.amm_config.to_account_info(),
                input_vault: ctx.accounts.quote_vault.to_account_info(),
                output_vault: ctx.accounts.elw_vault.to_account_info(),
                input_token_mint: ctx.accounts.quote_mint.to_account_info(),
                output_token_mint: ctx.accounts.elw_mint.to_account_info(),
                input_token_account: ctx.accounts.liquidity_quote_token_ata.to_account_info(),
                output_token_account: ctx.accounts.liquidity_elw_token_ata.to_account_info(),
                input_token_program: ctx.accounts.token_program.to_account_info(),
                output_token_program: ctx.accounts.token_program.to_account_info(),
            },
            signer_seeds,
        ),
        buyback_quote_amount,
        0,
    )?;

    let new_elw_token_amount = reload_token_account(&ctx.accounts.liquidity_elw_token_ata)?.amount;
    let burn_elw_amount = burn_elw_amount + (new_elw_token_amount - updated_elw_token_amount);

    transfer_token_with_pda_key(
        "liquidity",
        ctx.bumps.liquidity_vault,
        &ctx.accounts.token_program,
        &ctx.accounts.liquidity_elw_token_ata.to_account_info(),
        &ctx.accounts.eda_elw_token_ata.to_account_info(),
        &ctx.accounts.liquidity_vault.to_account_info(),
        eda_elw_amount,
    )?;

    transfer_token_with_pda_key(
        "liquidity",
        ctx.bumps.liquidity_vault,
        &ctx.accounts.token_program,
        &ctx.accounts.liquidity_quote_token_ata.to_account_info(),
        &ctx.accounts.eda_quote_token_ata.to_account_info(),
        &ctx.accounts.liquidity_vault.to_account_info(),
        eda_quote_amount,
    )?;

    if currency == Currency::SOL {
        close_token_account_with_pda_key(
            "eda",
            ctx.bumps.eda_vault,
            &ctx.accounts.token_program,
            &ctx.accounts.eda_quote_token_ata.to_account_info(),
            &ctx.accounts.eda_vault.to_account_info(),
            &ctx.accounts.eda_vault.to_account_info(),
        )?;
    }

    burn_token_with_pda_key(
        "liquidity",
        ctx.bumps.liquidity_vault,
        &ctx.accounts.token_program,
        &ctx.accounts.elw_mint.to_account_info(),
        &ctx.accounts.liquidity_elw_token_ata.to_account_info(),
        &ctx.accounts.liquidity_vault.to_account_info(),
        burn_elw_amount,
    )?;

    emit!(ElwBurnEvent {
        process: "collect".to_string(),
        amount: burn_elw_amount,
    });

    Ok(())
}
