import ElowenProgram from '../program'
import { getElwMint } from './platform'
import { Transaction } from '@solana/web3.js'
import { Currency, SolanaAddress, VaultAccount } from '../types'
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
    formatNumber,
    getMultisigVaultPda,
    getQuoteMint,
    getVaultAccountElwAta,
    getVaultAccountWithElwAta,
    maybeToPublicKey,
    toTokenFormat
} from '../utils'

export async function createWithdrawEdaElwInstruction(receiver: SolanaAddress, amount: number) {
    const [elwMint, edaTokenAta] = await Promise.all([
        getElwMint(),
        getVaultAccountElwAta(VaultAccount.Eda)
    ])
    return await ElowenProgram.methods
        .withdrawEdaElw(toTokenFormat(amount))
        .accounts({
            elwMint,
            edaTokenAta,
            signer: getMultisigVaultPda(),
            receiver: maybeToPublicKey(receiver)
        })
        .accountsPartial({
            receiverTokenAta: getAssociatedTokenAddressSync(elwMint, maybeToPublicKey(receiver))
        })
        .instruction()
}

export async function createWithdrawEdaElwTransaction(receiver: SolanaAddress, amount: number) {
    return new Transaction().add(await createWithdrawEdaElwInstruction(receiver, amount))
}

export async function createWithdrawEdaUsdcInstruction(receiver: SolanaAddress, amount: number) {
    return await ElowenProgram.methods
        .withdrawEdaUsdc(toTokenFormat(amount, 6))
        .accounts({
            signer: getMultisigVaultPda(),
            receiver: maybeToPublicKey(receiver)
        })
        .instruction()
}

export async function createWithdrawEdaUsdcTransaction(receiver: SolanaAddress, amount: number) {
    return new Transaction().add(await createWithdrawEdaUsdcInstruction(receiver, amount))
}

export async function createWithdrawEdaSolInstruction(receiver: SolanaAddress, amount: number) {
    return ElowenProgram.methods
        .withdrawEdaSol(toTokenFormat(amount))
        .accounts({
            signer: getMultisigVaultPda(),
            receiver: maybeToPublicKey(receiver)
        })
        .instruction()
}

export async function createWithdrawEdaSolTransaction(receiver: SolanaAddress, amount: number) {
    return new Transaction().add(await createWithdrawEdaSolInstruction(receiver, amount))
}

export async function createWithdrawEdaFundInstructionByCurrency(
    receiver: SolanaAddress,
    amount: number,
    currency: Currency
) {
    switch (currency) {
        case Currency.SOL:
            return await createWithdrawEdaSolInstruction(receiver, amount)
        case Currency.USDC:
            return await createWithdrawEdaUsdcInstruction(receiver, amount)
        case Currency.ELW:
            return await createWithdrawEdaElwInstruction(receiver, amount)
        default:
            throw new Error(`Unsupported currency: ${currency}`)
    }
}

export async function createWithdrawEdaFundTransactionByCurrency(
    receiver: SolanaAddress,
    amount: number,
    currency: Currency
) {
    return new Transaction().add(
        await createWithdrawEdaFundInstructionByCurrency(receiver, amount, currency)
    )
}

export async function getEdaVaultBalances() {
    const { account: edaVault, elwAta: edaElwAta } = await getVaultAccountWithElwAta(
        VaultAccount.Eda
    )
    const result = await ElowenProgram.connection.getParsedTokenAccountsByOwner(edaVault, {
        programId: TOKEN_PROGRAM_ID
    })
    if (!result.value.length) {
        return null
    }
    const solAta = getAssociatedTokenAddressSync(getQuoteMint(Currency.SOL), edaVault, true)
    const usdcAta = getAssociatedTokenAddressSync(getQuoteMint(Currency.USDC), edaVault, true)
    const sol = result.value.find((item) => item.pubkey.toString() === solAta.toString())?.account
        .data.parsed.info.tokenAmount
    const usdc = result.value.find((item) => item.pubkey.toString() === usdcAta.toString())?.account
        .data.parsed.info.tokenAmount
    const elw = result.value.find((item) => item.pubkey.toString() === edaElwAta.toString())
        ?.account.data.parsed.info.tokenAmount
    return {
        solAmount: sol?.uiAmount || 0,
        elwAmount: elw?.uiAmount || 0,
        usdcAmount: usdc?.uiAmount || 0,
        solAmountFormatted: formatNumber(sol?.uiAmount || 0),
        elwAmountFormatted: formatNumber(elw?.uiAmount || 0),
        usdcAmountFormatted: formatNumber(usdc?.uiAmount || 0)
    }
}
