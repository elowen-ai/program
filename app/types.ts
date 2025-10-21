import { PublicKey } from '@solana/web3.js'
import type { Elowen } from '../target/types/elowen'
import { Metadata } from '@metaplex-foundation/mpl-token-metadata'
import { getLockedLpStateByFeeNftMint } from './instructions/liquidity/cpmm'

export type IDLType = Elowen

export enum ErrorCode {
    Unauthorized = 'Unauthorized',
    AllTokensSold = 'AllTokensSold',
    PresaleIsEnded = 'PresaleIsEnded',
    InvalidCurrency = 'InvalidCurrency',
    PdaAlreadyInUse = 'PdaAlreadyInUse',
    NoRewardInVault = 'NoRewardInVault',
    ExceededSlippage = 'ExceededSlippage',
    PeriodNotReached = 'PeriodNotReached',
    AllRewardsClaimed = 'AllRewardsClaimed',
    PresaleIsNotEnded = 'PresaleIsNotEnded',
    WrongAccountGiven = 'WrongAccountGiven',
    ZeroTradingTokens = 'ZeroTradingTokens',
    InsufficientReward = 'InsufficientReward',
    NoClaimableRewards = 'NoClaimableRewards',
    InsufficientBalance = 'InsufficientBalance',
    MemberShareNotFound = 'MemberShareNotFound',
    PresaleIsNotStarted = 'PresaleIsNotStarted',
    TokensAlreadyClaimed = 'TokensAlreadyClaimed',
    AccountNotInitialized = 'AccountNotInitialized',
    InsufficientLiquidity = 'InsufficientLiquidity',
    NotEnoughBalanceInVault = 'NotEnoughBalanceInVault',
    ClaimableRewardNotReady = 'ClaimableRewardNotReady',
    ExceededTransactionLimit = 'ExceededTransactionLimit',
    UnsoldTokensAlreadyBurned = 'UnsoldTokensAlreadyBurned',
    ExceedsTheRemainingAmount = 'ExceedsTheRemainingAmount',
    CannotBurnUntilPresaleDone = 'CannotBurnUntilPresaleDone',
    CannotClaimUntilUnlockTime = 'CannotClaimUntilUnlockTime',
    AlreadyClaimedForThisPeriod = 'AlreadyClaimedForThisPeriod',
    BelowTheMinimumContribution = 'BelowTheMinimumContribution',
    ExceedsTheMaximumContribution = 'ExceedsTheMaximumContribution',
    CannotInitializeUntilPresaleDone = 'CannotInitializeUntilPresaleDone',
    ThisAmountIsLockedForMiningRewards = 'ThisAmountIsLockedForMiningRewards'
}

export type ClaimableReward = {
    timestamp: number
    percentage: number
}

export type SolanaAddress = string | PublicKey

export enum Currency {
    USDC = 'USDC',
    SOL = 'SOL',
    ELW = 'ELW',
    WSOL = 'WSOL'
}

export enum CurrencyMap {
    USDC = 0,
    SOL = 1,
    ELW = 2,
    WSOL = 3
}

export type Currencies = (typeof Currency)[keyof typeof Currency]

export type QuoteCurrency = Exclude<Currencies, Currency.ELW | Currency.WSOL>

export type ValidInputOutput<T extends Currencies> = T extends Currency.ELW
    ? Exclude<Currencies, T>
    : T extends QuoteCurrency | Currency.WSOL
    ? Currency.ELW
    : never

export enum PresaleType {
    ThreeMonthsLockup = 'ThreeMonthsLockup',
    SixMonthsLockup = 'SixMonthsLockup'
}

export enum PresaleTypeMap {
    ThreeMonthsLockup = 1,
    SixMonthsLockup = 2
}

export type BuyPremiumEvent = {
    buyer: PublicKey
    amount: number
    currency: Currency
}

export type BuyPresaleTokenEvent = {
    receiver: PublicKey
    amount: number
}

export type ClaimRewardEvent = {
    receiver: PublicKey
    amount: number
}

export type ElwBurnEvent = {
    amount: number
    process: string
}

export enum SwapDirection {
    Input,
    Output
}

export enum RoundDirection {
    Floor,
    Ceiling
}

export enum VaultAccount {
    Eda = 'eda',
    Team = 'team',
    Reward = 'reward',
    Presale = 'presale',
    Treasury = 'treasury',
    Liquidity = 'liquidity',
    Platform = 'platform'
}

export type RaydiumKeyNft = {
    mint: PublicKey
    metadata: Metadata
    account: PublicKey
    lockedLpState: Awaited<ReturnType<typeof getLockedLpStateByFeeNftMint>> | null
}
