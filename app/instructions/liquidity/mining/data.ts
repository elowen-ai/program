import { PublicKey } from '@solana/web3.js'
import ElowenProgram from '../../../program'
import { CurrencyMap, QuoteCurrency } from '../../../types'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import { getPoolAddress, getPoolLpMintAddress } from '../../../ray'
import { getElwMint, getPlatformVaultElwBalance } from '../../platform'
import {
    formatNumber,
    fromTokenFormat,
    getAmmConfig,
    getDecimalsByCurrency,
    getQuoteMint,
    getTokenAccountInfo,
    maybeToPublicKey,
    MINING_YEARLY_ELW_REWARD_MAX_PERCENTAGE,
    MINING_YEARLY_ELW_REWARD_PERCENTAGE
} from '../../../utils'

async function getMiningYearlyReward(depositElwAmount: number) {
    const { amount } = await getPlatformVaultElwBalance()
    return Math.min(
        amount * MINING_YEARLY_ELW_REWARD_PERCENTAGE,
        depositElwAmount * MINING_YEARLY_ELW_REWARD_MAX_PERCENTAGE
    )
}

async function getMiningDailyReward(depositElwAmount: number) {
    return (await getMiningYearlyReward(depositElwAmount)) / 365
}

async function getMiningRewardPerSeconds(depositElwAmount: number) {
    return (await getMiningDailyReward(depositElwAmount)) / 86400
}

export function getMinerLpVaultAddress(miner: PublicKey) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('miner'), maybeToPublicKey(miner).toBuffer()],
        ElowenProgram.ID
    )[0]
}

export function getMiningStateAddress(currency: QuoteCurrency) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('mining_state'), Buffer.from([CurrencyMap[currency]])],
        ElowenProgram.ID
    )[0]
}

export function getMinerStateAddress(miner: PublicKey, currency: QuoteCurrency) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('miner_state'), miner.toBuffer(), Buffer.from([CurrencyMap[currency]])],
        ElowenProgram.ID
    )[0]
}

export function getMinerLpVaultTokenAtaByMint(miner: PublicKey, mint: PublicKey) {
    return getAssociatedTokenAddressSync(mint, getMinerLpVaultAddress(miner), true)
}

export async function getLpMintByCurrency(currency: QuoteCurrency) {
    return getPoolLpMintAddress(
        getPoolAddress(getAmmConfig(), await getElwMint(), getQuoteMint(currency))
    )
}

export async function getMinerLpVaultTokenAtaByCurrency(miner: PublicKey, currency: QuoteCurrency) {
    return getMinerLpVaultTokenAtaByMint(miner, await getLpMintByCurrency(currency))
}

export async function getMinerLpVaultTokenAmountByMint(miner: PublicKey, mint: PublicKey) {
    const result = await getTokenAccountInfo(getMinerLpVaultTokenAtaByMint(miner, mint))
    const tokenAmount = result?.parsed.info.tokenAmount || {
        amount: '0',
        decimals: 0,
        uiAmount: 0,
        uiAmountString: '0'
    }
    return {
        decimals: tokenAmount.decimals,
        uiAmount: tokenAmount.uiAmount,
        amountStr: tokenAmount.amount,
        amount: Number(tokenAmount.amount),
        uiAmountStr: tokenAmount.uiAmountString,
        amountFormatted: formatNumber(tokenAmount.uiAmount)
    }
}

export async function getMinerLpVaultTokenAmountByCurrency(
    miner: PublicKey,
    currency: QuoteCurrency
) {
    return await getMinerLpVaultTokenAmountByMint(miner, await getLpMintByCurrency(currency))
}

function calculateAprRate(elwAmount: number, yearlyReward: number) {
    return Number(((yearlyReward / (elwAmount || 1)) * 100).toFixed(2))
}

