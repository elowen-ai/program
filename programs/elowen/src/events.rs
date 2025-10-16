use anchor_lang::prelude::*;

#[event]
pub struct ElwBurnEvent {
    pub process: String,
    pub amount: u64,
}

#[event]
pub struct ClaimRewardEvent {
    pub receiver: Pubkey,
    pub amount: u64,
}

#[event]
pub struct BuyPresaleTokenEvent {
    pub receiver: Pubkey,
    pub amount: u64,
}
