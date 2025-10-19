use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::Token,
    token_interface::{Mint, TokenAccount},
};
use raydium_cp_swap::{
    cpi,
    program::RaydiumCpSwap,
    states::{AmmConfig, ObservationState, PoolState},
};

use crate::{
    constants::{SIGNER, WSOL_MINT},
    enums::{Currency, CustomError, SwapDirection, VaultAccount},
    functions::*,
};

#[derive(Accounts)]
pub struct LiquiditySwap<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    // Raydium CPMM program
    #[account(
        address = raydium_cp_swap::ID,
    )]
    pub cp_swap_program: Program<'info, RaydiumCpSwap>,

    /// CHECK: pool vault and lp mint authority
    #[account(
        seeds = [
            raydium_cp_swap::AUTH_SEED.as_bytes(),
        ],
        seeds::program = cp_swap_program,
        bump,
    )]
    pub authority: UncheckedAccount<'info>,

    // pool account
    #[account(mut)]
    pub pool_state: AccountLoader<'info, PoolState>,

    #[account(mut, address = pool_state.load()?.observation_key)]
    pub observation_state: AccountLoader<'info, ObservationState>,

    // Which config the pool belongs to.
    #[account(address = pool_state.load()?.amm_config)]
    pub amm_config: Account<'info, AmmConfig>,

    // pool vaults
    #[account(
        mut,
        constraint = input_vault.key() == pool_state.load()?.token_0_vault || input_vault.key() == pool_state.load()?.token_1_vault
    )]
    pub input_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        constraint = output_vault.key() == pool_state.load()?.token_0_vault || output_vault.key() == pool_state.load()?.token_1_vault
    )]
    pub output_vault: InterfaceAccount<'info, TokenAccount>,

    // token mints
    #[account(
        address = input_vault.mint
    )]
    pub input_token_mint: InterfaceAccount<'info, Mint>,
    #[account(
        address = output_vault.mint
    )]
    pub output_token_mint: InterfaceAccount<'info, Mint>,

    // token accounts
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = input_token_mint,
        associated_token::authority = payer
    )]
    pub input_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = output_token_mint,
        associated_token::authority = payer
    )]
    pub output_token_account: InterfaceAccount<'info, TokenAccount>,

    // for WSOL transfers
    #[account(address = WSOL_MINT)]
    pub wsol_mint: InterfaceAccount<'info, Mint>,
    /// CHECK: payer_wsol_vault is a vault account
    #[account(
        seeds = [
            b"payer_wsol".as_ref(),
            payer.key().as_ref(),
        ],
        bump,
    )]
    pub payer_wsol_vault: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = wsol_mint,
        associated_token::authority = payer_wsol_vault
    )]
    pub payer_wsol_ata: InterfaceAccount<'info, TokenAccount>,

    // Official programs
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct LiquidityVaultSwap<'info> {
    #[account(
        mut,
        constraint = signer.key() == SIGNER @ CustomError::Unauthorized,
    )]
    pub signer: Signer<'info>,

    /// CHECK: vault is a vault account
    #[account(mut)]
    pub vault: UncheckedAccount<'info>,

    // Raydium CPMM program
    #[account(
        address = raydium_cp_swap::ID,
    )]
    pub cp_swap_program: Program<'info, RaydiumCpSwap>,

    /// CHECK: pool vault and lp mint authority
    #[account(
        seeds = [
            raydium_cp_swap::AUTH_SEED.as_bytes(),
        ],
        seeds::program = cp_swap_program,
        bump,
    )]
    pub authority: UncheckedAccount<'info>,

    // pool account
    #[account(mut)]
    pub pool_state: AccountLoader<'info, PoolState>,

    #[account(mut, address = pool_state.load()?.observation_key)]
    pub observation_state: AccountLoader<'info, ObservationState>,

    // Which config the pool belongs to.
    #[account(address = pool_state.load()?.amm_config)]
    pub amm_config: Account<'info, AmmConfig>,

    // pool vaults
    #[account(
        mut,
        constraint = input_vault.key() == pool_state.load()?.token_0_vault || input_vault.key() == pool_state.load()?.token_1_vault
    )]
    pub input_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        constraint = output_vault.key() == pool_state.load()?.token_0_vault || output_vault.key() == pool_state.load()?.token_1_vault
    )]
    pub output_vault: InterfaceAccount<'info, TokenAccount>,

    // token mints
    #[account(
        address = input_vault.mint
    )]
    pub input_token_mint: InterfaceAccount<'info, Mint>,
    #[account(
        address = output_vault.mint
    )]
    pub output_token_mint: InterfaceAccount<'info, Mint>,

    // token accounts
    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = input_token_mint,
        associated_token::authority = vault
    )]
    pub input_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = output_token_mint,
        associated_token::authority = vault
    )]
    pub output_token_account: InterfaceAccount<'info, TokenAccount>,

    // for WSOL transfers
    #[account(address = WSOL_MINT)]
    pub wsol_mint: InterfaceAccount<'info, Mint>,
    /// CHECK: payer_wsol_vault is a vault account
    #[account(
        seeds = [
            b"payer_wsol".as_ref(),
            vault.key().as_ref(),
        ],
        bump,
    )]
    pub payer_wsol_vault: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = wsol_mint,
        associated_token::authority = payer_wsol_vault
    )]
    pub payer_wsol_ata: InterfaceAccount<'info, TokenAccount>,

    // Official programs
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn swap(
    ctx: Context<LiquiditySwap>,
    amount_in: u64,
    amount_out: u64,
    input_currency: Currency,
    output_currency: Currency,
    swap_direction: SwapDirection,
) -> Result<()> {
    require_gte!(
        ctx.accounts.output_vault.amount,
        amount_out,
        CustomError::InsufficientLiquidity
    );

    wrap_sol_if_needed(
        AccountsForWrapSol {
            payer: ctx.accounts.payer.to_account_info(),
            input_token_account: ctx.accounts.input_token_account.clone(),
            token_program: ctx.accounts.token_program.clone(),
        },
        amount_in,
        input_currency,
    )?;

    let context = CpiContext::new(
        ctx.accounts.cp_swap_program.to_account_info(),
        cpi::accounts::Swap {
            payer: ctx.accounts.payer.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
            amm_config: ctx.accounts.amm_config.to_account_info(),
            pool_state: ctx.accounts.pool_state.to_account_info(),
            input_token_account: ctx.accounts.input_token_account.to_account_info(),
            output_token_account: ctx.accounts.output_token_account.to_account_info(),
            input_vault: ctx.accounts.input_vault.to_account_info(),
            output_vault: ctx.accounts.output_vault.to_account_info(),
            input_token_program: ctx.accounts.token_program.to_account_info(),
            output_token_program: ctx.accounts.token_program.to_account_info(),
            input_token_mint: ctx.accounts.input_token_mint.to_account_info(),
            output_token_mint: ctx.accounts.output_token_mint.to_account_info(),
            observation_state: ctx.accounts.observation_state.to_account_info(),
        },
    );

    if swap_direction == SwapDirection::Input {
        cpi::swap_base_input(context, amount_in, amount_out)?;
    } else {
        cpi::swap_base_output(context, amount_in, amount_out)?;
    }

    unwrap_sol_if_needed(
        AccountsForUnwrapSol {
            payer: ctx.accounts.payer.to_account_info(),
            input_token_account: ctx.accounts.input_token_account.clone(),
            output_token_account: ctx.accounts.output_token_account.clone(),
            wsol_mint: ctx.accounts.wsol_mint.clone(),
            payer_wsol_vault: ctx.accounts.payer_wsol_vault.clone(),
            payer_wsol_ata: ctx.accounts.payer_wsol_ata.clone(),
            token_program: ctx.accounts.token_program.clone(),
        },
        input_currency,
        output_currency,
        ctx.bumps.payer_wsol_vault,
    )
}

