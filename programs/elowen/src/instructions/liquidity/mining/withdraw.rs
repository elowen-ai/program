use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    memo::spl_memo,
    token::Token,
    token_2022::Token2022,
    token_interface::{Mint, TokenAccount},
};
use raydium_cp_swap::{cpi, program::RaydiumCpSwap, states::PoolState};

use crate::{
    constants::*,
    enums::{Currency, CustomError, MiningAction},
    functions::*,
    state::{MinerStateAccount, MiningStateAccount, PlatformAccount},
};

#[derive(Accounts)]
#[instruction(currency: Currency)]
pub struct LiquidityMiningWithdraw<'info> {
    #[account(mut)]
    pub miner: Signer<'info>,

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
    pub cp_swap_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub pool_state: AccountLoader<'info, PoolState>,

    // Platform PDA
    #[account(
        seeds = [
            b"platform".as_ref(),
        ],
        bump,
    )]
    pub platform: Box<Account<'info, PlatformAccount>>,
    #[account(
        mut,
        associated_token::mint = elw_mint,
        associated_token::authority = platform
    )]
    pub platform_elw_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    // token mints
    #[account(address = platform.elw_mint)]
    pub elw_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(address = get_quote_mint(currency).unwrap())]
    pub quote_mint: Box<InterfaceAccount<'info, Mint>>,

    // token accounts
    #[account(
        init_if_needed,
        payer = miner,
        associated_token::mint = elw_mint,
        associated_token::authority = miner
    )]
    pub miner_elw_token_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = miner,
        associated_token::mint = quote_mint,
        associated_token::authority = miner
    )]
    pub miner_quote_token_ata: Box<InterfaceAccount<'info, TokenAccount>>,

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

    #[account(
        mut,
        address = pool_state.load()?.lp_mint
    )]
    pub lp_mint: Box<InterfaceAccount<'info, Mint>>,

    /// CHECK: This is miner vault
    #[account(
        mut,
        seeds = [
            b"miner".as_ref(),
            miner.key().as_ref(),
        ],
        bump,
    )]
    pub miner_lp_vault: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = miner,
        associated_token::mint = lp_mint,
        associated_token::authority = miner
    )]
    pub miner_lp_token_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = miner,
        associated_token::mint = lp_mint,
        associated_token::authority = miner_lp_vault
    )]
    pub miner_lp_vault_token_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = miner,
        space = get_account_size(MinerStateAccount::INIT_SPACE),
        seeds = [
            b"miner_state".as_ref(),
            miner.key().as_ref(),
            &[currency as u8],
        ],
        bump,
    )]
    pub miner_state: Box<Account<'info, MinerStateAccount>>,
    #[account(
        init_if_needed,
        payer = miner,
        space = get_account_size(MiningStateAccount::INIT_SPACE),
        seeds = [
            b"mining_state".as_ref(),
            &[currency as u8],
        ],
        bump,
    )]
    pub mining_state: Box<Account<'info, MiningStateAccount>>,

    // Official programs
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub token_program_2022: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// CHECK: spool_memo::ID
    #[account(
        address = spl_memo::id()
    )]
    pub memo_program: UncheckedAccount<'info>,
    // for manage to wsol
    #[account(address = WSOL_MINT)]
    pub wsol_mint: Box<InterfaceAccount<'info, Mint>>,
    /// CHECK: payer_wsol_vault is a vault account
    #[account(
        seeds = [
            b"payer_wsol".as_ref(),
            miner.key().as_ref(),
        ],
        bump,
    )]
    pub miner_wsol_vault: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = miner,
        associated_token::mint = wsol_mint,
        associated_token::authority = miner_wsol_vault
    )]
    pub miner_wsol_ata: Box<InterfaceAccount<'info, TokenAccount>>,
}

