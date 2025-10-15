use anchor_lang::prelude::*;

#[error_code]
pub enum CustomError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Period not reached")]
    PeriodNotReached,
    #[msg("Member share not found")]
    MemberShareNotFound,
    #[msg("Not enough balance in vault")]
    NotEnoughBalanceInVault,
    #[msg("Already claimed for this period")]
    AlreadyClaimedForThisPeriod
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