import ElowenProgram from '../program'
import { Transaction } from '@solana/web3.js'
import { IdlAccounts } from '@coral-xyz/anchor'
import { getMiningStateAddress } from './liquidity'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import { Currency, IDLType, SolanaAddress, VaultAccount } from '../types'
import {
    formatNumber,
    getMultisigVaultPda,
    getTokenAccountInfo,
    getVaultAccount,
    getVaultAccountElwAta,
    maybeToPublicKey,
    toTokenFormat
} from '../utils'

let platformAccount: IdlAccounts<IDLType>['platformAccount'] | null = null

export async function createWithdrawPlatformElwInstruction(
    receiver: SolanaAddress,
    amount: number
) {
    const elwMint = await getElwMint()
    return await ElowenProgram.methods
        .withdrawPlatformElw(toTokenFormat(amount))
        .accounts({
            elwMint,
            signer: getMultisigVaultPda(),
            receiver: maybeToPublicKey(receiver),
            solState: getMiningStateAddress(Currency.SOL),
            usdcState: getMiningStateAddress(Currency.USDC)
        })
        .accountsPartial({
            receiverTokenAta: getAssociatedTokenAddressSync(elwMint, maybeToPublicKey(receiver))
        })
        .instruction()
}

export async function createWithdrawPlatformElwTransaction(
    receiver: SolanaAddress,
    amount: number
) {
    return new Transaction().add(await createWithdrawPlatformElwInstruction(receiver, amount))
}

export async function createBurnPlatformElwInstruction(amount: number) {
    return ElowenProgram.methods
        .burnPlatformElw(toTokenFormat(amount))
        .accounts({
            elwMint: await getElwMint(),
            signer: ElowenProgram.wallet.publicKey,
            solState: getMiningStateAddress(Currency.SOL),
            usdcState: getMiningStateAddress(Currency.USDC)
        })
        .instruction()
}

export async function createBurnPlatformElwTransaction(amount: number) {
    return new Transaction().add(await createBurnPlatformElwInstruction(amount))
}

export async function getElwMint() {
    if (!platformAccount) {
        platformAccount = await ElowenProgram.accounts.platformAccount.fetchNullable(
            getVaultAccount(VaultAccount.Platform)
        )
        if (!platformAccount) {
            throw new Error('Platform account not found')
        }
    }
    return platformAccount.elwMint
}

export async function getPlatformVaultElwBalance() {
    const result = await getTokenAccountInfo(await getVaultAccountElwAta(VaultAccount.Platform))
    const platformElw = result?.parsed.info.tokenAmount || { uiAmount: 0 }
    return {
        amount: platformElw.uiAmount,
        amountFormatted: formatNumber(platformElw.uiAmount)
    }
}
