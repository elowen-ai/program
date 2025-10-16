import ElowenProgram from '../program'
import { getElwMint } from './platform'
import { Wallet } from '@coral-xyz/anchor'
import { PublicKey, Transaction } from '@solana/web3.js'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import { PythSolanaReceiver } from '@pythnetwork/pyth-solana-receiver'
import { PresaleType, PresaleTypeMap, QuoteCurrency, SolanaAddress, VaultAccount } from '../types'
import {
    maybeToPublicKey,
    currencyToRustEnum,
    getVaultAccountElwAta,
    presaleTypeToRustEnum,
    toTokenFormat,
    formatNumber,
    findPresaleTypeFromNumber,
    fromTokenFormat,
    getTokenAccountInfo
} from '../utils'

function findPresalePurchaseAccount(receiver: SolanaAddress, presaleType: PresaleType) {
    const [pda, _bump] = PublicKey.findProgramAddressSync(
        [
            Buffer.from('presale'),
            maybeToPublicKey(receiver).toBuffer(),
            Buffer.from([PresaleTypeMap[presaleType]])
        ],
        ElowenProgram.ID
    )
    return pda
}

export async function createBuyPresaleElwInstruction(
    receiver: SolanaAddress,
    amountToBuy: number,
    currency: QuoteCurrency,
    presaleType: PresaleType
) {
    const [elwMint, presaleTokenAta] = await Promise.all([
        getElwMint(),
        getVaultAccountElwAta(VaultAccount.Presale)
    ])
    const pythProgram = new PythSolanaReceiver({
        connection: ElowenProgram.connection,
        wallet: ElowenProgram.wallet as Wallet
    })
    return ElowenProgram.methods
        .buyPresaleElw(
            presaleTypeToRustEnum(presaleType),
            toTokenFormat(amountToBuy),
            currencyToRustEnum(currency)
        )
        .accounts({
            elwMint,
            presaleTokenAta,
            receiver: maybeToPublicKey(receiver),
            receiverPurchaseAccount: findPresalePurchaseAccount(receiver, presaleType),
            priceUpdate: pythProgram.getPriceFeedAccountAddress(
                0,
                'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d'
            )
        })
        .instruction()
}

export async function createBuyPresaleElwTransaction(
    receiver: SolanaAddress,
    amountToBuy: number,
    currency: QuoteCurrency,
    presaleType: PresaleType
) {
    return new Transaction().add(
        await createBuyPresaleElwInstruction(receiver, amountToBuy, currency, presaleType)
    )
}

export async function createClaimPresaleElwInstruction(
    receiver: SolanaAddress,
    presaleType: PresaleType
) {
    const [elwMint, presaleTokenAta] = await Promise.all([
        getElwMint(),
        getVaultAccountElwAta(VaultAccount.Presale)
    ])
    return ElowenProgram.methods
        .claimPresaleElw(presaleTypeToRustEnum(presaleType))
        .accounts({
            elwMint,
            presaleTokenAta,
            receiver: maybeToPublicKey(receiver),
            receiverPurchaseAccount: findPresalePurchaseAccount(receiver, presaleType)
        })
        .accountsPartial({
            receiverTokenAta: getAssociatedTokenAddressSync(elwMint, maybeToPublicKey(receiver))
        })
        .instruction()
}

export async function createClaimPresaleElwTransaction(
    receiver: SolanaAddress,
    presaleType: PresaleType
) {
    return new Transaction().add(await createClaimPresaleElwInstruction(receiver, presaleType))
}

export async function createBurnUnsoldElwInstruction() {
    const [elwMint, presaleTokenAta] = await Promise.all([
        getElwMint(),
        getVaultAccountElwAta(VaultAccount.Presale)
    ])
    return ElowenProgram.methods
        .burnUnsoldPresaleElw()
        .accounts({
            elwMint
        })
        .accountsPartial({
            presaleTokenAta,
            signer: ElowenProgram.wallet.publicKey
        })
        .instruction()
}

export async function createBurnUnsoldElwTransaction() {
    return new Transaction().add(await createBurnUnsoldElwInstruction())
}

export async function getPresalePurchaseAccountData(
    receiver: SolanaAddress,
    presaleType: PresaleType
) {
    const result = await ElowenProgram.accounts.purchaseAccount.fetchNullable(
        findPresalePurchaseAccount(receiver, presaleType)
    )
    if (!result) {
        return null
    }
    return {
        claimed: result.claimed,
        presaleType: result.presaleType,
        receiver: maybeToPublicKey(receiver),
        amount: fromTokenFormat(result.amount),
        unlockTime: result.unlockTime.toNumber(),
        amountFormatted: formatNumber(fromTokenFormat(result.amount)),
        presaleTypeFormatted: findPresaleTypeFromNumber(result.presaleType),
        unlockTimeFormatted: new Date(result.unlockTime.toNumber() * 1000).toLocaleString()
    }
}

export async function getPresaleSummaryAccountData() {
    const result = await ElowenProgram.accounts.summaryAccount.fetchNullable(
        PublicKey.findProgramAddressSync([Buffer.from('presale_summary')], ElowenProgram.ID)[0]
    )
    if (!result) {
        return null
    }
    const solRaised = fromTokenFormat(result.solRaised)
    const tokenSold = fromTokenFormat(result.tokenSold)
    const totalAmount = fromTokenFormat(result.totalAmount)
    const usdcRaised = fromTokenFormat(result.usdcRaised, 6)
    const tokenSoldForSol = fromTokenFormat(result.tokenSoldForSol)
    const tokenSoldForUsdc = fromTokenFormat(result.tokenSoldForUsdc)
    const solSentToEda = fromTokenFormat(result.solSentToEda)
    const usdcSentToEda = fromTokenFormat(result.usdcSentToEda, 6)
    const solSentToLiquidity = fromTokenFormat(result.solSentToLiquidity)
    const usdcSentToLiquidity = fromTokenFormat(result.usdcSentToLiquidity, 6)
    return {
        solRaised,
        usdcRaised,
        tokenSold,
        totalAmount,
        solSentToEda,
        usdcSentToEda,
        tokenSoldForSol,
        tokenSoldForUsdc,
        solSentToLiquidity,
        usdcSentToLiquidity,
        remainingAmount: totalAmount - tokenSold,
        isUnsoldTokensBurned: result.isUnsoldTokensBurned,
        solRaisedFormatted: formatNumber(solRaised),
        usdRaisedFormatted: formatNumber(usdcRaised),
        tokenSoldFormatted: formatNumber(tokenSold),
        totalAmountFormatted: formatNumber(totalAmount),
        solSentToEdaFormatted: formatNumber(solSentToEda),
        usdcSentToEdaFormatted: formatNumber(usdcSentToEda),
        tokenSoldForSolFormatted: formatNumber(tokenSoldForSol),
        tokenSoldForUsdcFormatted: formatNumber(tokenSoldForUsdc),
        solSentToLiquidityFormatted: formatNumber(solSentToLiquidity),
        usdcSentToLiquidityFormatted: formatNumber(usdcSentToLiquidity),
        remainingAmountFormatted: formatNumber(totalAmount - tokenSold)
    }
}

export async function getPresaleVaultElwBalance() {
    const result = await getTokenAccountInfo(await getVaultAccountElwAta(VaultAccount.Presale))
    const presaleElw = result?.parsed.info.tokenAmount || { uiAmount: 0 }
    return {
        amount: presaleElw.uiAmount,
        amountFormatted: formatNumber(presaleElw.uiAmount)
    }
}
