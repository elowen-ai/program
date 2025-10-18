import { PublicKey } from '@solana/web3.js'
import { utils, BN } from '@coral-xyz/anchor'
import { getElwMint } from './instructions/platform'
import { QuoteCurrency, RoundDirection } from './types'
import { bool, publicKey, u128, u64 } from '@solana/buffer-layout-utils'
import { u8, seq, struct, blob, u16, u32 } from '@solana/buffer-layout'
import {
    fromTokenFormat,
    getCpSwapProgramId,
    getLockingProgramId,
    getQuoteMint,
    toFixedDown,
    toTokenFormat
} from './utils'

export const POOL_SEED = Buffer.from(utils.bytes.utf8.encode('pool'))
export const AMM_CONFIG_SEED = Buffer.from(utils.bytes.utf8.encode('amm_config'))
export const POOL_VAULT_SEED = Buffer.from(utils.bytes.utf8.encode('pool_vault'))
export const POOL_LP_MINT_SEED = Buffer.from(utils.bytes.utf8.encode('pool_lp_mint'))
export const TICK_ARRAY_SEED = Buffer.from(utils.bytes.utf8.encode('tick_array'))
export const OPERATION_SEED = Buffer.from(utils.bytes.utf8.encode('operation'))
export const OBSERVATION_SEED = Buffer.from(utils.bytes.utf8.encode('observation'))
export const POOL_AUTH_SEED = Buffer.from(utils.bytes.utf8.encode('vault_and_lp_mint_auth_seed'))
export const LOCK_CP_AUTH_SEED = Buffer.from(utils.bytes.utf8.encode('lock_cp_authority_seed'))
export const LOCKED_LIQUIDITY_SEED = Buffer.from(utils.bytes.utf8.encode('locked_liquidity'))

export function u16ToBytes(num: number) {
    const arr = new ArrayBuffer(2)
    const view = new DataView(arr)
    view.setUint16(0, num, false)
    return new Uint8Array(arr)
}

export function i16ToBytes(num: number) {
    const arr = new ArrayBuffer(2)
    const view = new DataView(arr)
    view.setInt16(0, num, false)
    return new Uint8Array(arr)
}

export function u32ToBytes(num: number) {
    const arr = new ArrayBuffer(4)
    const view = new DataView(arr)
    view.setUint32(0, num, false)
    return new Uint8Array(arr)
}

export function i32ToBytes(num: number) {
    const arr = new ArrayBuffer(4)
    const view = new DataView(arr)
    view.setInt32(0, num, false)
    return new Uint8Array(arr)
}

export function getAmmConfigAddress(index: number) {
    const [address] = PublicKey.findProgramAddressSync(
        [AMM_CONFIG_SEED, u16ToBytes(index)],
        getCpSwapProgramId()
    )
    return address
}

export function getCpSwapAuthorityAddress() {
    const [address] = PublicKey.findProgramAddressSync([POOL_AUTH_SEED], getCpSwapProgramId())
    return address
}

export function getLockingAuthorityAddress() {
    const [address] = PublicKey.findProgramAddressSync([LOCK_CP_AUTH_SEED], getLockingProgramId())
    return address
}

export function getLockedLiquidityAddress(feeNftMint: PublicKey) {
    const [address] = PublicKey.findProgramAddressSync(
        [LOCKED_LIQUIDITY_SEED, feeNftMint.toBuffer()],
        getLockingProgramId()
    )
    return address
}

export function getPoolAddress(ammConfig: PublicKey, elwMint: PublicKey, quoteMint: PublicKey) {
    const [address] = PublicKey.findProgramAddressSync(
        [POOL_SEED, ammConfig.toBuffer(), elwMint.toBuffer(), quoteMint.toBuffer()],
        getCpSwapProgramId()
    )
    return address
}

export function getPoolVaultAddress(pool: PublicKey, vaultTokenMint: PublicKey) {
    const [address] = PublicKey.findProgramAddressSync(
        [POOL_VAULT_SEED, pool.toBuffer(), vaultTokenMint.toBuffer()],
        getCpSwapProgramId()
    )
    return address
}

