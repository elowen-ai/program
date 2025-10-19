import { getElwMint } from '../../platform'
import { getAddressLookupTableAddress } from '../../alt'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import ElowenProgram, { getLatestBlockhash } from '../../../program'
import {
    findLpStatePdaByCurrency,
    getLpStateByCurrency,
    getLpStateByMint,
    getPoolInfoByMint,
    getPoolVaultAmountByLpState,
    getPriceByVaults
} from './data'
import {
    Currency,
    QuoteCurrency,
    RaydiumKeyNft,
    RoundDirection,
    SolanaAddress,
    SwapDirection,
    ValidInputOutput,
    VaultAccount
} from '../../../types'
import {
    Keypair,
    ComputeBudgetProgram,
    Transaction,
    VersionedTransaction,
    TransactionMessage
} from '@solana/web3.js'
import {
    calculateMaximumInput,
    calculateMinimumOutput,
    calculateSlippageUp,
    currencyToRustEnum,
    getAmmConfig,
    getDecimalsByCurrency,
    getQuoteMint,
    getVaultAccount,
    getVaultAccountTokenAtaByMint,
    maybeToPublicKey,
    swapDirectionToRustEnum,
    toBn,
    toTokenFormat,
    vaultAccountToRustEnum
} from '../../../utils'
import {
    getElwVaultAddress,
    getLockedLiquidityAddress,
    getLockingAuthorityAddress,
    getObservationAddress,
    getPoolAddress,
    getPoolLpMintAddress,
    getPoolVaultAddress,
    getQuoteVaultAddress,
    tradingTokensToLpTokens
} from '../../../ray'

export * from './data'

export async function createInitializeCpmmLiquidityTransaction(
    elwAmount: number,
    quoteAmount: number,
    currency: QuoteCurrency,
    openTime: number
) {
    const ammConfig = getAmmConfig()
    const elwMint = await getElwMint()
    const lpState = findLpStatePdaByCurrency(currency)
    const liquidityVault = getVaultAccount(VaultAccount.Liquidity)
    const poolState = getPoolAddress(ammConfig, elwMint, getQuoteMint(currency))
    const liquidityElwTokenAta = getAssociatedTokenAddressSync(elwMint, liquidityVault, true)
    const liquidityQuoteTokenAta = getAssociatedTokenAddressSync(
        getQuoteMint(currency),
        liquidityVault,
        true
    )
    const feeNftMint = Keypair.generate()
    const lpMint = getPoolLpMintAddress(poolState)
    const lockingAuthority = getLockingAuthorityAddress()
    const observationState = getObservationAddress(poolState)
    const elwVault = getPoolVaultAddress(poolState, elwMint)
    const quoteVault = getPoolVaultAddress(poolState, getQuoteMint(currency))
    const lockedLpTokenAta = getAssociatedTokenAddressSync(lpMint, lockingAuthority, true)
    const liquidityLpTokenAta = getAssociatedTokenAddressSync(lpMint, liquidityVault, true)
    const feeNftAccount = getAssociatedTokenAddressSync(feeNftMint.publicKey, liquidityVault, true)
    const instruction = await ElowenProgram.methods
        .initializeCpmmLiquidity(
            currencyToRustEnum(currency),
            toTokenFormat(elwAmount),
            toTokenFormat(quoteAmount, getDecimalsByCurrency(currency)),
            toBn(openTime)
        )
        .accounts({
            elwMint,
            ammConfig,
            feeNftAccount,
            lockedLpTokenAta,
            liquidityLpTokenAta,
            feeNftMint: feeNftMint.publicKey,
            quoteMint: getQuoteMint(currency)
        })
        .accountsPartial({
            lpMint,
            lpState,
            poolState,
            elwVault,
            quoteVault,
            observationState,
            liquidityElwTokenAta,
            liquidityQuoteTokenAta
        })
        .signers([feeNftMint])
        .instruction()
    const preIxs = [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 8 })
    ]
    const transaction = new Transaction().add(...preIxs, instruction)
    const [lookupTableAccount, { blockhash }] = await Promise.all([
        ElowenProgram.connection.getAddressLookupTable(await getAddressLookupTableAddress()),
        getLatestBlockhash()
    ])
    const transactionV0 = new VersionedTransaction(
        new TransactionMessage({
            recentBlockhash: blockhash,
            instructions: [...preIxs, instruction],
            payerKey: ElowenProgram.wallet.publicKey
        }).compileToV0Message([lookupTableAccount.value])
    )
    return { transaction, transactionV0, feeNftMint }
}

