use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::{constants::*, enums::*, functions::*, state::*};

#[derive(Accounts)]
pub struct ClaimTeamELW<'info> {
    #[account(mut)]
    pub member: Signer<'info>,

    // Token mint
    pub elw_mint: Account<'info, Mint>,

    /// CHECK: Team vault
    #[account(
        seeds = [
            b"team".as_ref(),
        ],
        bump,
    )]
    pub team_vault: UncheckedAccount<'info>,
    #[account(
        mut,
        address = get_vault_account_token_ata(elw_mint.key(), VaultAccount::Team),
    )]
    pub team_token_ata: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = member,
        space = get_account_size(MemberClaimAccount::INIT_SPACE),
        seeds = [
            b"member".as_ref(),
            member.key().as_ref(),
        ],
        bump,
    )]
    pub member_claim: Account<'info, MemberClaimAccount>,

    #[account(
        init_if_needed,
        payer = member,
        associated_token::mint = elw_mint,
        associated_token::authority = member
    )]
    pub member_token_ata: Account<'info, TokenAccount>,

    // Official programs
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn claim(ctx: Context<ClaimTeamELW>) -> Result<()> {
    let member = &ctx.accounts.member;

    require!(is_team_member(&member.key()), CustomError::Unauthorized);

    let team_token_ata = &ctx.accounts.team_token_ata;
    let member_claim = &mut ctx.accounts.member_claim;

    let unlock_periods = [
        get_months_later(PRESALE_RULES.end_time, 3),
        get_months_later(PRESALE_RULES.end_time, 6),
        get_months_later(PRESALE_RULES.end_time, 9),
        get_months_later(PRESALE_RULES.end_time, 12),
    ];

    let percentage = get_member_percentage(&member.key());

    require!(percentage.is_some(), CustomError::MemberShareNotFound);

    let total = calculate_by_percentage(SUPPLY, TEAM_PERCENTAGE);
    let member_total = calculate_by_percentage(total, percentage.unwrap());
    let total_amount_for_period = member_total / unlock_periods.len() as u64;

    let current_time = Clock::get()?.unix_timestamp;

    let current_period = unlock_periods
        .iter()
        .rev()
        .find(|period| current_time >= **period);

    require!(current_period.is_some(), CustomError::PeriodNotReached);

    require!(
        member_claim.last_period != *current_period.unwrap(),
        CustomError::AlreadyClaimedForThisPeriod
    );

    let period_count = unlock_periods
        .iter()
        .filter(|&&period| period > member_claim.last_period && period <= *current_period.unwrap())
        .count();

    let transfer_amount = total_amount_for_period * period_count as u64;

    require!(
        team_token_ata.amount >= transfer_amount,
        CustomError::NotEnoughBalanceInVault
    );

    let sender_account = &team_token_ata.to_account_info();
    let token_program = &ctx.accounts.token_program.to_account_info();
    let authority_account = &ctx.accounts.team_vault.to_account_info();
    let receiver_account = &ctx.accounts.member_token_ata.to_account_info();

    transfer_token_with_pda_key(
        "team",
        ctx.bumps.team_vault,
        token_program,
        sender_account,
        receiver_account,
        authority_account,
        transfer_amount,
    )?;

    member_claim.amount += transfer_amount;
    member_claim.last_period = *current_period.unwrap();

    if ctx.accounts.team_token_ata.amount == 0 {
        close_token_account_with_pda_key(
            "team",
            ctx.bumps.team_vault,
            token_program,
            sender_account,
            &member.to_account_info(),
            authority_account,
        )?;
    }

    Ok(())
}
