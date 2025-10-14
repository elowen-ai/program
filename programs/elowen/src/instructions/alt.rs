use anchor_lang::prelude::*;

use crate::{
    constants::SIGNER, enums::CustomError, functions::get_account_size,
    state::AddressLookupTableAccount,
};

#[derive(Accounts)]
pub struct SaveAddressLookupTable<'info> {
    #[account(
        mut,
        constraint = signer.key() == SIGNER @ CustomError::Unauthorized,
    )]
    pub signer: Signer<'info>,
    #[account(
        init_if_needed,
        payer = signer,
        space = get_account_size(AddressLookupTableAccount::INIT_SPACE),
        seeds = [b"alt".as_ref()],
        bump,
    )]
    pub alt: Account<'info, AddressLookupTableAccount>,
    pub system_program: Program<'info, System>,
}

pub fn save_address_lookup_table(
    ctx: Context<SaveAddressLookupTable>,
    lookup_table: Pubkey,
) -> Result<()> {
    ctx.accounts.alt.lookup_table = lookup_table;
    Ok(())
}
