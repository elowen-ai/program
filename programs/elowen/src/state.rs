use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PlatformAccount {
    pub elw_mint: Pubkey,
}

#[account]
#[derive(InitSpace)]
pub struct AddressLookupTableAccount {
    pub lookup_table: Pubkey,
}
