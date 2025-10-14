use anchor_lang::prelude::*;

#[event]
pub struct ElwBurnEvent {
    pub process: String,
    pub amount: u64,
}