export async function createDepositCpmmLiquidityTransaction(
    maximumElwAmount: number,
    maximumQuoteAmount: number,
    currency: QuoteCurrency,
    slippageBps = 0
) {
    const [elwMint, lpState] = await Promise.all([getElwMint(), getLpStateByCurrency(currency)])
    const [poolInfo, vaultAmounts] = await Promise.all([
        getPoolInfoByMint(lpState.poolState),
        getPoolVaultAmountByLpState(lpState)
    ])
    const feeNftMint = Keypair.generate()
    const decimals = getDecimalsByCurrency(currency)
    const lockingAuthority = getLockingAuthorityAddress()
    const liquidityVault = getVaultAccount(VaultAccount.Liquidity)
    const maxElwAmount = calculateSlippageUp(maximumElwAmount, slippageBps)
    const maxQuoteAmount = calculateSlippageUp(maximumQuoteAmount, slippageBps, decimals)
    const lpTokenAmount = tradingTokensToLpTokens(
        toTokenFormat(maximumElwAmount),
        toTokenFormat(maximumQuoteAmount, decimals),
        toBn(poolInfo.lpSupply),
        toBn(vaultAmounts.elwAmountStr),
        toBn(vaultAmounts.quoteAmountStr),
        RoundDirection.Floor
    )
    const instruction = await ElowenProgram.methods
        .depositCpmmLiquidity(
            currencyToRustEnum(currency),
            lpTokenAmount,
            maxElwAmount,
            maxQuoteAmount
        )
        .accounts({
            elwMint,
            lpMint: poolInfo.lpMint,
            poolState: lpState.poolState,
            feeNftMint: feeNftMint.publicKey,
            quoteMint: getQuoteMint(currency),
            feeNftAccount: getAssociatedTokenAddressSync(feeNftMint.publicKey, liquidityVault, true)
        })
        .accountsPartial({
            elwVault: poolInfo.elwVault,
            quoteVault: poolInfo.quoteVault,
            lockedLpTokenAta: getAssociatedTokenAddressSync(
                poolInfo.lpMint,
                lockingAuthority,
                true
            ),
            liquidityLpTokenAta: getAssociatedTokenAddressSync(
                poolInfo.lpMint,
                liquidityVault,
                true
            ),
            liquidityQuoteTokenAta: getAssociatedTokenAddressSync(
                getQuoteMint(currency),
                liquidityVault,
                true
            ),
            liquidityElwTokenAta: getAssociatedTokenAddressSync(elwMint, liquidityVault, true)
        })
        .signers([feeNftMint])
        .instruction()
    const preIxs = [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 350_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 7 })
    ]
    const transaction = new Transaction().add(...preIxs, instruction)
    const [lookupTableAccount, { blockhash }] = await Promise.all([
        ElowenProgram.connection.getAddressLookupTable(await getAddressLookupTableAddress()),
        getLatestBlockhash()
    ])
    const transactionV0 = new VersionedTransaction(
        new TransactionMessage({
            recentBlockhash: blockhash,
            instructions: [...preIxs, instruction],
            payerKey: ElowenProgram.wallet.publicKey
        }).compileToV0Message([lookupTableAccount.value])
    )
    return { transaction, transactionV0, feeNftMint }
}

async function findRightMints(inputToken: Currency, outputToken: Currency) {
    const elwMint = await getElwMint()
    const quoteMint = getQuoteMint(
        (inputToken === Currency.ELW ? outputToken : inputToken) as QuoteCurrency
    )
    const inputTokenMint = inputToken === Currency.ELW ? elwMint : quoteMint
    const outputTokenMint = inputToken === Currency.ELW ? quoteMint : elwMint
    const quoteCurrency = inputToken === Currency.ELW ? outputToken : (inputToken as QuoteCurrency)
    return { elwMint, quoteMint, inputTokenMint, outputTokenMint, quoteCurrency }
}

