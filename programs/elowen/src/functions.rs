use anchor_lang::prelude::*;
use anchor_lang::solana_program::*;
use anchor_spl::{
    associated_token::{self, get_associated_token_address},
    token::{self, spl_token::instruction::AuthorityType, Token},
    token_interface::{Mint, TokenAccount},
};
use chrono::{Datelike, Months, TimeZone, Utc};

use crate::constants::*;
use crate::enums::VaultAccount;
use crate::enums::{Currency, CustomError};

pub fn get_account_size(size: usize) -> usize {
    size + 14
}

pub fn get_vault_account(vault: VaultAccount) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[vault.as_str().as_bytes().as_ref()], &crate::ID)
}

pub fn get_vault_account_token_ata(elw_mint: Pubkey, vault: VaultAccount) -> Pubkey {
    get_associated_token_address(&get_vault_account(vault).0, &elw_mint)
}

pub fn mint_token_with_signer<'info>(
    signer_seeds: &[&[u8]],
    token_program: &AccountInfo<'info>,
    mint_account: &AccountInfo<'info>,
    receiver_account: &AccountInfo<'info>,
    authority_account: &AccountInfo<'info>,
    mint_amount: u64,
) -> Result<()> {
    return token::mint_to(
        CpiContext::new_with_signer(
            token_program.clone(),
            token::MintTo {
                mint: mint_account.clone(),
                to: receiver_account.clone(),
                authority: authority_account.clone(),
            },
            &[signer_seeds],
        ),
        mint_amount,
    );
}

pub fn transfer_token<'info>(
    token_program: &AccountInfo<'info>,
    sender_account: &AccountInfo<'info>,
    receiver_account: &AccountInfo<'info>,
    authority_account: &AccountInfo<'info>,
    transfer_amount: u64,
) -> Result<()> {
    return token::transfer(
        CpiContext::new(
            token_program.clone(),
            token::Transfer {
                from: sender_account.clone(),
                to: receiver_account.clone(),
                authority: authority_account.clone(),
            },
        ),
        transfer_amount,
    );
}

pub fn burn_token<'info>(
    token_program: &AccountInfo<'info>,
    mint_account: &AccountInfo<'info>,
    from_account: &AccountInfo<'info>,
    authority_account: &AccountInfo<'info>,
    burn_amount: u64,
) -> Result<()> {
    return token::burn(
        CpiContext::new(
            token_program.clone(),
            token::Burn {
                mint: mint_account.clone(),
                from: from_account.clone(),
                authority: authority_account.clone(),
            },
        ),
        burn_amount,
    );
}

pub fn close_token_account<'info>(
    token_program: &AccountInfo<'info>,
    account_to_close: &AccountInfo<'info>,
    destination_account: &AccountInfo<'info>,
    authority_account: &AccountInfo<'info>,
) -> Result<()> {
    return token::close_account(CpiContext::new(
        token_program.clone(),
        token::CloseAccount {
            account: account_to_close.clone(),
            destination: destination_account.clone(),
            authority: authority_account.clone(),
        },
    ));
}

pub fn create_token_account<'info>(
    payer: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    mint_account: &AccountInfo<'info>,
    receiver_account: &AccountInfo<'info>,
    authority_account: &AccountInfo<'info>,
) -> Result<()> {
    return associated_token::create(CpiContext::new(
        token_program.clone(),
        associated_token::Create {
            payer: payer.clone(),
            mint: mint_account.clone(),
            authority: authority_account.clone(),
            system_program: system_program.clone(),
            token_program: token_program.clone(),
            associated_token: receiver_account.clone(),
        },
    ));
}

pub fn close_token_account_with_pda_key<'info>(
    key: &str,
    bump: u8,
    token_program: &AccountInfo<'info>,
    account_to_close: &AccountInfo<'info>,
    destination_account: &AccountInfo<'info>,
    authority_account: &AccountInfo<'info>,
) -> Result<()> {
    return token::close_account(CpiContext::new_with_signer(
        token_program.clone(),
        token::CloseAccount {
            account: account_to_close.clone(),
            destination: destination_account.clone(),
            authority: authority_account.clone(),
        },
        &[&[key.as_ref(), &[bump]]],
    ));
}

pub fn transfer_sol<'info>(
    sender_account: &AccountInfo<'info>,
    receiver_account: &AccountInfo<'info>,
    transfer_amount: u64,
) -> Result<()> {
    program::invoke(
        &system_instruction::transfer(sender_account.key, receiver_account.key, transfer_amount),
        &[sender_account.clone(), receiver_account.clone()],
    )?;

    Ok(())
}