fn is_vault_allowed(vault: &str) -> bool {
    ["eda", "liquidity", "treasury"].contains(&vault)
}

pub fn vault_swap(
    ctx: Context<LiquidityVaultSwap>,
    amount_in: u64,
    amount_out: u64,
    vault: VaultAccount,
    input_currency: Currency,
    output_currency: Currency,
    swap_direction: SwapDirection,
) -> Result<()> {
    let vault_account = get_vault_account(vault);

    require!(
        is_vault_allowed(&vault.as_str()) && ctx.accounts.vault.key() == vault_account.0,
        CustomError::Unauthorized
    );

    require_gte!(
        ctx.accounts.output_vault.amount,
        amount_out,
        CustomError::InsufficientLiquidity
    );

    wrap_sol_if_needed_with_pda_key(
        vault.as_str(),
        vault_account.1,
        AccountsForWrapSol {
            payer: ctx.accounts.vault.to_account_info(),
            input_token_account: ctx.accounts.input_token_account.clone(),
            token_program: ctx.accounts.token_program.clone(),
        },
        amount_in,
        input_currency,
    )?;

    let signer_seeds: &[&[&[u8]]] = &[&[vault.as_str().as_bytes(), &[vault_account.1]]];

    let context = CpiContext::new_with_signer(
        ctx.accounts.cp_swap_program.to_account_info(),
        cpi::accounts::Swap {
            payer: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
            amm_config: ctx.accounts.amm_config.to_account_info(),
            pool_state: ctx.accounts.pool_state.to_account_info(),
            input_token_account: ctx.accounts.input_token_account.to_account_info(),
            output_token_account: ctx.accounts.output_token_account.to_account_info(),
            input_vault: ctx.accounts.input_vault.to_account_info(),
            output_vault: ctx.accounts.output_vault.to_account_info(),
            input_token_program: ctx.accounts.token_program.to_account_info(),
            output_token_program: ctx.accounts.token_program.to_account_info(),
            input_token_mint: ctx.accounts.input_token_mint.to_account_info(),
            output_token_mint: ctx.accounts.output_token_mint.to_account_info(),
            observation_state: ctx.accounts.observation_state.to_account_info(),
        },
        signer_seeds,
    );

    if swap_direction == SwapDirection::Input {
        cpi::swap_base_input(context, amount_in, amount_out)?;
    } else {
        cpi::swap_base_output(context, amount_in, amount_out)?;
    }

    unwrap_sol_if_needed_with_pda_key(
        vault.as_str(),
        vault_account.1,
        AccountsForUnwrapSol {
            payer: ctx.accounts.vault.to_account_info(),
            input_token_account: ctx.accounts.input_token_account.clone(),
            output_token_account: ctx.accounts.output_token_account.clone(),
            wsol_mint: ctx.accounts.wsol_mint.clone(),
            payer_wsol_vault: ctx.accounts.payer_wsol_vault.clone(),
            payer_wsol_ata: ctx.accounts.payer_wsol_ata.clone(),
            token_program: ctx.accounts.token_program.clone(),
        },
        input_currency,
        output_currency,
        ctx.bumps.payer_wsol_vault,
    )
}
