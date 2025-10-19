import '../common'
import { expect } from 'chai'
import {
    ErrorCode,
    signAndSendTransaction,
    getLiquidityVaultRaydiumKeyNfts,
    createCollectLockedLiquidityFeesTransaction,
    Currency
} from '../../app'

describe('Liquidity Collect', () => {
    it('Collect USDC Pool Fees', async () => {
        let result: any
        try {
            const nfts = await getLiquidityVaultRaydiumKeyNfts(true, Currency.USDC)
            for (const nft of nfts) {
                const transaction = await createCollectLockedLiquidityFeesTransaction(nft)
                const txSig = await signAndSendTransaction(transaction)
                console.log('Your transaction signature', txSig)
            }
            result = true
        } catch (error: any) {
            result =
                error.message === ErrorCode.ZeroTradingTokens ||
                error.message === ErrorCode.NoRewardInVault
        }
        expect(result).to.be.equal(true)
    })
    it('Collect SOL Pool Fees', async () => {
        let result: any
        try {
            const nfts = await getLiquidityVaultRaydiumKeyNfts(true, Currency.SOL)
            for (const nft of nfts) {
                const transaction = await createCollectLockedLiquidityFeesTransaction(nft)
                const txSig = await signAndSendTransaction(transaction)
                console.log('Your transaction signature', txSig)
            }
            result = true
        } catch (error: any) {
            result =
                error.message === ErrorCode.ZeroTradingTokens ||
                error.message === ErrorCode.NoRewardInVault
        }
        expect(result).to.be.equal(true)
    })
})
