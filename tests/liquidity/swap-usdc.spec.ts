import { clientWallet } from '../common'
import { SendTransactionError } from '@solana/web3.js'
import ElowenProgram, {
    Currency,
    SwapDirection,
    createSwapCpmmTransaction,
    signAndSendTransaction
} from '../../app'

describe('Liquidity Swap USDC', () => {
    before(() => {
        // @ts-ignore - for test
        ElowenProgram.provider.wallet = clientWallet
    })
    it('Swap Input ELW/USDC', async () => {
        try {
            const transaction = await createSwapCpmmTransaction(
                clientWallet.publicKey,
                Currency.ELW,
                Currency.USDC,
                10_000,
                SwapDirection.Input
            )
            const txSig = await signAndSendTransaction(transaction, [], clientWallet)
            console.log('ELW/USDC Input transaction signature', txSig)
        } catch (error) {
            if (error instanceof SendTransactionError) {
                console.log(JSON.stringify(error.logs, null, 2))
            } else {
                console.log(error)
            }
        }
    })
    it('Swap Output ELW/USDC', async () => {
        try {
            const transaction = await createSwapCpmmTransaction(
                clientWallet.publicKey,
                Currency.ELW,
                Currency.USDC,
                100,
                SwapDirection.Output
            )
            const txSig = await signAndSendTransaction(transaction, [], clientWallet)
            console.log('ELW/USDC Output transaction signature', txSig)
        } catch (error) {
            if (error instanceof SendTransactionError) {
                console.log(JSON.stringify(error.logs, null, 2))
            } else {
                console.log(error)
            }
        }
    })
    it('Swap Input USDC/ELW', async () => {
        try {
            const transaction = await createSwapCpmmTransaction(
                clientWallet.publicKey,
                Currency.USDC,
                Currency.ELW,
                100,
                SwapDirection.Input
            )
            const txSig = await signAndSendTransaction(transaction, [], clientWallet)
            console.log('USDC/ELW Input transaction signature', txSig)
        } catch (error) {
            if (error instanceof SendTransactionError) {
                console.log(JSON.stringify(error.logs, null, 2))
            } else {
                console.log(error)
            }
        }
    })
    it('Swap Output USDC/ELW', async () => {
        try {
            const transaction = await createSwapCpmmTransaction(
                clientWallet.publicKey,
                Currency.USDC,
                Currency.ELW,
                10_000,
                SwapDirection.Output
            )
            const txSig = await signAndSendTransaction(transaction, [], clientWallet)
            console.log('USDC/ELW Output transaction signature', txSig)
        } catch (error) {
            if (error instanceof SendTransactionError) {
                console.log(JSON.stringify(error.logs, null, 2))
            } else {
                console.log(error)
            }
        }
    })
})
