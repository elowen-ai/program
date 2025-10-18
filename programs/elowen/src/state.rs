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

#[account]
#[derive(InitSpace)]
pub struct RewardAccount {
    pub amount: u64,
    pub percentage: u16,
}

#[account]
#[derive(InitSpace)]
pub struct PurchaseAccount {
    pub amount: u64,
    pub claimed: bool,
    pub unlock_time: i64,
    pub presale_type: u8,
}

#[account]
#[derive(InitSpace)]
pub struct SummaryAccount {
    pub sol_raised: u64,
    pub usdc_raised: u64,
    pub token_sold: u64,
    pub total_amount: u64,
    pub sol_sent_to_eda: u64,
    pub usdc_sent_to_eda: u64,
    pub token_sold_for_sol: u64,
    pub token_sold_for_usdc: u64,
    pub sol_sent_to_liquidity: u64,
    pub usdc_sent_to_liquidity: u64,
    pub is_unsold_tokens_burned: bool,
}

#[account]
#[derive(InitSpace)]
pub struct LpStateAccount {
    pub lp_amount: u64,
    pub elw_amount: u64,
    pub quote_amount: u64,
    pub quote_currency: u8,
    pub pool_state: Pubkey,
}

#[account]
#[derive(InitSpace)]
pub struct LockedLpStateAccount {
    pub quote_currency: u8,
    pub locked_lp_amount: u64,
}