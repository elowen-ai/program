import { expect } from 'chai'
import { clientWallet, clientWallet2 } from '../common'
import ElowenProgram, {
    Currency,
    ErrorCode,
    createProposalApproveTransaction,
    createProposalCreateTransaction,
    createWithdrawEdaFundTransactionByCurrency,
    signAndSendTransaction
} from '../../app'

describe('EDA', () => {
    it('Withdraw ELW', async () => {
        let result: any
        try {
            const { transaction, transactionIndex } = await createProposalCreateTransaction(
                'test eda elw withdraw',
                ElowenProgram.wallet.publicKey,
                await createWithdrawEdaFundTransactionByCurrency(
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
        } catch (error) {
            console.error('Error withdrawing ELW:', error)
            result = error.message === ErrorCode.NotEnoughBalanceInVault
        }
        expect(result).to.be.equal(true)
    })
    it('Withdraw USDC', async () => {
        let result: any
        try {
            const { transaction, transactionIndex } = await createProposalCreateTransaction(
                'test eda usdc withdraw',
                ElowenProgram.wallet.publicKey,
                await createWithdrawEdaFundTransactionByCurrency(
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
        } catch (error) {
            result = error.message === ErrorCode.NotEnoughBalanceInVault
        }
        expect(result).to.be.equal(true)
    })
    it('Withdraw SOL', async () => {
        let result: any
        try {
            const { transaction, transactionIndex } = await createProposalCreateTransaction(
                'test eda sol withdraw',
                ElowenProgram.wallet.publicKey,
                await createWithdrawEdaFundTransactionByCurrency(
                    clientWallet.publicKey, // just receiver
                    0.01,
                    Currency.SOL
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
        } catch (error) {
            result = error.message === ErrorCode.NotEnoughBalanceInVault
        }
        expect(result).to.be.equal(true)
    })
})
