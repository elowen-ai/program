import { expect } from 'chai'
import { clientWallet, clientWallet2 } from '../common'
import ElowenProgram, {
    Currency,
    ErrorCode,
    createProposalApproveTransaction,
    createProposalCreateTransaction,
    createWithdrawTreasuryFundTransactionByCurrency,
    signAndSendTransaction
} from '../../app'

describe('Treasury', () => {
    it('Withdraw ELW', async () => {
        let result: any
        try {
            const { transaction, transactionIndex } = await createProposalCreateTransaction(
                'test treasury elw withdraw',
                ElowenProgram.wallet.publicKey,
                await createWithdrawTreasuryFundTransactionByCurrency(
                    clientWallet.publicKey, // just receiver
                    1,
                    Currency.ELW
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
    it('Withdraw USDC', async () => {
        let result: any
        try {
            const { transaction, transactionIndex } = await createProposalCreateTransaction(
                'test treasury usdc withdraw',
                ElowenProgram.wallet.publicKey,
                await createWithdrawTreasuryFundTransactionByCurrency(
                    clientWallet.publicKey, // just receiver
                    1,
                    Currency.USDC
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