export async function getMiningStateAccountData(currency: QuoteCurrency) {
    const result = await ElowenProgram.accounts.miningStateAccount.fetchNullable(
        getMiningStateAddress(currency)
    )
    if (!result) {
        return null
    }
    const elwAmount = fromTokenFormat(result.elwAmount)
    const [rewardPerSeconds, yearlyReward, dailyReward] = await Promise.all([
        getMiningRewardPerSeconds(elwAmount),
        getMiningYearlyReward(elwAmount),
        getMiningDailyReward(elwAmount)
    ])
    const currentTime = Math.floor(Date.now() / 1000)
    const decimals = getDecimalsByCurrency(currency)
    const lastUpdateTime = result.lastUpdateTime.toNumber()
    const quoteAmount = fromTokenFormat(result.quoteAmount, decimals)
    const claimedRewards = fromTokenFormat(result.claimedRewards)
    // multiply by 2 because of the match with APR calculation
    const unwrittenReward = rewardPerSeconds * (currentTime - lastUpdateTime) * 2
    const accumulatedRewards = fromTokenFormat(result.accumulatedRewards) + unwrittenReward
    const claimableRewards = accumulatedRewards - claimedRewards
    return {
        dailyReward,
        lastUpdateTime,
        elwAmount: Number(elwAmount.toFixed(9)),
        quoteAmount: Number(quoteAmount.toFixed(decimals)),
        claimedRewards: Number(claimedRewards.toFixed(9)),
        claimableRewards: Number(claimableRewards.toFixed(9)),
        accumulatedRewards: Number(accumulatedRewards.toFixed(9)),
        elwAmountFormatted: formatNumber(elwAmount, 9),
        quoteAmountFormatted: formatNumber(quoteAmount, decimals),
        claimedRewardsFormatted: formatNumber(claimedRewards, 9),
        claimableRewardsFormatted: formatNumber(claimableRewards, 9),
        accumulatedRewardsFormatted: formatNumber(accumulatedRewards, 9),
        currentAprRate: calculateAprRate(elwAmount, yearlyReward),
        lastUpdateTimeFormatted: new Date(lastUpdateTime * 1000).toLocaleString()
    }
}

export async function getMinerStateAccountData(
    miner: PublicKey,
    currency: QuoteCurrency,
    _miningState?: Awaited<ReturnType<typeof getMiningStateAccountData>>
) {
    const [result, lpAmount, miningState] = await Promise.all([
        ElowenProgram.accounts.minerStateAccount.fetchNullable(
            getMinerStateAddress(miner, currency)
        ),
        getMinerLpVaultTokenAmountByCurrency(miner, currency),
        _miningState ? Promise.resolve(_miningState) : getMiningStateAccountData(currency)
    ])
    if (!result || !miningState) {
        return null
    }
    const decimals = getDecimalsByCurrency(currency)
    const elwAmount = fromTokenFormat(result.elwAmount)
    const claimedRewards = fromTokenFormat(result.claimedRewards)
    const quoteAmount = fromTokenFormat(result.quoteAmount, decimals)
    // calculate miner share of the mining state
    const minerShare = elwAmount / (miningState.elwAmount || 1)
    const accumulatedRewards = miningState.accumulatedRewards * minerShare
    const minerYearlyReward = miningState.dailyReward * minerShare * 365
    const claimableRewards = accumulatedRewards - claimedRewards
    return {
        lpAmount: lpAmount.uiAmount,
        elwAmount: Number(elwAmount.toFixed(9)),
        quoteAmount: Number(quoteAmount.toFixed(decimals)),
        claimedRewards: Number(claimedRewards.toFixed(9)),
        claimableRewards: Number(claimableRewards.toFixed(9)),
        accumulatedRewards: Number(accumulatedRewards.toFixed(9)),
        lpAmountFormatted: formatNumber(lpAmount.uiAmount, 9),
        elwAmountFormatted: formatNumber(elwAmount, 9),
        quoteAmountFormatted: formatNumber(quoteAmount, decimals),
        claimedRewardsFormatted: formatNumber(claimedRewards, 9),
        claimableRewardsFormatted: formatNumber(claimableRewards, 9),
        accumulatedRewardsFormatted: formatNumber(accumulatedRewards, 9),
        currentAprRate: calculateAprRate(miningState.elwAmount, minerYearlyReward)
    }
}
