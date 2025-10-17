import { expect } from 'chai'
import { clientWallet } from '../common'
import { Wallet } from '@coral-xyz/anchor'
import ElowenProgram, {
    Currency,
    ErrorCode,
    createBuyPremiumTransaction,
    signAndSendTransaction
} from '../../app'

describe('Premium Buy', () => {
    afterEach(() => {
        // @ts-ignore - for test
        ElowenProgram._provider.wallet = Wallet.local()
    })
    it('Buy with USDC without partial sign', async () => {
        try {
            // @ts-ignore - for test
            ElowenProgram._provider.wallet = clientWallet
            const { transaction } = await createBuyPremiumTransaction(
                clientWallet.publicKey,
                10,
                Currency.USDC
            )
            const txSig = await signAndSendTransaction(transaction, [], clientWallet)
            console.log('Your transaction signature', txSig)
        } catch (error: any) {
            expect(error.message).to.be.equal(ErrorCode.Unauthorized)
        }
    })

    it('Buy with USDC with partial sign', async () => {
        const { transaction, signerWallet } = await createBuyPremiumTransaction(
            clientWallet.publicKey,
            10,
            Currency.USDC
        )
        const txSig = await signAndSendTransaction(transaction, [signerWallet], clientWallet)
        console.log('Your transaction signature', txSig)
    })

    it('Buy with ELW with partial sign', async () => {
        let result: any
        try {
            const { transaction, signerWallet } = await createBuyPremiumTransaction(
                clientWallet.publicKey,
                10,
                Currency.ELW
            )
            const txSig = await signAndSendTransaction(transaction, [signerWallet], clientWallet)
            console.log('Your transaction signature', txSig)
            result = true
        } catch (error: any) {
            result = error.message === ErrorCode.InsufficientBalance
        }
        expect(result).to.be.true
    })
})