async function prepareSwapVariables(
    inputToken: Currency,
    outputToken: Currency,
    amount: number,
    direction: SwapDirection,
    slippageBps = 0.5
) {
    const { elwMint, quoteMint, inputTokenMint, outputTokenMint } = await findRightMints(
        inputToken,
        outputToken
    )
    const { poolState } = await getLpStateByMint(quoteMint)
    const inDecimals = getDecimalsByCurrency(inputToken)
    const outDecimals = getDecimalsByCurrency(outputToken)
    const observationState = getObservationAddress(poolState)
    const inputVault = getPoolVaultAddress(poolState, inputTokenMint)
    const outputVault = getPoolVaultAddress(poolState, outputTokenMint)
    const _price = await getPriceByVaults(
        inputToken === Currency.ELW ? inputVault : outputVault,
        inputToken === Currency.ELW ? outputVault : inputVault
    )
    const price = elwMint === inputTokenMint ? _price.elwToQuote : _price.quoteToElw
    const minMaxAmount =
        direction === SwapDirection.Input
            ? calculateMinimumOutput(amount, price, slippageBps)
            : calculateMaximumInput(amount, price, slippageBps)
    const inputAmount =
        direction === SwapDirection.Input
            ? toTokenFormat(amount, inDecimals)
            : toTokenFormat(minMaxAmount, inDecimals)
    const outputAmount =
        direction === SwapDirection.Input
            ? toTokenFormat(minMaxAmount, outDecimals)
            : toTokenFormat(amount, outDecimals)
    return {
        poolState,
        inDecimals,
        outDecimals,
        inputVault,
        outputVault,
        inputAmount,
        outputAmount,
        inputTokenMint,
        outputTokenMint,
        observationState
    }
}

function checkInputOutput(inputToken: Currency, outputToken: Currency) {
    return inputToken === Currency.ELW || outputToken === Currency.ELW
}

export async function createSwapCpmmInstruction<T extends Currency>(
    payer: SolanaAddress,
    inputToken: T,
    outputToken: ValidInputOutput<T>,
    amount: number,
    direction: SwapDirection,
    slippageBps = 0.5
) {
    if (!checkInputOutput(inputToken, outputToken)) {
        throw new Error('Input or output token must be ELW')
    }

    const {
        poolState,
        inputVault,
        outputVault,
        inputAmount,
        outputAmount,
        inputTokenMint,
        outputTokenMint,
        observationState
    } = await prepareSwapVariables(inputToken, outputToken, amount, direction, slippageBps)

    return ElowenProgram.methods
        .swapCpmm(
            inputAmount,
            outputAmount,
            currencyToRustEnum(inputToken),
            currencyToRustEnum(outputToken),
            swapDirectionToRustEnum(direction)
        )
        .accounts({
            poolState,
            inputVault,
            outputVault,
            inputTokenMint,
            outputTokenMint,
            observationState,
            ammConfig: getAmmConfig(),
            payer: maybeToPublicKey(payer)
        })
        .accountsPartial({
            inputTokenAccount: getAssociatedTokenAddressSync(
                inputTokenMint,
                maybeToPublicKey(payer)
            ),
            outputTokenAccount: getAssociatedTokenAddressSync(
                outputTokenMint,
                maybeToPublicKey(payer)
            )
        })
        .instruction()
}

export async function createSwapCpmmTransaction<T extends Currency>(
    payer: SolanaAddress,
    inputToken: T,
    outputToken: ValidInputOutput<T>,
    amount: number,
    direction: SwapDirection,
    slippageBps = 0.5
) {
    return new Transaction().add(
        await createSwapCpmmInstruction(
            payer,
            inputToken,
            outputToken,
            amount,
            direction,
            slippageBps
        )
    )
}

