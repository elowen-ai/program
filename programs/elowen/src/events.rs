use anchor_lang::prelude::*;

use crate::enums::Currency;

#[event]
pub struct BuyPremiumEvent {
    pub buyer: Pubkey,
    pub amount: u64,
    pub currency: Currency,
}

#[event]
pub struct BuyPresaleTokenEvent {
    pub receiver: Pubkey,
    pub amount: u64,
}

#[event]
pub struct ClaimRewardEvent {
    pub receiver: Pubkey,
    pub amount: u64,
}

#[event]
pub struct ElwBurnEvent {
    pub process: String,
    pub amount: u64,
}
