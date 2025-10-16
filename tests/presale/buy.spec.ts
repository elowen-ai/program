import { expect } from 'chai'
import { clientWallet } from '../common'
import {
    Currency,
    ErrorCode,
    PresaleType,
    createBuyPresaleElwTransaction,
    signAndSendTransaction
} from '../../app'

const buyWithSol = 1_000_000
const buyWithUsdc = 88_500_000

describe('Presale Buy', () => {
    it('Buy with SOL', async () => {
        let result: any
        try {
            const transaction = await createBuyPresaleElwTransaction(
                clientWallet.publicKey,
                buyWithSol,
                Currency.SOL,
                PresaleType.SixMonthsLockup
            )
            const txSig = await signAndSendTransaction(transaction, [], clientWallet)
            console.log('Your transaction signature', txSig)
            result = true
        } catch (error: any) {
            result =
                error.message === ErrorCode.InsufficientBalance ||
                error.message === ErrorCode.ExceedsTheRemainingAmount ||
                error.message === ErrorCode.ExceedsTheMaximumContribution
        }
        expect(result).to.be.equal(true)
    })
    it('Buy with USDC', async () => {
        let result: any
        try {
            const transaction = await createBuyPresaleElwTransaction(
                clientWallet.publicKey,
                buyWithUsdc,
                Currency.USDC,
                PresaleType.ThreeMonthsLockup
            )
            const txSig = await signAndSendTransaction(transaction, [], clientWallet)
            console.log('Your transaction signature', txSig)
            result = true
        } catch (error: any) {
            result =
                error.message === ErrorCode.InsufficientBalance ||
                error.message === ErrorCode.ExceedsTheRemainingAmount ||
                error.message === ErrorCode.ExceedsTheMaximumContribution
        }
        expect(result).to.be.equal(true)
    })
})
