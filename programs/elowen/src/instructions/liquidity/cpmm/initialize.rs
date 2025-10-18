use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::Token,
    token_interface::{Mint, TokenAccount},
};
use mpl_token_metadata::ID as METADATA_ID;
use raydium_cp_swap::{
    cpi as cp_swap_cpi,
    program::RaydiumCpSwap,
    states::{
        AmmConfig, ObservationState, PoolState, OBSERVATION_SEED, POOL_LP_MINT_SEED, POOL_SEED,
        POOL_VAULT_SEED,
    },
};
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
pub struct LiquidityInitialize<'info> {
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

    // create pool fee account
    #[account(
        mut,
        address = raydium_cp_swap::create_pool_fee_reveiver::ID,
    )]
    pub create_pool_fee: Box<InterfaceAccount<'info, TokenAccount>>,

    // Which config the pool belongs to.
    pub amm_config: Box<Account<'info, AmmConfig>>,

    /// CHECK: pool vault and lp mint authority
    #[account(
        seeds = [
            raydium_cp_swap::AUTH_SEED.as_bytes(),
        ],
        seeds::program = cp_swap_program,
        bump,
    )]
    pub cp_swap_authority: UncheckedAccount<'info>,

    /// CHECK: Initialize an account to store the pool state, init by cp-swap
    #[account(
        mut,
        seeds = [
            POOL_SEED.as_bytes(),
            amm_config.key().as_ref(),
            elw_mint.key().as_ref(),
            quote_mint.key().as_ref(),
        ],
        seeds::program = cp_swap_program,
        bump,
    )]
    pub pool_state: UncheckedAccount<'info>,

    /// CHECK: an account to store oracle observations, init by cp-swap
    #[account(
        mut,
        seeds = [
            OBSERVATION_SEED.as_bytes(),
            pool_state.key().as_ref(),
        ],
        seeds::program = cp_swap_program,
        bump,
    )]
    pub observation_state: UncheckedAccount<'info>,

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

    /// CHECK: ELW vault for the pool, init by cp-swap
    #[account(
        mut,
        seeds = [
            POOL_VAULT_SEED.as_bytes(),
            pool_state.key().as_ref(),
            elw_mint.key().as_ref()
        ],
        seeds::program = cp_swap_program,
        bump,
    )]
    pub elw_vault: UncheckedAccount<'info>,

    /// CHECK: Base vault for the pool, init by cp-swap
    #[account(
        mut,
        seeds = [
            POOL_VAULT_SEED.as_bytes(),
            pool_state.key().as_ref(),
            quote_mint.key().as_ref()
        ],
        seeds::program = cp_swap_program,
        bump,
    )]
    pub quote_vault: UncheckedAccount<'info>,

    /// CHECK: pool lp mint, init by cp-swap
    #[account(
        mut,
        seeds = [
            POOL_LP_MINT_SEED.as_bytes(),
            pool_state.key().as_ref(),
        ],
        seeds::program = cp_swap_program,
        bump,
    )]
    pub lp_mint: UncheckedAccount<'info>,

    /// CHECK: creator lp ATA token account, init by cp-swap
    #[account(mut)]
    pub liquidity_lp_token_ata: UncheckedAccount<'info>,

    #[account(
        init,
        payer = signer,
        space = get_account_size(LpStateAccount::INIT_SPACE),
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
    /// CHECK: locked lp token account, init before locking program cpi call
    #[account(mut)]
    pub locked_lp_token_ata: UncheckedAccount<'info>,
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

pub fn initialize(
    ctx: Context<LiquidityInitialize>,
    currency: Currency,
    elw_amount: u64,
    quote_amount: u64,
    open_time: u64,
) -> Result<()> {
    // Combine validations
    require!(
        ctx.accounts.liquidity_elw_token_ata.amount >= elw_amount
            && ctx.accounts.liquidity_quote_token_ata.amount >= quote_amount,
        CustomError::InsufficientLiquidity
    );

    // Calculate needed lamports in one step
    let needed_lamports = 7_960_720 // needed
        + ctx.accounts.amm_config.create_pool_fee
        + Rent::get()?.minimum_balance(82) * 2 // mint accounts
        + Rent::get()?.minimum_balance(165) * 5 // token accounts
        + Rent::get()?.minimum_balance(PoolState::LEN) // pool state
        + Rent::get()?.minimum_balance(MAX_METADATA_LEN) // metadata account
        + Rent::get()?.minimum_balance(ObservationState::LEN) // observation state
        + Rent::get()?.minimum_balance(LockedCpLiquidityState::LEN); // locked liquidity state

    transfer_sol(
        &ctx.accounts.signer,
        &ctx.accounts.liquidity_vault,
        needed_lamports,
    )?;

    let signer_seeds: &[&[&[u8]]] = &[&[b"liquidity".as_ref(), &[ctx.bumps.liquidity_vault]]];

    cp_swap_cpi::initialize(
        CpiContext::new_with_signer(
            ctx.accounts.cp_swap_program.to_account_info(),
            cp_swap_cpi::accounts::Initialize {
                creator: ctx.accounts.liquidity_vault.to_account_info(),
                amm_config: ctx.accounts.amm_config.to_account_info(),
                authority: ctx.accounts.cp_swap_authority.to_account_info(),
                pool_state: ctx.accounts.pool_state.to_account_info(),
                token_0_mint: ctx.accounts.elw_mint.to_account_info(),
                token_1_mint: ctx.accounts.quote_mint.to_account_info(),
                lp_mint: ctx.accounts.lp_mint.to_account_info(),
                creator_token_0: ctx.accounts.liquidity_elw_token_ata.to_account_info(),
                creator_token_1: ctx.accounts.liquidity_quote_token_ata.to_account_info(),
                creator_lp_token: ctx.accounts.liquidity_lp_token_ata.to_account_info(),
                token_0_vault: ctx.accounts.elw_vault.to_account_info(),
                token_1_vault: ctx.accounts.quote_vault.to_account_info(),
                create_pool_fee: ctx.accounts.create_pool_fee.to_account_info(),
                observation_state: ctx.accounts.observation_state.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
                token_0_program: ctx.accounts.token_program.to_account_info(),
                token_1_program: ctx.accounts.token_program.to_account_info(),
                associated_token_program: ctx.accounts.associated_token_program.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
            signer_seeds,
        ),
        elw_amount,
        quote_amount,
        open_time,
    )?;

    let creator_lp_token = reload_unchecked_token_account(&ctx.accounts.liquidity_lp_token_ata)?;

    create_token_account(
        &ctx.accounts.signer,
        &ctx.accounts.token_program,
        &ctx.accounts.system_program,
        &ctx.accounts.lp_mint,
        &ctx.accounts.locked_lp_token_ata,
        &ctx.accounts.locking_authority,
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
        creator_lp_token.amount,
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

    // lp state
    ctx.accounts.lp_state.elw_amount = elw_amount;
    ctx.accounts.lp_state.quote_amount = quote_amount;
    ctx.accounts.lp_state.quote_currency = currency as u8;
    ctx.accounts.lp_state.lp_amount = creator_lp_token.amount;
    ctx.accounts.lp_state.pool_state = ctx.accounts.pool_state.key();
    // locked lp state
    ctx.accounts.locked_lp_state.quote_currency = currency as u8;
    ctx.accounts.locked_lp_state.locked_lp_amount = creator_lp_token.amount;

    Ok(())
}
