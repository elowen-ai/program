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

#[account]
#[derive(InitSpace)]
pub struct MemberClaimAccount {
    pub amount: u64,
    pub last_period: i64,
}