pub fn transfer_sol_with_pda_key<'info>(
    key: &str,
    bump: u8,
    sender_account: &AccountInfo<'info>,
    receiver_account: &AccountInfo<'info>,
    transfer_amount: u64,
) -> Result<()> {
    program::invoke_signed(
        &system_instruction::transfer(sender_account.key, receiver_account.key, transfer_amount),
        &[sender_account.clone(), receiver_account.clone()],
        &[&[key.as_ref(), &[bump]]],
    )?;

    Ok(())
}

pub fn wrap_sol<'info>(
    token_program: &AccountInfo<'info>,
    wsol_ata: &AccountInfo<'info>,
) -> Result<()> {
    anchor_spl::token::sync_native(CpiContext::new(
        token_program.to_account_info(),
        anchor_spl::token::SyncNative {
            account: wsol_ata.to_account_info(),
        },
    ))?;
    Ok(())
}

pub fn transfer_token_with_pda_key<'info>(
    key: &str,
    bump: u8,
    token_program: &AccountInfo<'info>,
    sender_account: &AccountInfo<'info>,
    receiver_account: &AccountInfo<'info>,
    authority_account: &AccountInfo<'info>,
    transfer_amount: u64,
) -> Result<()> {
    return token::transfer(
        CpiContext::new_with_signer(
            token_program.clone(),
            token::Transfer {
                from: sender_account.clone(),
                to: receiver_account.clone(),
                authority: authority_account.clone(),
            },
            &[&[key.as_ref(), &[bump]]],
        ),
        transfer_amount,
    );
}

pub fn transfer_token_with_signer<'info>(
    signer_seeds: &[&[u8]],
    token_program: &AccountInfo<'info>,
    sender_account: &AccountInfo<'info>,
    receiver_account: &AccountInfo<'info>,
    authority_account: &AccountInfo<'info>,
    transfer_amount: u64,
) -> Result<()> {
    return token::transfer(
        CpiContext::new_with_signer(
            token_program.clone(),
            token::Transfer {
                from: sender_account.clone(),
                to: receiver_account.clone(),
                authority: authority_account.clone(),
            },
            &[signer_seeds],
        ),
        transfer_amount,
    );
}

pub fn set_authority_with_signer<'info>(
    signer_seeds: &[&[u8]],
    token_program: &AccountInfo<'info>,
    mint_account: &AccountInfo<'info>,
    authority_account: &AccountInfo<'info>,
    authority_type: AuthorityType,
    new_authority: Option<Pubkey>,
) -> Result<()> {
    token::set_authority(
        CpiContext::new_with_signer(
            token_program.clone(),
            token::SetAuthority {
                current_authority: authority_account.clone(),
                account_or_mint: mint_account.clone(),
            },
            &[signer_seeds],
        ),
        authority_type,
        new_authority,
    )
}

pub fn burn_token_with_pda_key<'info>(
    key: &str,
    bump: u8,
    token_program: &AccountInfo<'info>,
    mint_account: &AccountInfo<'info>,
    from_account: &AccountInfo<'info>,
    authority_account: &AccountInfo<'info>,
    burn_amount: u64,
) -> Result<()> {
    return token::burn(
        CpiContext::new_with_signer(
            token_program.clone(),
            token::Burn {
                mint: mint_account.clone(),
                from: from_account.clone(),
                authority: authority_account.clone(),
            },
            &[&[key.as_ref(), &[bump]]],
        ),
        burn_amount,
    );
}

pub fn reload_unchecked_token_account<'info>(
    account: &UncheckedAccount<'info>,
) -> Result<TokenAccount> {
    TokenAccount::try_deserialize(&mut &account.data.borrow()[..])
}

pub fn reload_token_account_by_info<'info>(account: &AccountInfo<'info>) -> Result<TokenAccount> {
    TokenAccount::try_deserialize(&mut &account.data.borrow()[..])
}

pub fn reload_token_account<'info>(
    account: &InterfaceAccount<'info, TokenAccount>,
) -> Result<TokenAccount> {
    reload_token_account_by_info(&account.to_account_info())
}

pub fn get_months_later(timestamp: i64, month: u32) -> i64 {
    let datetime = Utc.timestamp_opt(timestamp, 0).unwrap();
    let new_datetime = datetime.checked_add_months(Months::new(month)).unwrap();
    new_datetime.timestamp()
}

