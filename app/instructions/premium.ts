import ElowenProgram from '../program'
import { getElwMint } from './platform'
import { Signer, Transaction } from '@solana/web3.js'
import { Currencies, Currency, SolanaAddress, VaultAccount } from '../types'
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
    formatNumber,
    getQuoteMint,
    getVaultAccountElwAta,
    getVaultAccountWithElwAta,
    maybeToPublicKey,
    toTokenFormat,
    getDecimalsByCurrency,
    currencyToRustEnum,
    getMultisigVaultPda
} from '../utils'

export async function createBuyPremiumInstruction(
    buyer: SolanaAddress,
    amountToPay: number,
    currency: Exclude<Currencies, Currency.SOL | Currency.WSOL>
) {
    const instruction = await ElowenProgram.methods
        .buyPremium(
            toTokenFormat(amountToPay, getDecimalsByCurrency(currency)),
            currencyToRustEnum(currency)
        )
        .accounts({
            elwMint: await getElwMint(),
            buyer: maybeToPublicKey(buyer),
            signer: ElowenProgram.wallet.publicKey
        })
        .signers([ElowenProgram.wallet.payer])
        .instruction()

    return { instruction, signerWallet: ElowenProgram.wallet.payer as Signer }
}

export async function createBuyPremiumTransaction(
    buyer: SolanaAddress,
    amountToPay: number,
    currency: Exclude<Currencies, Currency.SOL | Currency.WSOL>
) {
    const { instruction, signerWallet } = await createBuyPremiumInstruction(
        buyer,
        amountToPay,
        currency
    )
    const transaction = new Transaction().add(instruction)
    return { transaction, signerWallet }
}

export async function createWithdrawTreasuryElwInstruction(
    receiver: SolanaAddress,
    amount: number
) {
    const [elwMint, treasuryTokenAta] = await Promise.all([
        getElwMint(),
        getVaultAccountElwAta(VaultAccount.Treasury)
    ])
    const receiverTokenAta = getAssociatedTokenAddressSync(elwMint, maybeToPublicKey(receiver))
    return await ElowenProgram.methods
        .withdrawTreasuryElw(toTokenFormat(amount))
        .accounts({
            elwMint,
            treasuryTokenAta,
            signer: getMultisigVaultPda(),
            receiver: maybeToPublicKey(receiver)
        })
        .accountsPartial({
            receiverTokenAta
        })
        .instruction()
}

export async function createWithdrawTreasuryElwTransaction(
    receiver: SolanaAddress,
    amount: number
) {
    return new Transaction().add(await createWithdrawTreasuryElwInstruction(receiver, amount))
}

export async function createWithdrawTreasuryUsdcInstruction(
    receiver: SolanaAddress,
    amount: number
) {
    return await ElowenProgram.methods
        .withdrawTreasuryUsdc(toTokenFormat(amount, 6))
        .accounts({
            signer: getMultisigVaultPda(),
            receiver: maybeToPublicKey(receiver)
        })
        .instruction()
}

export async function createWithdrawTreasuryUsdcTransaction(
    receiver: SolanaAddress,
    amount: number
) {
    return new Transaction().add(await createWithdrawTreasuryUsdcInstruction(receiver, amount))
}

export async function createWithdrawTreasuryFundInstructionByCurrency(
    receiver: SolanaAddress,
    amount: number,
    currency: Currency
) {
    switch (currency) {
        case Currency.USDC:
            return await createWithdrawTreasuryUsdcInstruction(receiver, amount)
        case Currency.ELW:
            return await createWithdrawTreasuryElwInstruction(receiver, amount)
        default:
            throw new Error(`Unsupported currency: ${currency}`)
    }
}

export async function createWithdrawTreasuryFundTransactionByCurrency(
    receiver: SolanaAddress,
    amount: number,
    currency: Currency
) {
    return new Transaction().add(
        await createWithdrawTreasuryFundInstructionByCurrency(receiver, amount, currency)
    )
}

export async function getTreasuryVaultBalances() {
    const { account: treasuryVault, elwAta: treasuryElwAta } = await getVaultAccountWithElwAta(
        VaultAccount.Treasury
    )
    const result = await ElowenProgram.connection.getParsedTokenAccountsByOwner(treasuryVault, {
        programId: TOKEN_PROGRAM_ID
    })
    if (!result.value.length) {
        return null
    }
    const usdcAta = getAssociatedTokenAddressSync(getQuoteMint(Currency.USDC), treasuryVault, true)
    const usdc = result.value.find((item) => item.pubkey.toString() === usdcAta.toString())?.account
        .data.parsed.info.tokenAmount
    const elw = result.value.find((item) => item.pubkey.toString() === treasuryElwAta.toString())
        ?.account.data.parsed.info.tokenAmount
    return {
        elwAmount: elw?.uiAmount || 0,
        usdcAmount: usdc?.uiAmount || 0,
        elwAmountFormatted: formatNumber(elw?.uiAmount || 0),
        usdcAmountFormatted: formatNumber(usdc?.uiAmount || 0)
    }
}