export async function createVaultSwapCpmmInstruction<T extends Currency>(
    vault: VaultAccount,
    inputToken: T,
    outputToken: ValidInputOutput<T>,
    amount: number,
    direction: SwapDirection,
    slippageBps = 0.5
) {
    if (!checkInputOutput(inputToken, outputToken)) {
        throw new Error('Input or output token must be ELW')
    }

    const {
        poolState,
        inputVault,
        outputVault,
        inputAmount,
        outputAmount,
        inputTokenMint,
        outputTokenMint,
        observationState
    } = await prepareSwapVariables(inputToken, outputToken, amount, direction, slippageBps)

    return ElowenProgram.methods
        .vaultSwapCpmm(
            inputAmount,
            outputAmount,
            vaultAccountToRustEnum(vault),
            currencyToRustEnum(inputToken),
            currencyToRustEnum(outputToken),
            swapDirectionToRustEnum(direction)
        )
        .accounts({
            vault: getVaultAccount(vault),
            signer: ElowenProgram.wallet.publicKey
        })
        .accounts({
            poolState,
            inputVault,
            outputVault,
            inputTokenMint,
            outputTokenMint,
            observationState,
            ammConfig: getAmmConfig(),
            vault: getVaultAccount(vault)
        })
        .accountsPartial({
            inputTokenAccount: getVaultAccountTokenAtaByMint(vault, inputTokenMint),
            outputTokenAccount: getVaultAccountTokenAtaByMint(vault, outputTokenMint)
        })
        .instruction()
}

export async function createVaultSwapCpmmTransaction<T extends Currency>(
    vault: VaultAccount,
    inputToken: T,
    outputToken: ValidInputOutput<T>,
    amount: number,
    direction: SwapDirection,
    slippageBps = 0.5
) {
    return new Transaction().add(
        await createVaultSwapCpmmInstruction(
            vault,
            inputToken,
            outputToken,
            amount,
            direction,
            slippageBps
        )
    )
}

export async function createCollectLockedLiquidityFeesInstruction(nft: RaydiumKeyNft) {
    if (!nft.lockedLpState) {
        throw new Error('NFT does not have a locked LP state')
    }
    const ammConfig = getAmmConfig()
    const elwMint = await getElwMint()
    const currency = nft.lockedLpState.quoteCurrencyFormatted
    const lockedLiquidity = getLockedLiquidityAddress(nft.mint)
    const liquidityVault = getVaultAccount(VaultAccount.Liquidity)
    const poolState = getPoolAddress(ammConfig, elwMint, getQuoteMint(currency))
    const feeNftAccount = getAssociatedTokenAddressSync(nft.mint, liquidityVault, true)
    const liquidityElwTokenAta = getAssociatedTokenAddressSync(elwMint, liquidityVault, true)
    const liquidityQuoteTokenAta = getAssociatedTokenAddressSync(
        getQuoteMint(currency),
        liquidityVault,
        true
    )
    const lockedLpTokenAta = getAssociatedTokenAddressSync(
        getPoolLpMintAddress(poolState),
        getLockingAuthorityAddress(),
        true
    )
    const [elwVault, quoteVault] = await Promise.all([
        getElwVaultAddress(poolState),
        getQuoteVaultAddress(poolState, currency)
    ])
    return ElowenProgram.methods
        .collectLockedLiquidityFees(currencyToRustEnum(currency))
        .accounts({
            elwMint,
            poolState,
            ammConfig,
            elwVault,
            quoteVault,
            lockedLiquidity,
            quoteMint: getQuoteMint(currency),
            lpMint: getPoolLpMintAddress(poolState),
            observationState: getObservationAddress(poolState)
        })
        .accountsPartial({
            feeNftAccount,
            lockedLpTokenAta,
            liquidityElwTokenAta,
            liquidityQuoteTokenAta
        })
        .instruction()
}

export async function createCollectLockedLiquidityFeesTransaction(nft: RaydiumKeyNft) {
    const instruction = await createCollectLockedLiquidityFeesInstruction(nft)
    return new Transaction().add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 6 }),
        instruction
    )
}
