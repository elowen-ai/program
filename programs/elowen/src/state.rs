use anchor_lang::prelude::*;

use crate::{constants::*, enums::MiningAction, functions::calculate_by_percentage};

#[account]
#[derive(InitSpace)]
pub struct PlatformAccount {
    pub elw_mint: Pubkey,
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
pub struct MemberClaimAccount {
    pub amount: u64,
    pub last_period: i64,
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

#[account]
#[derive(InitSpace)]
pub struct AddressLookupTableAccount {
    pub lookup_table: Pubkey,
}

#[account]
#[derive(InitSpace)]
pub struct MiningStateAccount {
    pub elw_amount: u64,
    pub quote_amount: u64,
    pub last_update_time: i64,
    pub claimed_rewards: u64,
    pub accumulated_rewards: u64,
}

impl MiningStateAccount {
    pub fn update_sync(
        &mut self,
        miner_state: &mut MinerStateAccount,
        platform_elw_amount: u64,
        elw_amount: u64,
        quote_amount: u64,
        mining_action: MiningAction,
    ) -> u64 {
        self.update_accumulated_rewards(platform_elw_amount);
        let accumulated_rewards = self.get_miner_rewards(miner_state.elw_amount);
        let claimable_rewards = accumulated_rewards - miner_state.claimed_rewards;
        miner_state.update_accumulated_rewards(accumulated_rewards);
        match mining_action {
            MiningAction::Deposit => {
                self.deposit(elw_amount, quote_amount);
                miner_state.deposit(elw_amount, quote_amount);
            }
            MiningAction::Withdraw => {
                self.withdraw(elw_amount, quote_amount);
                miner_state.withdraw(elw_amount, quote_amount);
            }
            MiningAction::Claim => {
                self.claim(claimable_rewards);
                miner_state.claim(claimable_rewards);
            }
        }
        claimable_rewards
    }

    pub fn get_locked_reward_amount(&self, reward_amount: u64) -> u64 {
        let now = Clock::get().unwrap().unix_timestamp;
        self.accumulated_rewards + self.calculate(reward_amount, now)
    }

    fn update_accumulated_rewards(&mut self, reward_amount: u64) {
        let now = Clock::get().unwrap().unix_timestamp;
        if self.elw_amount > 0 {
            self.accumulated_rewards += self.calculate(reward_amount, now);
        }
        self.last_update_time = now;
    }

    fn deposit(&mut self, elw_amount: u64, quote_amount: u64) {
        self.elw_amount = self.elw_amount.saturating_add(elw_amount);
        self.quote_amount = self.quote_amount.saturating_add(quote_amount);
    }

    fn withdraw(&mut self, elw_amount: u64, quote_amount: u64) {
        self.elw_amount = self.elw_amount.saturating_sub(elw_amount);
        self.quote_amount = self.quote_amount.saturating_sub(quote_amount);
    }

    fn claim(&mut self, claimable_rewards: u64) {
        self.claimed_rewards = self.claimed_rewards.saturating_add(claimable_rewards);
    }

    fn get_yearly_reward(&self, reward_amount: u64) -> u64 {
        std::cmp::min(
            calculate_by_percentage(reward_amount, MINING_YEARLY_ELW_REWARD_PERCENTAGE),
            calculate_by_percentage(self.elw_amount, MINING_YEARLY_ELW_REWARD_MAX_PERCENTAGE),
        )
    }

    fn get_daily_rewards(&self, reward_amount: u64) -> u64 {
        self.get_yearly_reward(reward_amount) / 365
    }

    fn get_reward_per_seconds(&self, reward_amount: u64) -> u64 {
        self.get_daily_rewards(reward_amount) / 86400
    }

    fn calculate(&self, reward_amount: u64, now: i64) -> u64 {
        // multiply by 2 because of the match with APR calculation
        self.get_reward_per_seconds(reward_amount) * (now - self.last_update_time) as u64 * 2
    }

    fn get_miner_rewards(&self, elw_amount: u64) -> u64 {
        if self.elw_amount == 0 {
            return 0;
        }
        (self.accumulated_rewards as u128 * elw_amount as u128 / self.elw_amount as u128) as u64
    }
}

#[account]
#[derive(InitSpace)]
pub struct MinerStateAccount {
    pub elw_amount: u64,
    pub quote_amount: u64,
    pub claimed_rewards: u64,
    pub accumulated_rewards: u64,
}

impl MinerStateAccount {
    pub fn update_accumulated_rewards(&mut self, accumulated_rewards: u64) {
        self.accumulated_rewards = accumulated_rewards;
    }

    pub fn claim(&mut self, claimable_rewards: u64) {
        self.claimed_rewards = self.claimed_rewards.saturating_add(claimable_rewards);
    }

    pub fn deposit(&mut self, elw_amount: u64, quote_amount: u64) {
        self.elw_amount = self.elw_amount.saturating_add(elw_amount);
        self.quote_amount = self.quote_amount.saturating_add(quote_amount);
    }

    pub fn withdraw(&mut self, elw_amount: u64, quote_amount: u64) {
        self.elw_amount = self.elw_amount.saturating_sub(elw_amount);
        self.quote_amount = self.quote_amount.saturating_sub(quote_amount);
    }
}
