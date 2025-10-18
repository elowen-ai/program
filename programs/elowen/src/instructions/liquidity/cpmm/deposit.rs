use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::Token,
    token_2022::Token2022,
    token_interface::{Mint, TokenAccount},
};
use mpl_token_metadata::ID as METADATA_ID;
use raydium_cp_swap::{cpi as cp_swap_cpi, program::RaydiumCpSwap, states::PoolState};
use raydium_locking_cpi::{
    cpi as locking_cpi,
    program::RaydiumLiquidityLocking,
    states::{LockedCpLiquidityState, LOCKED_LIQUIDITY_SEED},
};

use crate::{
    constants::*,
    enums::{Currency, CustomError},
    functions::*,
    state::{LockedLpStateAccount, LpStateAccount, PlatformAccount},
};

#[derive(Accounts)]
#[instruction(currency: Currency)]
pub struct LiquidityDeposit<'info> {
    #[account(
        mut,
        constraint = signer.key() == SIGNER @ CustomError::Unauthorized,
    )]
    pub signer: Signer<'info>,

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
    /// CHECK: Liquidity vault
    #[account(
        mut,
        seeds = [
            b"liquidity".as_ref(),
        ],
        bump,
    )]
    pub liquidity_vault: UncheckedAccount<'info>,

    // token mints
    #[account(address = platform.elw_mint)]
    pub elw_mint: InterfaceAccount<'info, Mint>,
    #[account(address = get_quote_mint(currency).unwrap())]
    pub quote_mint: InterfaceAccount<'info, Mint>,

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

    #[account(
        mut,
        address = pool_state.load()?.lp_mint
    )]
    pub lp_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = lp_mint,
        associated_token::authority = liquidity_vault
    )]
    pub liquidity_lp_token_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [
            b"lp_state".as_ref(),
            quote_mint.key().as_ref(),
        ],
        bump,
    )]
    pub lp_state: Box<Account<'info, LpStateAccount>>,

    // Official programs
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub token_program_2022: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    // locking program
    /// CHECK: Create a unique fee nft mint, init by locking program
    #[account(mut)]
    pub fee_nft_mint: Signer<'info>,
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
    /// CHECK: Store the locked information of liquidity, init by locking program
    #[account(
        mut,
        seeds = [
            LOCKED_LIQUIDITY_SEED.as_bytes(),
            fee_nft_mint.key().as_ref(),
        ],
        bump,
        seeds::program = locking_program.key(),
    )]
    pub locked_liquidity: UncheckedAccount<'info>,
    #[account(
        mut,
        associated_token::mint = lp_mint,
        associated_token::authority = locking_authority
    )]
    pub locked_lp_token_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK: Token account where fee nft will be minted to, init by locking program
    #[account(mut)]
    pub fee_nft_account: UncheckedAccount<'info>,
    #[account(
        init,
        payer = signer,
        space = get_account_size(LockedLpStateAccount::INIT_SPACE),
        seeds = [
            b"locked_lp_state".as_ref(),
            fee_nft_mint.key().as_ref(),
        ],
        bump,
    )]
    pub locked_lp_state: Box<Account<'info, LockedLpStateAccount>>,
    /// CHECK: This is metadata account
    #[account(
        mut,
        seeds = [
            b"metadata".as_ref(),
            METADATA_ID.as_ref(),
            fee_nft_mint.key().as_ref(),
        ],
        bump,
        seeds::program = METADATA_ID,
    )]
    pub metadata_account: AccountInfo<'info>,
    /// CHECK: This is metadata program
    #[account(
        address = METADATA_ID,
    )]
    pub metadata_program: AccountInfo<'info>,
}

