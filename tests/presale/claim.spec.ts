import { expect } from 'chai'
import { clientWallet } from '../common'
import {
    ErrorCode,
    PresaleType,
    createClaimPresaleElwTransaction,
    signAndSendTransaction
} from '../../app'

describe('Presale Claim', () => {
    it('Claim 3 months lockup', async () => {
        let result: any
        try {
            const transaction = await createClaimPresaleElwTransaction(
                clientWallet.publicKey,
                PresaleType.ThreeMonthsLockup
            )
            const txSig = await signAndSendTransaction(transaction, [], clientWallet)
            console.log('Your transaction signature', txSig)
            result = true
        } catch (error: any) {
            result =
                error.message === ErrorCode.PresaleIsNotEnded ||
                error.message === ErrorCode.TokensAlreadyClaimed
        }
        expect(result).to.be.equal(true)
    })
    it('Claim 6 months lockup', async () => {
        let result: any
        try {
            const transaction = await createClaimPresaleElwTransaction(
                clientWallet.publicKey,
                PresaleType.SixMonthsLockup
            )
            const txSig = await signAndSendTransaction(transaction, [], clientWallet)
            console.log('Your transaction signature', txSig)
            result = true
        } catch (error: any) {
            result =
                error.message === ErrorCode.PresaleIsNotEnded ||
                error.message === ErrorCode.TokensAlreadyClaimed
        }
        expect(result).to.be.equal(true)
    })
})
