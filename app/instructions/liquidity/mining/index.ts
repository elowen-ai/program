import { Transaction } from '@solana/web3.js'
import ElowenProgram from '../../../program'
import { getElwMint } from '../../platform'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import { getMinerStateAddress, getMiningStateAddress } from './data'
import { getLpStateByCurrency, getPoolInfoByMint } from '../cpmm/data'
import { lpTokensToTradingTokens, tradingTokensToLpTokens } from '../../../ray'
import { QuoteCurrency, RoundDirection, SolanaAddress, VaultAccount } from '../../../types'
import {
    getPoolInfoByCurrency,
    getPoolVaultAmountByCurrency,
    getPoolVaultAmountByLpState
} from '../cpmm/data'
import {
    getDecimalsByCurrency,
    maybeToPublicKey,
    calculateSlippageUp,
    toTokenFormat,
    toBn,
    currencyToRustEnum,
    getQuoteMint,
    calculateSlippageDown,
    getVaultAccountElwAta,
    fromTokenFormat
} from '../../../utils'

export * from './data'

export async function createDepositMiningLiquidityTransaction(
    _miner: SolanaAddress,
    maximumElwAmount: number,
    maximumQuoteAmount: number,
    currency: QuoteCurrency,
    slippageBps = 0
) {
    const miner = maybeToPublicKey(_miner)
    const decimals = getDecimalsByCurrency(currency)
    const [elwMint, lpState] = await Promise.all([getElwMint(), getLpStateByCurrency(currency)])
    const [poolInfo, vaultAmounts] = await Promise.all([
        getPoolInfoByMint(lpState.poolState),
        getPoolVaultAmountByLpState(lpState)
    ])
    const maxElwAmount = calculateSlippageUp(maximumElwAmount, slippageBps)
    const maxQuoteAmount = calculateSlippageUp(maximumQuoteAmount, slippageBps, decimals)
    const lpTokenAmount = tradingTokensToLpTokens(
        toTokenFormat(maximumElwAmount),
        toTokenFormat(maximumQuoteAmount, decimals),
        toBn(poolInfo.lpSupply),
        toBn(vaultAmounts.elwAmountStr),
        toBn(vaultAmounts.quoteAmountStr),
        RoundDirection.Floor
    )
    return ElowenProgram.methods
        .depositMiningLiquidity(
            currencyToRustEnum(currency),
            lpTokenAmount,
            maxElwAmount,
            maxQuoteAmount
        )
        .accounts({
            miner,
            elwMint,
            lpMint: poolInfo.lpMint,
            poolState: lpState.poolState,
            quoteMint: getQuoteMint(currency),
            miningState: getMiningStateAddress(currency),
            minerState: getMinerStateAddress(miner, currency)
        })
        .accountsPartial({
            elwVault: poolInfo.elwVault,
            quoteVault: poolInfo.quoteVault,
            minerElwTokenAta: getAssociatedTokenAddressSync(elwMint, miner),
            minerQuoteTokenAta: getAssociatedTokenAddressSync(getQuoteMint(currency), miner)
        })
        .transaction()
}

export async function createWithdrawMiningLiquidityTransaction(
    _miner: SolanaAddress,
    minimumElwAmount: number,
    minimumQuoteAmount: number,
    currency: QuoteCurrency,
    slippageBps = 0
) {
    const miner = maybeToPublicKey(_miner)
    const decimals = getDecimalsByCurrency(currency)
    const [elwMint, lpState] = await Promise.all([getElwMint(), getLpStateByCurrency(currency)])
    const [poolInfo, vaultAmounts] = await Promise.all([
        getPoolInfoByMint(lpState.poolState),
        getPoolVaultAmountByLpState(lpState)
    ])
    const minElwAmount = calculateSlippageDown(minimumElwAmount, slippageBps)
    const minQuoteAmount = calculateSlippageDown(minimumQuoteAmount, slippageBps, decimals)
    const lpTokenAmount = tradingTokensToLpTokens(
        toTokenFormat(minimumElwAmount),
        toTokenFormat(minimumQuoteAmount, decimals),
        toBn(poolInfo.lpSupply),
        toBn(vaultAmounts.elwAmountStr),
        toBn(vaultAmounts.quoteAmountStr),
        RoundDirection.Ceiling
    )
    return ElowenProgram.methods
        .withdrawMiningLiquidity(
            currencyToRustEnum(currency),
            lpTokenAmount,
            minElwAmount,
            minQuoteAmount
        )
        .accounts({
            miner,
            elwMint,
            lpMint: poolInfo.lpMint,
            poolState: lpState.poolState,
            quoteMint: getQuoteMint(currency),
            miningState: getMiningStateAddress(currency),
            minerState: getMinerStateAddress(miner, currency)
        })
        .accountsPartial({
            elwVault: poolInfo.elwVault,
            quoteVault: poolInfo.quoteVault,
            minerElwTokenAta: getAssociatedTokenAddressSync(elwMint, miner),
            minerQuoteTokenAta: getAssociatedTokenAddressSync(getQuoteMint(currency), miner)
        })
        .transaction()
}

export async function createWithdrawMiningLiquidityTransactionByLpAmount(
    _miner: SolanaAddress,
    lpAmount: number,
    currency: QuoteCurrency,
    slippageBps = 0
) {
    const [poolInfo, vaultAmounts] = await Promise.all([
        getPoolInfoByCurrency(currency),
        getPoolVaultAmountByCurrency(currency)
    ])
    const amounts = lpTokensToTradingTokens(
        toTokenFormat(lpAmount),
        toBn(poolInfo.lpSupply),
        toBn(vaultAmounts.elwAmountStr),
        toBn(vaultAmounts.quoteAmountStr),
        RoundDirection.Ceiling
    )
    const elwAmount = fromTokenFormat(amounts.elwAmount)
    const quoteAmount = fromTokenFormat(amounts.quoteAmount, poolInfo.quoteDecimals)
    return createWithdrawMiningLiquidityTransaction(
        _miner,
        elwAmount,
        quoteAmount,
        currency,
        slippageBps
    )
}

export async function createClaimMiningRewardsInstruction(
    _miner: SolanaAddress,
    currency: QuoteCurrency
) {
    const [elwMint, platformTokenAta] = await Promise.all([
        getElwMint(),
        getVaultAccountElwAta(VaultAccount.Platform)
    ])
    const miner = maybeToPublicKey(_miner)
    const miningState = getMiningStateAddress(currency)
    const minerState = getMinerStateAddress(miner, currency)
    return ElowenProgram.methods
        .claimMiningRewards(currencyToRustEnum(currency))
        .accounts({
            miner,
            elwMint,
            minerState,
            miningState,
            platformTokenAta
        })
        .accountsPartial({
            minerTokenAta: getAssociatedTokenAddressSync(elwMint, miner)
        })
        .instruction()
}

export async function createClaimMiningRewardsTransaction(
    miner: SolanaAddress,
    currency: QuoteCurrency
) {
    return new Transaction().add(await createClaimMiningRewardsInstruction(miner, currency))
}