export async function getElwVaultAddress(pool: PublicKey) {
    const [address] = PublicKey.findProgramAddressSync(
        [POOL_VAULT_SEED, pool.toBuffer(), (await getElwMint()).toBuffer()],
        getCpSwapProgramId()
    )
    return address
}

export async function getQuoteVaultAddress(pool: PublicKey, currency: QuoteCurrency) {
    const [address] = PublicKey.findProgramAddressSync(
        [POOL_VAULT_SEED, pool.toBuffer(), getQuoteMint(currency).toBuffer()],
        getCpSwapProgramId()
    )
    return address
}

export function getPoolLpMintAddress(pool: PublicKey) {
    const [address] = PublicKey.findProgramAddressSync(
        [POOL_LP_MINT_SEED, pool.toBuffer()],
        getCpSwapProgramId()
    )
    return address
}

export function getObservationAddress(pool: PublicKey) {
    const [address] = PublicKey.findProgramAddressSync(
        [OBSERVATION_SEED, pool.toBuffer()],
        getCpSwapProgramId()
    )
    return address
}

export interface Observation {
    blockTimestamp: number
    cumulativeToken0PriceX32: any
    cumulativeToken1PriceX32: any
}

export const ObservationLayout = struct<Observation>([
    u32('blockTimestamp'),
    u128('cumulativeToken0PriceX32'),
    u128('cumulativeToken1PriceX32')
])

export interface ObservationInfo {
    discriminator?: any
    initialized: boolean
    observationIndex: number
    poolId: PublicKey
    observations: Observation[]
    padding?: bigint[]
}

export const ObservationInfoLayout = struct<ObservationInfo>([
    blob(8),
    bool('initialized'),
    u16('observationIndex'),
    publicKey('poolId'),
    seq(ObservationLayout, 100, 'observations'),
    seq(u64(), 4)
])

export interface ConfigInfo {
    discriminator?: any
    bump: number
    disableCreatePool: boolean
    index: number
    tradeFeeRate: BN
    protocolFeeRate: BN
    fundFeeRate: BN
    createPoolFee: BN
    protocolOwner: PublicKey
    fundOwner: PublicKey
    padding?: BN[]
}

export const ConfigInfoLayout = struct<ConfigInfo>([
    blob(8),
    u8('bump'),
    bool('disableCreatePool'),
    u16('index'),
    u64('tradeFeeRate'),
    u64('protocolFeeRate'),
    u64('fundFeeRate'),
    u64('createPoolFee'),
    publicKey('protocolOwner'),
    publicKey('fundOwner'),
    seq(u64(), 16)
])

export interface PoolInfo {
    discriminator?: any
    configId: PublicKey
    poolCreator: PublicKey
    elwVault: PublicKey
    quoteVault: PublicKey
    lpMint: PublicKey
    elwMint: PublicKey
    quoteMint: PublicKey
    elwMintProgram: PublicKey
    quoteMintProgram: PublicKey
    observationId: PublicKey
    bump: number
    status: number
    lpDecimals: number
    elwDecimals: number
    quoteDecimals: number
    lpSupply: BN
    elwProtocolFees: BN
    quoteProtocolFees: BN
    elwFundFees: BN
    quoteFundFees: BN
    openTime: BN
    padding?: BN[]
}

export const PoolInfoLayout = struct<PoolInfo>([
    blob(8),

    publicKey('configId'),
    publicKey('poolCreator'),
    publicKey('elwVault'),
    publicKey('quoteVault'),

    publicKey('lpMint'),
    publicKey('elwMint'),
    publicKey('quoteMint'),

    publicKey('elwMintProgram'),
    publicKey('quoteMintProgram'),

    publicKey('observationId'),

    u8('bump'),
    u8('status'),

    u8('lpDecimals'),
    u8('elwDecimals'),
    u8('quoteDecimals'),

    u64('lpSupply'),
    u64('elwProtocolFees'),
    u64('quoteProtocolFees'),
    u64('elwFundFees'),
    u64('quoteFundFees'),
    u64('openTime'),

    seq(u64(), 32)
])