pub fn withdraw(
    ctx: Context<LiquidityMiningWithdraw>,
    currency: Currency,
    lp_token_amount: u64,
    minimum_elw_amount: u64,
    minimum_quote_amount: u64,
) -> Result<()> {
    require!(
        ctx.accounts.miner_lp_vault_token_ata.amount >= lp_token_amount,
        CustomError::InsufficientBalance
    );

    let miner_key = ctx.accounts.miner.key();
    let signer_seeds = &[
        b"miner".as_ref(),
        miner_key.as_ref(),
        &[ctx.bumps.miner_lp_vault],
    ];

    transfer_token_with_signer(
        signer_seeds,
        &ctx.accounts.token_program.to_account_info(),
        &ctx.accounts.miner_lp_vault_token_ata.to_account_info(),
        &ctx.accounts.miner_lp_token_ata.to_account_info(),
        &ctx.accounts.miner_lp_vault.to_account_info(),
        lp_token_amount,
    )?;

    let elw_amount = reload_token_account(&ctx.accounts.miner_elw_token_ata)?.amount;
    let quote_amount = reload_token_account(&ctx.accounts.miner_quote_token_ata)?.amount;

    cpi::withdraw(
        CpiContext::new(
            ctx.accounts.cp_swap_program.to_account_info(),
            cpi::accounts::Withdraw {
                owner: ctx.accounts.miner.to_account_info(),
                authority: ctx.accounts.cp_swap_authority.to_account_info(),
                pool_state: ctx.accounts.pool_state.to_account_info(),
                owner_lp_token: ctx.accounts.miner_lp_token_ata.to_account_info(),
                token_0_account: ctx.accounts.miner_elw_token_ata.to_account_info(),
                token_1_account: ctx.accounts.miner_quote_token_ata.to_account_info(),
                token_0_vault: ctx.accounts.elw_vault.to_account_info(),
                token_1_vault: ctx.accounts.quote_vault.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
                token_program_2022: ctx.accounts.token_program_2022.to_account_info(),
                vault_0_mint: ctx.accounts.elw_mint.to_account_info(),
                vault_1_mint: ctx.accounts.quote_mint.to_account_info(),
                lp_mint: ctx.accounts.lp_mint.to_account_info(),
                memo_program: ctx.accounts.memo_program.to_account_info(),
            },
        ),
        lp_token_amount,
        minimum_elw_amount,
        minimum_quote_amount,
    )?;

    let updated_miner_elw_ata = reload_token_account(&ctx.accounts.miner_elw_token_ata)?;
    let updated_miner_quote_ata = reload_token_account(&ctx.accounts.miner_quote_token_ata)?;
    let withdraw_elw_amount = updated_miner_elw_ata.amount - elw_amount;
    let withdraw_quote_amount = updated_miner_quote_ata.amount - quote_amount;

    unwrap_sol_if_needed(
        AccountsForUnwrapSol {
            payer: ctx.accounts.miner.to_account_info(),
            input_token_account: ctx.accounts.miner_elw_token_ata.as_ref().clone(),
            output_token_account: ctx.accounts.miner_quote_token_ata.as_ref().clone(),
            wsol_mint: ctx.accounts.wsol_mint.as_ref().clone(),
            token_program: ctx.accounts.token_program.clone(),
            payer_wsol_vault: ctx.accounts.miner_wsol_vault.clone(),
            payer_wsol_ata: ctx.accounts.miner_wsol_ata.as_ref().clone(),
        },
        Currency::ELW,
        currency,
        ctx.bumps.miner_wsol_vault,
    )?;

    let platform_elw_amount = ctx.accounts.platform_elw_ata.amount;
    let miner_state = &mut ctx.accounts.miner_state;
    let mining_state = &mut ctx.accounts.mining_state;

    mining_state.update_sync(
        miner_state,
        platform_elw_amount,
        withdraw_elw_amount,
        withdraw_quote_amount,
        MiningAction::Withdraw,
    );

    Ok(())
}
