import { expect } from 'chai'
import { clientWallet } from '../common'
import { Wallet } from '@coral-xyz/anchor'
import ElowenProgram, {
    ErrorCode,
    createBurnPlatformElwTransaction,
    signAndSendTransaction
} from '../../app'

describe('Platform ELW Burn', () => {
    afterEach(() => {
        // @ts-ignore - for test
        ElowenProgram._provider.wallet = Wallet.local()
    })
    it('Burn elw with wrong signer', async () => {
        let result: any
        try {
            // @ts-ignore - for test
            ElowenProgram._provider.wallet = clientWallet
            const transaction = await createBurnPlatformElwTransaction(1)
            const txSig = await signAndSendTransaction(transaction, [], clientWallet)
            console.log('Your transaction signature', txSig)
        } catch (error: any) {
            result = error.message === ErrorCode.Unauthorized
        }
        expect(result).to.be.equal(true)
    })

    it('Burn elw with correct signer', async () => {
        let result: any
        try {
            const transaction = await createBurnPlatformElwTransaction(1)
            const txSig = await signAndSendTransaction(transaction)
            console.log('Your transaction signature', txSig)
            result = true
        } catch (error: any) {
            result = error.message === ErrorCode.NotEnoughBalanceInVault
        }
        expect(result).to.be.equal(true)
    })
})
