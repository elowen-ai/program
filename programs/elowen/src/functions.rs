use anchor_lang::prelude::*;
use anchor_lang::solana_program::*;
use anchor_spl::{
    associated_token,
    token::{self, spl_token::instruction::AuthorityType},
};

pub fn get_account_size(size: usize) -> usize {
    size + 14
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

pub fn calculate_by_percentage(total: u64, percentage: u16) -> u64 {
    (total as f64 * percentage as f64 / 10000.0) as u64
}
