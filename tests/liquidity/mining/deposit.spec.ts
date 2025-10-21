import { expect } from 'chai'
import { clientWallet, clientWallet2 } from '../../common'
import {
    Currency,
    ErrorCode,
    createDepositMiningLiquidityTransaction,
    getPriceByQuoteCurrency,
    signAndSendTransaction
} from '../../../app'

const minerWannaDepositForSol = 10_000
const minerWannaDepositForUsdc = 50_000

describe('Liquidity Mining Deposit', () => {
    it('Deposit with USDC for client 1', async () => {
        let result: any
        try {
            const prices = await getPriceByQuoteCurrency(Currency.USDC)
            const transaction = await createDepositMiningLiquidityTransaction(
                clientWallet.publicKey,
                minerWannaDepositForUsdc,
                minerWannaDepositForUsdc * prices.elwToQuote,
                Currency.USDC
            )
            const txSig = await signAndSendTransaction(transaction, [], clientWallet)
            console.log('Your transaction signature', txSig)
            result = true
        } catch (error: any) {
            result = error.message === ErrorCode.InsufficientBalance
        }
        expect(result).to.be.equal(true)
    })
    it('Deposit with SOL for client 1', async () => {
        let result: any
        try {
            const prices = await getPriceByQuoteCurrency(Currency.SOL)
            const transaction = await createDepositMiningLiquidityTransaction(
                clientWallet.publicKey,
                minerWannaDepositForSol,
                minerWannaDepositForSol * prices.elwToQuote,
                Currency.SOL
            )
            const txSig = await signAndSendTransaction(transaction, [], clientWallet)
            console.log('Your transaction signature', txSig)
            result = true
        } catch (error: any) {
            result = error.message === ErrorCode.InsufficientBalance
        }
        expect(result).to.be.equal(true)
    })
    it('Deposit with USDC for client 2', async () => {
        let result: any
        try {
            const prices = await getPriceByQuoteCurrency(Currency.USDC)
            const transaction = await createDepositMiningLiquidityTransaction(
                clientWallet2.publicKey,
                minerWannaDepositForUsdc,
                minerWannaDepositForUsdc * prices.elwToQuote,
                Currency.USDC
            )
            const txSig = await signAndSendTransaction(transaction, [], clientWallet2)
            console.log('Your transaction signature', txSig)
            result = true
        } catch (error: any) {
            result = error.message === ErrorCode.InsufficientBalance
        }
        expect(result).to.be.equal(true)
    })
    it('Deposit with SOL for client 2', async () => {
        let result: any
        try {
            const prices = await getPriceByQuoteCurrency(Currency.SOL)
            const transaction = await createDepositMiningLiquidityTransaction(
                clientWallet2.publicKey,
                minerWannaDepositForSol,
                minerWannaDepositForSol * prices.elwToQuote,
                Currency.SOL
            )
            const txSig = await signAndSendTransaction(transaction, [], clientWallet2)
            console.log('Your transaction signature', txSig)
            result = true
        } catch (error: any) {
            result = error.message === ErrorCode.InsufficientBalance
        }
        expect(result).to.be.equal(true)
    })
})