export interface LockedLiquidityState {
    discriminator?: any
    lockedLpAmount: BN
    claimedLpAmount: BN
    unclaimedLpAmount: BN
    lastLp: BN
    lastK: BN
    recentEpoch: BN
    poolId: PublicKey
    feeNftMint: PublicKey
    lockedOwner: PublicKey
    lockedLpMint: PublicKey
    padding?: BN[]
}

export const LockedLiquidityStateLayout = struct<LockedLiquidityState>([
    blob(8),
    u64('lockedLpAmount'),
    u64('claimedLpAmount'),
    u64('unclaimedLpAmount'),
    u64('lastLp'),
    u128('lastK'),
    u64('recentEpoch'),
    publicKey('poolId'),
    publicKey('feeNftMint'),
    publicKey('lockedOwner'),
    publicKey('lockedLpMint'),
    seq(u64(), 8)
])

const ZERO = new BN(0)

function checkedRem(dividend: BN, divisor: BN): BN {
    if (divisor.isZero()) throw Error('divisor is zero')

    const result = dividend.mod(divisor)
    return result
}

export function lpTokensToTradingTokens(
    lpTokenAmount: BN,
    lpTokenSupply: BN,
    elwVaultAmount: BN,
    quoteVaultAmount: BN,
    roundDirection: RoundDirection
) {
    let elwAmount = lpTokenAmount.mul(elwVaultAmount).div(lpTokenSupply)
    let quoteAmount = lpTokenAmount.mul(quoteVaultAmount).div(lpTokenSupply)

    if (roundDirection === RoundDirection.Floor) {
        return { elwAmount, quoteAmount }
    } else if (roundDirection === RoundDirection.Ceiling) {
        const elwRemainder = checkedRem(lpTokenAmount.mul(elwVaultAmount), lpTokenSupply)

        if (elwRemainder.gt(ZERO) && elwAmount.gt(ZERO)) {
            elwAmount = elwAmount.add(new BN(1))
        }

        const quoteRemainder = checkedRem(lpTokenAmount.mul(quoteVaultAmount), lpTokenSupply)

        if (quoteRemainder.gt(ZERO) && quoteAmount.gt(ZERO)) {
            quoteAmount = quoteAmount.add(new BN(1))
        }

        return { elwAmount, quoteAmount }
    }
    throw Error('roundDirection value error')
}

export function tradingTokensToLpTokens(
    elwAmount: BN,
    quoteAmount: BN,
    lpTokenSupply: BN,
    elwVaultAmount: BN,
    quoteVaultAmount: BN,
    roundDirection: RoundDirection
): BN {
    let lpFromElwAmount = elwAmount.mul(lpTokenSupply).div(elwVaultAmount)
    let lpFromQuoteAmount = quoteAmount.mul(lpTokenSupply).div(quoteVaultAmount)

    let lpTokenAmount = BN.min(lpFromElwAmount, lpFromQuoteAmount)

    if (roundDirection === RoundDirection.Floor) {
        return toTokenFormat(Number(toFixedDown(fromTokenFormat(lpTokenAmount))))
    } else if (roundDirection === RoundDirection.Ceiling) {
        const elwRemainder = checkedRem(elwAmount.mul(lpTokenSupply), elwVaultAmount)
        const quoteRemainder = checkedRem(quoteAmount.mul(lpTokenSupply), quoteVaultAmount)

        if ((elwRemainder.gt(ZERO) || quoteRemainder.gt(ZERO)) && lpTokenAmount.gt(ZERO)) {
            lpTokenAmount = lpTokenAmount.add(new BN(1))
        }

        return toTokenFormat(Number(fromTokenFormat(lpTokenAmount).toFixed(0)))
    }

    throw Error('roundDirection value error')
}
