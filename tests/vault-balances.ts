import './common'
import {
    getEdaVaultBalances,
    getLiquidityVaultBalances,
    getTreasuryVaultBalances,
    getTeamVaultElwBalance,
    getPlatformVaultElwBalance,
    getRewardVaultElwBalance,
    getPresaleVaultElwBalance
} from '../app'
;(async () => {
    const edaVaultBalances = await getEdaVaultBalances()
    console.log('edaVaultBalances', edaVaultBalances)
    const liquidityVaultBalances = await getLiquidityVaultBalances()
    console.log('liquidityVaultBalances', liquidityVaultBalances)
    const treasuryVaultBalances = await getTreasuryVaultBalances()
    console.log('treasuryVaultBalances', treasuryVaultBalances)
    const teamVaultElwBalance = await getTeamVaultElwBalance()
    console.log('teamVaultElwBalance', teamVaultElwBalance)
    const platformVaultElwBalance = await getPlatformVaultElwBalance()
    console.log('platformVaultElwBalance', platformVaultElwBalance)
    const rewardVaultElwBalance = await getRewardVaultElwBalance()
    console.log('rewardVaultElwBalance', rewardVaultElwBalance)
    const presaleVaultElwBalance = await getPresaleVaultElwBalance()
    console.log('presaleVaultElwBalance', presaleVaultElwBalance)
})()
