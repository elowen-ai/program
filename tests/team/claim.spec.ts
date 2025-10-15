import { expect } from 'chai'
import { clientWallet, clientWallet2, emptyWallet } from '../common'
import ElowenProgram, { ErrorCode, createClaimTeamMemberElwTransaction, signAndSendTransaction } from '../../app'
import { SendTransactionError } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'

describe('Member Claim Token', () => {
    it('Claim team elw as a wrong wallet', async () => {
        try {
            const transaction = await createClaimTeamMemberElwTransaction(emptyWallet.publicKey)
            const txSig = await signAndSendTransaction(transaction, [], emptyWallet)
            console.log('Your transaction signature', txSig)
        } catch (error: any) {
            expect(error.message).to.be.equal(ErrorCode.Unauthorized)
        }
    })

    it('Claim team elw as a team member 1', async () => {
        let result: any
        try {
            const transaction = await createClaimTeamMemberElwTransaction(
                ElowenProgram.wallet.publicKey as PublicKey
            )
            const txSig = await signAndSendTransaction(transaction)
            console.log('Your transaction signature', txSig)
            result = true
        } catch (error: any) {
            if (error instanceof SendTransactionError) {
                console.log(error.logs)
            }
            result =
                error.message === ErrorCode.PeriodNotReached ||
                error.message === ErrorCode.NotEnoughBalanceInVault ||
                error.message === ErrorCode.AlreadyClaimedForThisPeriod
        }
        expect(result).to.be.equal(true)
    })

    it('Claim team elw as a team member 2', async () => {
        let result: any
        try {
            const transaction = await createClaimTeamMemberElwTransaction(clientWallet.publicKey)
            const txSig = await signAndSendTransaction(transaction, [], clientWallet)
            console.log('Your transaction signature', txSig)
            result = true
        } catch (error: any) {
            if (error instanceof SendTransactionError) {
                console.log(error.logs)
            }
            result =
                error.message === ErrorCode.PeriodNotReached ||
                error.message === ErrorCode.NotEnoughBalanceInVault ||
                error.message === ErrorCode.AlreadyClaimedForThisPeriod
        }
        expect(result).to.be.equal(true)
    })

    it('Claim team elw as a team member 3', async () => {
        let result: any
        try {
            const transaction = await createClaimTeamMemberElwTransaction(clientWallet2.publicKey)
            const txSig = await signAndSendTransaction(transaction, [], clientWallet2)
            console.log('Your transaction signature', txSig)
            result = true
        } catch (error: any) {
            if (error instanceof SendTransactionError) {
                console.log(error.logs)
            }
            result =
                error.message === ErrorCode.PeriodNotReached ||
                error.message === ErrorCode.NotEnoughBalanceInVault ||
                error.message === ErrorCode.AlreadyClaimedForThisPeriod
        }
        expect(result).to.be.equal(true)
    })
})
