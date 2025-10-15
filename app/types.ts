import { PublicKey } from '@solana/web3.js'
import type { Elowen } from '../target/types/elowen'

export type IDLType = Elowen

export enum ErrorCode {
    Unauthorized = 'Unauthorized',
    PdaAlreadyInUse = 'PdaAlreadyInUse',
    PeriodNotReached = 'PeriodNotReached',
    MemberShareNotFound = 'MemberShareNotFound',
    NotEnoughBalanceInVault = 'NotEnoughBalanceInVault',
    AlreadyClaimedForThisPeriod = 'AlreadyClaimedForThisPeriod'
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
