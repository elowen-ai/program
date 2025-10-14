use anchor_lang::{prelude::*, solana_program::sysvar};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{spl_token::instruction::AuthorityType, Mint, Token, TokenAccount},
};
use mpl_token_metadata::{
    instructions::{CreateV1CpiBuilder, VerifyCreatorV1Cpi, VerifyCreatorV1CpiAccounts},
    types::{Creator, TokenStandard},
    ID as METADATA_ID,
};

use crate::{constants::*, enums::CustomError, functions::*, state::*};

#[derive(Accounts)]
pub struct InitializeElw<'info> {
    #[account(
        mut,
        constraint = signer.key() == SIGNER @ CustomError::Unauthorized,
    )]
    pub signer: Signer<'info>,
    #[account(
        init,
        payer = signer,
        mint::decimals = 9,
        mint::authority = platform
    )]
    pub elw_mint: Box<Account<'info, Mint>>,
    /// CHECK: This is metadata account
    #[account(
        mut,
        seeds = [
            b"metadata".as_ref(),
            METADATA_ID.as_ref(),
            elw_mint.key().as_ref(),
        ],
        bump,
        seeds::program = METADATA_ID,
    )]
    pub token_metadata: AccountInfo<'info>,

    // Platform PDA
    #[account(
        init,
        payer = signer,
        space = get_account_size(PlatformAccount::INIT_SPACE),
        seeds = [
            b"platform".as_ref(),
        ],
        bump,
    )]
    pub platform: Box<Account<'info, PlatformAccount>>,
    #[account(
        init,
        payer = signer,
        associated_token::mint = elw_mint,
        associated_token::authority = platform
    )]
    pub platform_token_ata: Box<Account<'info, TokenAccount>>,

    /// CHECK: EDA vault
    #[account(
        seeds = [
            b"eda".as_ref(),
        ],
        bump,
    )]
    pub eda_vault: UncheckedAccount<'info>,
    #[account(
        init,
        payer = signer,
        associated_token::mint = elw_mint,
        associated_token::authority = eda_vault
    )]
    pub eda_token_ata: Box<Account<'info, TokenAccount>>,
    /// CHECK: Team vault
    #[account(
        seeds = [
            b"team".as_ref(),
        ],
        bump,
    )]
    pub team_vault: UncheckedAccount<'info>,
    #[account(
        init,
        payer = signer,
        associated_token::mint = elw_mint,
        associated_token::authority = team_vault
    )]
    pub team_token_ata: Box<Account<'info, TokenAccount>>,
    /// CHECK: Reward vault
    #[account(
        seeds = [
            b"reward".as_ref(),
        ],
        bump,
    )]
    pub reward_vault: UncheckedAccount<'info>,
    #[account(
        init,
        payer = signer,
        associated_token::mint = elw_mint,
        associated_token::authority = reward_vault
    )]
    pub reward_token_ata: Box<Account<'info, TokenAccount>>,
    /// CHECK: Presale vault
    #[account(
        seeds = [
            b"presale".as_ref(),
        ],
        bump,
    )]
    pub presale_vault: UncheckedAccount<'info>,
    #[account(
        init,
        payer = signer,
        associated_token::mint = elw_mint,
        associated_token::authority = presale_vault
    )]
    pub presale_token_ata: Box<Account<'info, TokenAccount>>,
    /// CHECK: Liquidity vault
    #[account(
        seeds = [
            b"liquidity".as_ref(),
        ],
        bump,
    )]
    pub liquidity_vault: UncheckedAccount<'info>,
    #[account(
        init,
        payer = signer,
        associated_token::mint = elw_mint,
        associated_token::authority = liquidity_vault
    )]
    pub liquidity_token_ata: Box<Account<'info, TokenAccount>>,
    /// CHECK: Treasury vault
    #[account(
        seeds = [
            b"treasury".as_ref(),
        ],
        bump,
    )]
    pub treasury_vault: UncheckedAccount<'info>,
    #[account(
        init,
        payer = signer,
        associated_token::mint = elw_mint,
        associated_token::authority = treasury_vault
    )]
    pub treasury_token_ata: Box<Account<'info, TokenAccount>>,

    // Official programs
    /// CHECK: This is metadata program
    #[account(
        address = METADATA_ID,
    )]
    pub metadata_program: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    /// CHECK: This sysvar account
    #[account(
        address = sysvar::instructions::ID,
    )]
    pub sysvar_instructions: AccountInfo<'info>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn initialize(ctx: Context<InitializeElw>, metadata_uri: &str) -> Result<()> {
    let signer = &ctx.accounts.signer;
    let elw_mint = &ctx.accounts.elw_mint;
    let token_metadata = &ctx.accounts.token_metadata;
    let metadata_program = &ctx.accounts.metadata_program;
    let token_program = &ctx.accounts.token_program;
    let system_program = &ctx.accounts.system_program;
    let platform = &mut ctx.accounts.platform;
    let sysvar_instructions = &ctx.accounts.sysvar_instructions;

    let bump = ctx.bumps.platform;
    let seeds: &[&[u8]] = &[b"platform".as_ref(), &[bump]];
    let signers_seeds = &[&seeds[..]];

    CreateV1CpiBuilder::new(metadata_program)
        .metadata(&token_metadata.to_account_info())
        .mint(&elw_mint.to_account_info(), true)
        .authority(&platform.to_account_info())
        .payer(&signer.to_account_info())
        .update_authority(&platform.to_account_info(), true)
        .system_program(&system_program.to_account_info())
        .sysvar_instructions(&sysvar_instructions.to_account_info())
        .spl_token_program(Some(&token_program.to_account_info()))
        .token_standard(TokenStandard::Fungible)
        .name(NAME.to_string())
        .symbol(SYMBOL.to_string())
        .uri(metadata_uri.to_string())
        .creators(vec![Creator {
            address: platform.key(),
            verified: false,
            share: 100,
        }])
        .seller_fee_basis_points(0)
        .invoke_signed(signers_seeds)?;

    VerifyCreatorV1Cpi::new(
        metadata_program,
        VerifyCreatorV1CpiAccounts {
            delegate_record: None,
            collection_mint: None,
            collection_metadata: None,
            collection_master_edition: None,
            authority: &platform.to_account_info(),
            metadata: &token_metadata.to_account_info(),
            system_program: &system_program.to_account_info(),
            sysvar_instructions: &sysvar_instructions.to_account_info(),
        },
    )
    .invoke_signed(signers_seeds)?;

    let mints = [
        (
            &ctx.accounts.team_token_ata.to_account_info(),
            calculate_by_percentage(SUPPLY, TEAM_PERCENTAGE),
        ),
        (
            &ctx.accounts.reward_token_ata.to_account_info(),
            calculate_by_percentage(SUPPLY, REWARD_PERCENTAGE),
        ),
        (
            &ctx.accounts.presale_token_ata.to_account_info(),
            calculate_by_percentage(SUPPLY, PRESALE_PERCENTAGE),
        ),
        (
            &ctx.accounts.liquidity_token_ata.to_account_info(),
            calculate_by_percentage(SUPPLY, LIQUIDITY_PERCENTAGE),
        ),
        (
            &ctx.accounts.eda_token_ata.to_account_info(),
            calculate_by_percentage(SUPPLY, EDA_PERCENTAGE),
        ),
    ];

    let mint_account = &elw_mint.to_account_info();
    let authority_account = &platform.to_account_info();
    for (receiver_account, amount) in mints.into_iter() {
        mint_token_with_signer(
            seeds,
            token_program,
            mint_account,
            receiver_account,
            authority_account,
            amount,
        )?;
    }

    // make immutable supply
    set_authority_with_signer(
        seeds,
        &token_program.to_account_info(),
        &elw_mint.to_account_info(),
        &platform.to_account_info(),
        AuthorityType::MintTokens,
        None,
    )?;

    platform.elw_mint = elw_mint.key();

    Ok(())
}
