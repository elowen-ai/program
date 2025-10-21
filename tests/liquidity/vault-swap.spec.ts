import { clientWallet } from '../common'
import { SendTransactionError } from '@solana/web3.js'
import ElowenProgram, {
    Currency,
    ErrorCode,
    SwapDirection,
    VaultAccount,
    createVaultSwapCpmmTransaction,
    signAndSendTransaction
} from '../../app'
import { expect } from 'chai'
import { Wallet } from '@coral-xyz/anchor'

describe('Liquidity Vault Swap', () => {
    it('Swap Input ELW/WSOL wrong signer', async () => {
        afterEach(() => {
            // @ts-ignore - for test
            ElowenProgram._provider.wallet = Wallet.local()
        })
        try {
            // @ts-ignore - for test
            ElowenProgram._provider.wallet = clientWallet
            const transaction = await createVaultSwapCpmmTransaction(
                VaultAccount.Liquidity,
                Currency.ELW,
                Currency.WSOL,
                1000,
                SwapDirection.Input
            )
            await signAndSendTransaction(transaction, [], clientWallet)
        } catch (error: any) {
            expect(error.message).to.be.equal(ErrorCode.Unauthorized)
        }
    })
    it('Swap Input ELW/WSOL Liquidity', async () => {
        try {
            const transaction = await createVaultSwapCpmmTransaction(
                VaultAccount.Liquidity,
                Currency.ELW,
                Currency.WSOL,
                1000,
                SwapDirection.Input
            )
            const txSig = await signAndSendTransaction(transaction)
            console.log('ELW/WSOL Input transaction signature', txSig)
        } catch (error) {
            if (error instanceof SendTransactionError) {
                console.log(JSON.stringify(error.logs, null, 2))
            } else {
                console.log(error)
            }
        }
    })
    it('Swap Output ELW/WSOL Liquidity', async () => {
        try {
            const transaction = await createVaultSwapCpmmTransaction(
                VaultAccount.Liquidity,
                Currency.ELW,
                Currency.WSOL,
                0.01,
                SwapDirection.Output
            )
            const txSig = await signAndSendTransaction(transaction)
            console.log('ELW/WSOL Output transaction signature', txSig)
        } catch (error) {
            if (error instanceof SendTransactionError) {
                console.log(JSON.stringify(error.logs, null, 2))
            } else {
                console.log(error)
            }
        }
    })
    it('Swap Input SOL/ELW Eda', async () => {
        try {
            const transaction = await createVaultSwapCpmmTransaction(
                VaultAccount.Eda,
                Currency.SOL,
                Currency.ELW,
                0.01,
                SwapDirection.Input
            )
            const txSig = await signAndSendTransaction(transaction)
            console.log('ELW/SOL Input transaction signature', txSig)
        } catch (error) {
            if (error instanceof SendTransactionError) {
                console.log(JSON.stringify(error.logs, null, 2))
            } else {
                console.log(error)
            }
        }
    })
    it('Swap Output ELW/SOL Eda', async () => {
        try {
            const transaction = await createVaultSwapCpmmTransaction(
                VaultAccount.Eda,
                Currency.ELW,
                Currency.SOL,
                0.01,
                SwapDirection.Output
            )
            const txSig = await signAndSendTransaction(transaction)
            console.log('ELW/SOL Output transaction signature', txSig)
        } catch (error) {
            if (error instanceof SendTransactionError) {
                console.log(JSON.stringify(error.logs, null, 2))
            } else {
                console.log(error)
            }
        }
    })
    it('Swap Input USDC/ELW Treasury', async () => {
        try {
            const transaction = await createVaultSwapCpmmTransaction(
                VaultAccount.Treasury,
                Currency.USDC,
                Currency.ELW,
                1,
                SwapDirection.Input
            )
            const txSig = await signAndSendTransaction(transaction)
            console.log('USDC/ELW Input transaction signature', txSig)
        } catch (error) {
            if (error instanceof SendTransactionError) {
                console.log(JSON.stringify(error.logs, null, 2))
            } else {
                console.log(error)
            }
        }
    })
    it('Swap Output USDC/ELW Treasury', async () => {
        try {
            const transaction = await createVaultSwapCpmmTransaction(
                VaultAccount.Treasury,
                Currency.USDC,
                Currency.ELW,
                10,
                SwapDirection.Output
            )
            const txSig = await signAndSendTransaction(transaction)
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
