import { clientWallet } from '../common'
import { SendTransactionError } from '@solana/web3.js'
import ElowenProgram, {
    Currency,
    SwapDirection,
    createSwapCpmmTransaction,
    signAndSendTransaction
} from '../../app'

describe('Liquidity Swap SOL', () => {
    before(() => {
        // @ts-ignore - for test
        ElowenProgram.provider.wallet = clientWallet
    })
    it('Swap Input ELW/SOL', async () => {
        try {
            const transaction = await createSwapCpmmTransaction(
                clientWallet.publicKey,
                Currency.ELW,
                Currency.SOL,
                1000,
                SwapDirection.Input
            )
            const txSig = await signAndSendTransaction(transaction, [], clientWallet)
            console.log('ELW/SOL Input transaction signature', txSig)
        } catch (error) {
            if (error instanceof SendTransactionError) {
                console.log(JSON.stringify(error.logs, null, 2))
            } else {
                console.log(error)
            }
        }
    })
    it('Swap Output ELW/SOL', async () => {
        try {
            const transaction = await createSwapCpmmTransaction(
                clientWallet.publicKey,
                Currency.ELW,
                Currency.SOL,
                0.01,
                SwapDirection.Output
            )
            const txSig = await signAndSendTransaction(transaction, [], clientWallet)
            console.log('ELW/SOL Output transaction signature', txSig)
        } catch (error) {
            if (error instanceof SendTransactionError) {
                console.log(JSON.stringify(error.logs, null, 2))
            } else {
                console.log(error)
            }
        }
    })
    it('Swap Input SOL/ELW', async () => {
        try {
            const transaction = await createSwapCpmmTransaction(
                clientWallet.publicKey,
                Currency.SOL,
                Currency.ELW,
                0.01,
                SwapDirection.Input
            )
            const txSig = await signAndSendTransaction(transaction, [], clientWallet)
            console.log('SOL/ELW Input transaction signature', txSig)
        } catch (error) {
            if (error instanceof SendTransactionError) {
                console.log(JSON.stringify(error.logs, null, 2))
            } else {
                console.log(error)
            }
        }
    })
    it('Swap Output SOL/ELW', async () => {
        try {
            const transaction = await createSwapCpmmTransaction(
                clientWallet.publicKey,
                Currency.SOL,
                Currency.ELW,
                1000,
                SwapDirection.Output
            )
            const txSig = await signAndSendTransaction(transaction, [], clientWallet)
            console.log('SOL/ELW Output transaction signature', txSig)
        } catch (error) {
            if (error instanceof SendTransactionError) {
                console.log(JSON.stringify(error.logs, null, 2))
            } else {
                console.log(error)
            }
        }
    })
})
