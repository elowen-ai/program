import { expect } from 'chai'
import { clientWallet, clientWallet2 } from '../common'
import { Wallet } from '@coral-xyz/anchor'
import ElowenProgram, {
    ErrorCode,
    createProposalApproveTransaction,
    createProposalCreateTransaction,
    createWithdrawPlatformElwTransaction,
    signAndSendTransaction
} from '../../app'

describe('Platform ELW Withdraw', () => {
    afterEach(() => {
        // @ts-ignore - for test
        ElowenProgram._provider.wallet = Wallet.local()
    })
    it('Withdraw elw with wrong signer', async () => {
        let result: any
        try {
            // @ts-ignore - for test
            ElowenProgram._provider.wallet = clientWallet
            const transaction = await createWithdrawPlatformElwTransaction(
                clientWallet.publicKey, // just receiver
                1
            )
            const txSig = await signAndSendTransaction(transaction, [], clientWallet)
            console.log('Your transaction signature', txSig)
        } catch (error: any) {
            result = error.message.includes('Signature verification failed')
        }
        expect(result).to.be.equal(true)
    })

    it('Withdraw elw with correct signer', async () => {
        let result: any
        try {
            const { transaction, transactionIndex } = await createProposalCreateTransaction(
                'test platform elw withdraw',
                ElowenProgram.wallet.publicKey,
                await createWithdrawPlatformElwTransaction(
                    clientWallet.publicKey, // just receiver
                    20
                )
            )
            await signAndSendTransaction(transaction)
            const transaction1 = await createProposalApproveTransaction(
                clientWallet.publicKey,
                transactionIndex
            )
            const transaction2 = await createProposalApproveTransaction(
                clientWallet2.publicKey,
                transactionIndex,
                true // execute transaction
            )
            await signAndSendTransaction(transaction1, [], clientWallet)
            const txSig = await signAndSendTransaction(transaction2, [], clientWallet2)
            console.log('Your transaction signature', txSig)
            result = true
        } catch (error: any) {
            result = error.message === ErrorCode.NotEnoughBalanceInVault
        }
        expect(result).to.be.equal(true)
    })
})