pub fn get_months_difference(from: i64, to: i64) -> i32 {
    let from_date = Utc.timestamp_opt(from, 0).unwrap();
    let to_date = Utc.timestamp_opt(to, 0).unwrap();
    (to_date.year() - from_date.year()) * 12 + (to_date.month() as i32 - from_date.month() as i32)
}

pub fn calculate_reward_distribution(timestamp: i64) -> u64 {
    let months = get_months_difference(PRESALE_RULES.end_time, timestamp);
    let halving = (months / 4) as u32;
    BASE_REWARD >> halving
}

pub fn calculate_by_percentage(total: u64, percentage: u16) -> u64 {
    (total as f64 * percentage as f64 / 10000.0) as u64
}

pub fn usdc_to_sol(amount: u64, price: i64, exponent: i32) -> u64 {
    const SOL_DECIMALS: i32 = 9;
    const USDC_DECIMALS: i32 = 6;

    let usdc = amount as u128;
    let sol = price as i128;

    let exponent_adjust = (SOL_DECIMALS - USDC_DECIMALS) - exponent;
    let sol_u128 = if exponent_adjust >= 0 {
        let multiplier: u128 = 10u128.pow(exponent_adjust as u32);
        usdc.checked_mul(multiplier)
            .unwrap()
            .checked_div(sol.abs() as u128)
            .unwrap()
    } else {
        let multiplier: u128 = 10u128.pow((-exponent_adjust) as u32);
        usdc.checked_div((sol.abs() as u128).checked_mul(multiplier).unwrap())
            .unwrap()
    };

    sol_u128 as u64
}

pub fn is_team_member(key: &Pubkey) -> bool {
    TEAM_WALLETS.iter().any(|(wallet, _)| key.eq(wallet))
}

pub fn get_member_percentage(address: &Pubkey) -> Option<u16> {
    TEAM_WALLETS.iter().find_map(|(wallet, share)| {
        if wallet == address {
            Some(*share)
        } else {
            None
        }
    })
}

pub fn get_quote_mint(currency: Currency) -> Result<Pubkey> {
    if currency == Currency::SOL {
        return Ok(WSOL_MINT);
    } else if currency == Currency::USDC {
        return Ok(USDC_MINT);
    } else {
        return Err(CustomError::InvalidCurrency.into());
    }
}

#[derive(Accounts)]
pub struct AccountsForWrapSol<'info> {
    /// CHECK: payer is a vault or user wallet
    #[account(mut)]
    pub payer: AccountInfo<'info>,
    #[account(mut)]
    pub input_token_account: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

pub fn wrap_sol_if_needed(
    accounts: AccountsForWrapSol,
    amount_in: u64,
    input_currency: Currency,
) -> Result<()> {
    if input_currency == Currency::SOL {
        // if input currency is SOL, wrap the SOL
        let sol_balance = **accounts.payer.to_account_info().try_borrow_lamports()?;
        require!(sol_balance >= amount_in, CustomError::InsufficientBalance);
        msg!("Wrapping SOL amount: {}", amount_in);
        transfer_sol(
            &accounts.payer.to_account_info(),
            &accounts.input_token_account.to_account_info(),
            amount_in,
        )?;
        wrap_sol(
            &accounts.token_program.to_account_info(),
            &accounts.input_token_account.to_account_info(),
        )?;
    } else {
        // otherwise, check if the input amount is enough
        require!(
            accounts.input_token_account.amount >= amount_in,
            CustomError::InsufficientBalance
        );
    }

    Ok(())
}

pub fn wrap_sol_if_needed_with_pda_key(
    key: &str,
    bump: u8,
    accounts: AccountsForWrapSol,
    amount_in: u64,
    input_currency: Currency,
) -> Result<()> {
    if input_currency == Currency::SOL {
        // if input currency is SOL, wrap the SOL
        let sol_balance = **accounts.payer.to_account_info().try_borrow_lamports()?;
        require!(sol_balance >= amount_in, CustomError::InsufficientBalance);
        msg!("Wrapping SOL amount: {}", amount_in);
        transfer_sol_with_pda_key(
            key,
            bump,
            &accounts.payer.to_account_info(),
            &accounts.input_token_account.to_account_info(),
            amount_in,
        )?;
        wrap_sol(
            &accounts.token_program.to_account_info(),
            &accounts.input_token_account.to_account_info(),
        )?;
    } else {
        // otherwise, check if the input amount is enough
        require!(
            accounts.input_token_account.amount >= amount_in,
            CustomError::InsufficientBalance
        );
    }

    Ok(())
}

