use anchor_lang::prelude::*;

#[error_code]
pub enum CustomError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("All tokens sold")]
    AllTokensSold,
    #[msg("Presale is ended")]
    PresaleIsEnded,
    #[msg("Presale is not ended")]
    PresaleIsNotEnded,
    #[msg("Invalid currency")]
    InvalidCurrency,
    #[msg("Period not reached")]
    PeriodNotReached,
    #[msg("All rewards have been claimed")]
    AllRewardsClaimed,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Presale is not started")]
    PresaleIsNotStarted,
    #[msg("Member share not found")]
    MemberShareNotFound,
    #[msg("Tokens already claimed")]
    TokensAlreadyClaimed,
    #[msg("Insufficient liquidity")]
    InsufficientLiquidity,
    #[msg("Claimable reward not ready")]
    ClaimableRewardNotReady,
    #[msg("Not enough balance in vault")]
    NotEnoughBalanceInVault,
    #[msg("Exceeds the remaining amount")]
    ExceedsTheRemainingAmount,
    #[msg("Unsold tokens already burned")]
    UnsoldTokensAlreadyBurned,
    #[msg("Cannot burn until presale is done")]
    CannotBurnUntilPresaleDone,
    #[msg("Cannot claim until unlock time")]
    CannotClaimUntilUnlockTime,
    #[msg("Already claimed for this period")]
    AlreadyClaimedForThisPeriod,
    #[msg("Below the minimum contribution")]
    BelowTheMinimumContribution,
    #[msg("Exceeds the maximum contribution")]
    ExceedsTheMaximumContribution
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