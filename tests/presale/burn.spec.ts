import { expect } from 'chai'
import { clientWallet } from '../common'
import { Wallet } from '@coral-xyz/anchor'
import ElowenProgram, {
    ErrorCode,
    createBurnUnsoldElwTransaction,
    signAndSendTransaction
} from '../../app'

describe('Burn', () => {
    afterEach(() => {
        // @ts-ignore - for test
        ElowenProgram._provider.wallet = Wallet.local()
    })
    it('Burn unsold tokens with wrong signer', async () => {
        try {
            // @ts-ignore - for test
            ElowenProgram._provider.wallet = clientWallet
            const transaction = await createBurnUnsoldElwTransaction()
            const txSig = await signAndSendTransaction(transaction, [], clientWallet)
            console.log('Your transaction signature', txSig)
        } catch (error: any) {
            expect(error.message).to.be.equal(ErrorCode.Unauthorized)
        }
    })

    it('Burn unsold tokens with correct signer', async () => {
        let result: any
        try {
            const transaction = await createBurnUnsoldElwTransaction()
            const txSig = await signAndSendTransaction(transaction)
            console.log('Your transaction signature', txSig)
            result = true
        } catch (error: any) {
            result =
                error.message === ErrorCode.CannotBurnUntilPresaleDone ||
                error.message === ErrorCode.UnsoldTokensAlreadyBurned ||
                error.message === ErrorCode.NotEnoughBalanceInVault ||
                error.message === ErrorCode.AllTokensSold
        }
        expect(result).to.be.equal(true)
    })
})