#[derive(Accounts)]
pub struct AccountsForUnwrapSol<'info> {
    /// CHECK: payer is a vault or user wallet
    #[account(mut)]
    pub payer: AccountInfo<'info>,
    #[account(mut)]
    pub input_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub output_token_account: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: payer_wsol_vault is a vault account
    #[account(
        seeds = [
            b"payer_wsol".as_ref(),
            payer.key().as_ref(),
        ],
        bump,
    )]
    pub payer_wsol_vault: UncheckedAccount<'info>,
    #[account(address = WSOL_MINT)]
    pub wsol_mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub payer_wsol_ata: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

fn close_payer_wsol_account<'info>(
    bump: u8,
    payer: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    account_to_close: &AccountInfo<'info>,
    destination_account: &AccountInfo<'info>,
    authority_account: &AccountInfo<'info>,
) -> Result<()> {
    return token::close_account(CpiContext::new_with_signer(
        token_program.clone(),
        token::CloseAccount {
            account: account_to_close.clone(),
            destination: destination_account.clone(),
            authority: authority_account.clone(),
        },
        &[&[b"payer_wsol".as_ref(), payer.key().as_ref(), &[bump]]],
    ));
}

pub fn unwrap_sol_if_needed(
    accounts: AccountsForUnwrapSol,
    input_currency: Currency,
    output_currency: Currency,
    bump: u8,
) -> Result<()> {
    let process_account = if input_currency == Currency::SOL {
        &accounts.input_token_account
    } else if output_currency == Currency::SOL {
        &accounts.output_token_account
    } else {
        return Ok(());
    };

    let updated_account = reload_token_account(process_account)?;
    let amount_diff = updated_account.amount - process_account.amount;

    if process_account.amount == 0 {
        // if initial amount is zero, close the token account
        if updated_account.amount > 0 {
            msg!("Unwrapping WSOL amount: {}", updated_account.amount);
        }
        close_token_account(
            &accounts.token_program.to_account_info(),
            &process_account.to_account_info(),
            &accounts.payer.to_account_info(),
            &accounts.payer.to_account_info(),
        )?;
    } else if amount_diff > 0 {
        // otherwise, unwrap the diff amount
        msg!("Unwrapping WSOL amount: {}", amount_diff);
        transfer_token(
            &accounts.token_program.to_account_info(),
            &process_account.to_account_info(),
            &accounts.payer_wsol_ata.to_account_info(),
            &accounts.payer.to_account_info(),
            amount_diff,
        )?;
        close_payer_wsol_account(
            bump,
            &accounts.payer.to_account_info(),
            &accounts.token_program.to_account_info(),
            &accounts.payer_wsol_ata.to_account_info(),
            &accounts.payer.to_account_info(),
            &accounts.payer_wsol_vault.to_account_info(),
        )?;
    }

    Ok(())
}

pub fn unwrap_sol_if_needed_with_pda_key(
    key: &str,
    bump: u8,
    accounts: AccountsForUnwrapSol,
    input_currency: Currency,
    output_currency: Currency,
    payer_wsol_vault_bump: u8,
) -> Result<()> {
    let process_account = if input_currency == Currency::SOL {
        &accounts.input_token_account
    } else if output_currency == Currency::SOL {
        &accounts.output_token_account
    } else {
        return Ok(());
    };

    let updated_account = reload_token_account(process_account)?;
    let amount_diff = updated_account.amount - process_account.amount;

    if process_account.amount == 0 {
        // if initial amount is zero, close the token account
        if updated_account.amount > 0 {
            msg!("Unwrapping WSOL amount: {}", updated_account.amount);
        }
        close_token_account_with_pda_key(
            key,
            bump,
            &accounts.token_program.to_account_info(),
            &process_account.to_account_info(),
            &accounts.payer.to_account_info(),
            &accounts.payer.to_account_info(),
        )?;
    } else if amount_diff > 0 {
        // otherwise, unwrap the diff amount
        msg!("Unwrapping WSOL amount: {}", amount_diff);
        transfer_token_with_pda_key(
            key,
            bump,
            &accounts.token_program.to_account_info(),
            &process_account.to_account_info(),
            &accounts.payer_wsol_ata.to_account_info(),
            &accounts.payer.to_account_info(),
            amount_diff,
        )?;
        close_payer_wsol_account(
            payer_wsol_vault_bump,
            &accounts.payer.to_account_info(),
            &accounts.token_program.to_account_info(),
            &accounts.payer_wsol_ata.to_account_info(),
            &accounts.payer.to_account_info(),
            &accounts.payer_wsol_vault.to_account_info(),
        )?;
    }

    Ok(())
}
