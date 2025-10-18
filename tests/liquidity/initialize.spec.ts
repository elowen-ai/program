import '../common'
import { expect } from 'chai'
import {
    Currency,
    ErrorCode,
    createInitializeCpmmLiquidityTransaction,
    signAndSendTransaction
} from '../../app'

const now = Math.floor(Date.now() / 1000)

// see fees: https://api-v3.raydium.io/main/cpmm-config

const solSupply = 23.442109849 / 2
const usdcSupply = 637200 / 2
const solUsdcPrice = 177.12
const initialElwAmount = 100_000_000

const totalSolUsdc = solSupply * solUsdcPrice
const totalUsdcValue = totalSolUsdc + usdcSupply

const elwForSolPool = initialElwAmount * (totalSolUsdc / totalUsdcValue)
const elwForUsdcPool = initialElwAmount - elwForSolPool

describe('Liquidity Initialize', () => {
    it('Initialize with USDC', async () => {
        let result: any
        try {
            const { transactionV0, feeNftMint } = await createInitializeCpmmLiquidityTransaction(
                elwForUsdcPool,
                usdcSupply,
                Currency.USDC,
                now
            )
            const txSig = await signAndSendTransaction(transactionV0, [feeNftMint])
            console.log('Your transaction signature', txSig)
            result = true
        } catch (error: any) {
            result = error.message === ErrorCode.PdaAlreadyInUse
        }
        expect(result).to.be.equal(true)
    })
    it('Initialize with SOL', async () => {
        let result: any
        try {
            const { transactionV0, feeNftMint } = await createInitializeCpmmLiquidityTransaction(
                elwForSolPool,
                solSupply,
                Currency.SOL,
                now
            )
            const txSig = await signAndSendTransaction(transactionV0, [feeNftMint])
            console.log('Your transaction signature', txSig)
            result = true
        } catch (error: any) {
            result = error.message === ErrorCode.PdaAlreadyInUse
        }
        expect(result).to.be.equal(true)
    })
})
