use anchor_lang::prelude::*;

#[error_code]
pub enum CustomError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Period not reached")]
    PeriodNotReached,
    #[msg("Not enough balance in vault")]
    NotEnoughBalanceInVault,
    #[msg("Already claimed for this period")]
    AlreadyClaimedForThisPeriod,
    #[msg("Claimable reward not ready")]
    ClaimableRewardNotReady,
    #[msg("Not implemented yet")]
    NotImplementedYet,
    #[msg("All rewards claimed")]
    AllRewardsClaimed,
    #[msg("Presale is not started")]
    PresaleIsNotStarted,
    #[msg("Presale is ended")]
    PresaleIsEnded,
    #[msg("All tokens sold")]
    AllTokensSold,
    #[msg("Exceeds the maximum contribution")]
    ExceedsTheMaximumContribution,
    #[msg("Below the minimum contribution")]
    BelowTheMinimumContribution,
    #[msg("Exceeds the remaining amount")]
    ExceedsTheRemainingAmount,
    #[msg("Cannot burn until presale done")]
    CannotBurnUntilPresaleDone,
    #[msg("Cannot claim until unlock time")]
    CannotClaimUntilUnlockTime,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Presale is not ended")]
    PresaleIsNotEnded,
    #[msg("Tokens already claimed")]
    TokensAlreadyClaimed,
    #[msg("Invalid currency")]
    InvalidCurrency,
    #[msg("Unsold tokens already burned")]
    UnsoldTokensAlreadyBurned,
    #[msg("Insufficient liquidity")]
    InsufficientLiquidity,
    #[msg("No reward in vault")]
    NoRewardInVault,
    #[msg("Cannot initialize until presale done")]
    CannotInitializeUntilPresaleDone,
    #[msg("This amount is locked for mining rewards")]
    ThisAmountIsLockedForMiningRewards,
    #[msg("No claimable rewards")]
    NoClaimableRewards,
    #[msg("Insufficient reward")]
    InsufficientReward,
    #[msg("Member share not found")]
    MemberShareNotFound,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PresaleType {
    ThreeMonthsLockup = 1,
    SixMonthsLockup = 2,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum Currency {
    USDC,
    SOL,
    ELW,
    WSOL,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum SwapDirection {
    Input,
    Output,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum VaultAccount {
    Eda,
    Team,
    Reward,
    Presale,
    Treasury,
    Liquidity,
    Platform,
}

impl VaultAccount {
    pub fn as_str(&self) -> &'static str {
        match self {
            VaultAccount::Eda => "eda",
            VaultAccount::Team => "team",
            VaultAccount::Reward => "reward",
            VaultAccount::Presale => "presale",
            VaultAccount::Treasury => "treasury",
            VaultAccount::Liquidity => "liquidity",
            VaultAccount::Platform => "platform",
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum MiningAction {
    Claim,
    Deposit,
    Withdraw,
}