pub fn deposit(
    ctx: Context<LiquidityDeposit>,
    currency: Currency,
    lp_token_amount: u64,
    maximum_elw_amount: u64,
    maximum_quote_amount: u64,
) -> Result<()> {
    require!(
        ctx.accounts.liquidity_elw_token_ata.amount >= maximum_elw_amount
            && ctx.accounts.liquidity_quote_token_ata.amount >= maximum_quote_amount,
        CustomError::InsufficientLiquidity
    );

    let elw_amount = ctx.accounts.liquidity_elw_token_ata.amount;
    let quote_amount = ctx.accounts.liquidity_quote_token_ata.amount;

    // Calculate needed lamports in one step
    let needed_lamports = 7_960_720 // needed
        + Rent::get()?.minimum_balance(82) // mint accounts
        + Rent::get()?.minimum_balance(165) * 2 // token accounts
        + Rent::get()?.minimum_balance(MAX_METADATA_LEN) // metadata account
        + Rent::get()?.minimum_balance(LockedCpLiquidityState::LEN); // locked liquidity state

    transfer_sol(
        &ctx.accounts.signer,
        &ctx.accounts.liquidity_vault,
        needed_lamports,
    )?;

    let signer_seeds: &[&[&[u8]]] = &[&[b"liquidity".as_ref(), &[ctx.bumps.liquidity_vault]]];

    cp_swap_cpi::deposit(
        CpiContext::new_with_signer(
            ctx.accounts.cp_swap_program.to_account_info(),
            cp_swap_cpi::accounts::Deposit {
                owner: ctx.accounts.liquidity_vault.to_account_info(),
                authority: ctx.accounts.cp_swap_authority.to_account_info(),
                pool_state: ctx.accounts.pool_state.to_account_info(),
                owner_lp_token: ctx.accounts.liquidity_lp_token_ata.to_account_info(),
                token_0_account: ctx.accounts.liquidity_elw_token_ata.to_account_info(),
                token_1_account: ctx.accounts.liquidity_quote_token_ata.to_account_info(),
                token_0_vault: ctx.accounts.elw_vault.to_account_info(),
                token_1_vault: ctx.accounts.quote_vault.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
                token_program_2022: ctx.accounts.token_program_2022.to_account_info(),
                vault_0_mint: ctx.accounts.elw_mint.to_account_info(),
                vault_1_mint: ctx.accounts.quote_mint.to_account_info(),
                lp_mint: ctx.accounts.lp_mint.to_account_info(),
            },
            signer_seeds,
        ),
        lp_token_amount,
        maximum_elw_amount,
        maximum_quote_amount,
    )?;

    locking_cpi::lock_cp_liquidity(
        CpiContext::new_with_signer(
            ctx.accounts.locking_program.to_account_info(),
            locking_cpi::accounts::LockCpLiquidity {
                authority: ctx.accounts.locking_authority.to_account_info(),
                payer: ctx.accounts.liquidity_vault.to_account_info(),
                liquidity_owner: ctx.accounts.liquidity_vault.to_account_info(),
                fee_nft_owner: ctx.accounts.liquidity_vault.to_account_info(),
                fee_nft_mint: ctx.accounts.fee_nft_mint.to_account_info(),
                fee_nft_account: ctx.accounts.fee_nft_account.to_account_info(),
                pool_state: ctx.accounts.pool_state.to_account_info(),
                locked_liquidity: ctx.accounts.locked_liquidity.to_account_info(),
                lp_mint: ctx.accounts.lp_mint.to_account_info(),
                liquidity_owner_lp: ctx.accounts.liquidity_lp_token_ata.to_account_info(),
                locked_lp_vault: ctx.accounts.locked_lp_token_ata.to_account_info(),
                token_0_vault: ctx.accounts.elw_vault.to_account_info(),
                token_1_vault: ctx.accounts.quote_vault.to_account_info(),
                metadata_account: ctx.accounts.metadata_account.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
                associated_token_program: ctx.accounts.associated_token_program.to_account_info(),
                metadata_program: ctx.accounts.metadata_program.to_account_info(),
            },
            signer_seeds,
        ),
        lp_token_amount,
        true,
    )?;

    // just for case
    if ctx.accounts.liquidity_vault.lamports() > 0 {
        transfer_sol_with_pda_key(
            "liquidity",
            ctx.bumps.liquidity_vault,
            &ctx.accounts.liquidity_vault,
            &ctx.accounts.signer,
            ctx.accounts.liquidity_vault.lamports(),
        )?;
    }

    let updated_elw_token_amount =
        reload_token_account(&ctx.accounts.liquidity_elw_token_ata)?.amount;
    let updated_quote_token_amount =
        reload_token_account(&ctx.accounts.liquidity_quote_token_ata)?.amount;

    // update lp state
    ctx.accounts.lp_state.lp_amount += lp_token_amount;
    ctx.accounts.lp_state.elw_amount += elw_amount - updated_elw_token_amount;
    ctx.accounts.lp_state.quote_amount += quote_amount - updated_quote_token_amount;
    // create locked lp state
    ctx.accounts.locked_lp_state.quote_currency = currency as u8;
    ctx.accounts.locked_lp_state.locked_lp_amount = lp_token_amount;

    Ok(())
}
