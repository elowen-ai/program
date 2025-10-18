import '../common'
import { expect } from 'chai'
import {
    Currency,
    ErrorCode,
    createDepositCpmmLiquidityTransaction,
    getPriceByQuoteCurrency,
    signAndSendTransaction
} from '../../app'

const elwForSolPool = 100_000_000 // for get InsufficientLiquidity
const elwForUsdcPool = 100_000_000 // for get InsufficientLiquidity

describe('Liquidity Deposit', () => {
    it('Deposit with USDC', async () => {
        let result: any
        try {
            const prices = await getPriceByQuoteCurrency(Currency.USDC)
            const { transactionV0, feeNftMint } = await createDepositCpmmLiquidityTransaction(
                elwForUsdcPool,
                elwForUsdcPool * prices.elwToQuote,
                Currency.USDC
            )
            const txSig = await signAndSendTransaction(transactionV0, [feeNftMint])
            console.log('Your transaction signature', txSig)
            result = true
        } catch (error: any) {
            result = error.message === ErrorCode.InsufficientLiquidity
        }
        expect(result).to.be.equal(true)
    })
    it('Deposit with SOL', async () => {
        let result: any
        try {
            const prices = await getPriceByQuoteCurrency(Currency.SOL)
            const { transactionV0, feeNftMint } = await createDepositCpmmLiquidityTransaction(
                elwForSolPool,
                elwForSolPool * prices.elwToQuote,
                Currency.SOL
            )
            const txSig = await signAndSendTransaction(transactionV0, [feeNftMint])
            console.log('Your transaction signature', txSig)
            result = true
        } catch (error: any) {
            result = error.message === ErrorCode.InsufficientLiquidity
        }
        expect(result).to.be.equal(true)
    })
})
