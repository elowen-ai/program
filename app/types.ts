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
    NoRewardInVault = 'NoRewardInVault',
    PdaAlreadyInUse = 'PdaAlreadyInUse',
    PeriodNotReached = 'PeriodNotReached',
    PresaleIsNotEnded = 'PresaleIsNotEnded',
    AllRewardsClaimed = 'AllRewardsClaimed',
    ZeroTradingTokens = 'ZeroTradingTokens',
    InsufficientBalance = 'InsufficientBalance',
    PresaleIsNotStarted = 'PresaleIsNotStarted',
    MemberShareNotFound = 'MemberShareNotFound',
    TokensAlreadyClaimed = 'TokensAlreadyClaimed',
    InsufficientLiquidity = 'InsufficientLiquidity',
    ClaimableRewardNotReady = 'ClaimableRewardNotReady',
    NotEnoughBalanceInVault = 'NotEnoughBalanceInVault',
    ExceedsTheRemainingAmount = 'ExceedsTheRemainingAmount',
    UnsoldTokensAlreadyBurned = 'UnsoldTokensAlreadyBurned',
    CannotClaimUntilUnlockTime = 'CannotClaimUntilUnlockTime',
    CannotBurnUntilPresaleDone = 'CannotBurnUntilPresaleDone',
    AlreadyClaimedForThisPeriod = 'AlreadyClaimedForThisPeriod',
    BelowTheMinimumContribution = 'BelowTheMinimumContribution',
    ExceedsTheMaximumContribution = 'ExceedsTheMaximumContribution'
}

export type SolanaAddress = string | PublicKey

export enum VaultAccount {
    Eda = 'eda',
    Team = 'team',
    Reward = 'reward',
    Presale = 'presale',
    Treasury = 'treasury',
    Liquidity = 'liquidity',
    Platform = 'platform'
}

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

export type ClaimableReward = {
    timestamp: number
    percentage: number
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

export enum SwapDirection {
    Input,
    Output
}

export enum RoundDirection {
    Floor,
    Ceiling
}

export type RaydiumKeyNft = {
    mint: PublicKey
    metadata: Metadata
    account: PublicKey
    lockedLpState: Awaited<ReturnType<typeof getLockedLpStateByFeeNftMint>> | null
}
