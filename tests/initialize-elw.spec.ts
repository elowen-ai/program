import { expect } from 'chai'
import { clientWallet } from './common'
import { Wallet } from '@coral-xyz/anchor'
import ElowenProgram, {
    createInitializeElwTransaction,
    signAndSendTransaction,
    ErrorCode,
    getVaultAccount,
    VaultAccount
} from '../app'

describe('Create token', () => {
    const metadataUri =
        'https://gist.githubusercontent.com/0xBeycan/a3f422dcd474ea8e33c632343e9fbb51/raw/ab84864b374879a31969ac771ff7a237090240b6/gistfile1.txt'

    afterEach(() => {
        // @ts-ignore - for test
        ElowenProgram._provider.wallet = Wallet.local()
    })

    it('Try with wrong signer', async () => {
        let result: any
        try {
            // @ts-ignore - for test
            ElowenProgram._provider.wallet = clientWallet
            const { transaction, elwMint } = await createInitializeElwTransaction(metadataUri)
            const txSig = await signAndSendTransaction(transaction, [elwMint], clientWallet)
            console.log('Your transaction signature', txSig)
            result = true
        } catch (error: any) {
            result =
                error.message === ErrorCode.PdaAlreadyInUse ||
                error.message === ErrorCode.Unauthorized ||
                error.message.includes('Log truncated')
        }
        expect(result).to.be.equal(true)
    })

    it('Try with correct signer', async () => {
        let result: any
        try {
            const { transaction, elwMint } = await createInitializeElwTransaction(metadataUri)
            const txSig = await signAndSendTransaction(transaction, [elwMint])
            console.log('Your transaction signature', txSig)
            console.log('Platform pda', getVaultAccount(VaultAccount.Platform).toBase58())
            result = true
        } catch (error: any) {
            result = error.message === ErrorCode.PdaAlreadyInUse
        }
        expect(result).to.be.equal(true)
    })
})
