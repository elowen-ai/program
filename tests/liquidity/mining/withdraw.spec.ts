import { expect } from 'chai'
import { clientWallet, clientWallet2 } from '../../common'
import {
    Currency,
    ErrorCode,
    createWithdrawMiningLiquidityTransaction,
    getPriceByQuoteCurrency,
    signAndSendTransaction
} from '../../../app'

const minerWannaWithdrawForSol = 5_000
const minerWannaWithdrawForUsdc = 25_000

describe('Liquidity Mining Withdraw', () => {
    it('Withdraw with USDC for client 1', async () => {
        let result: any
        try {
            const prices = await getPriceByQuoteCurrency(Currency.USDC)
            const transaction = await createWithdrawMiningLiquidityTransaction(
                clientWallet.publicKey,
                minerWannaWithdrawForUsdc,
                minerWannaWithdrawForUsdc * prices.elwToQuote,
                Currency.USDC,
                1
            )
            const txSig = await signAndSendTransaction(transaction, [], clientWallet)
            console.log('Your transaction signature', txSig)
            result = true
        } catch (error: any) {
            result = error.message === ErrorCode.InsufficientBalance
        }
        expect(result).to.be.equal(true)
    })
    it('Withdraw with SOL for client 1', async () => {
        let result: any
        try {
            const prices = await getPriceByQuoteCurrency(Currency.SOL)
            const transaction = await createWithdrawMiningLiquidityTransaction(
                clientWallet.publicKey,
                minerWannaWithdrawForSol,
                minerWannaWithdrawForSol * prices.elwToQuote,
                Currency.SOL,
                1
            )
            const txSig = await signAndSendTransaction(transaction, [], clientWallet)
            console.log('Your transaction signature', txSig)
            result = true
        } catch (error: any) {
            result = error.message === ErrorCode.InsufficientBalance
        }
        expect(result).to.be.equal(true)
    })
    it('Withdraw with USDC for client 2', async () => {
        let result: any
        try {
            const prices = await getPriceByQuoteCurrency(Currency.USDC)
            const transaction = await createWithdrawMiningLiquidityTransaction(
                clientWallet2.publicKey,
                minerWannaWithdrawForUsdc,
                minerWannaWithdrawForUsdc * prices.elwToQuote,
                Currency.USDC,
                1
            )
            const txSig = await signAndSendTransaction(transaction, [], clientWallet2)
            console.log('Your transaction signature', txSig)
            result = true
        } catch (error: any) {
            result = error.message === ErrorCode.InsufficientBalance
        }
        expect(result).to.be.equal(true)
    })
    it('Withdraw with SOL for client 2', async () => {
        let result: any
        try {
            const prices = await getPriceByQuoteCurrency(Currency.SOL)
            const transaction = await createWithdrawMiningLiquidityTransaction(
                clientWallet2.publicKey,
                minerWannaWithdrawForSol,
                minerWannaWithdrawForSol * prices.elwToQuote,
                Currency.SOL,
                1
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
