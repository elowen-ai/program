import { getElwMint } from '../../platform'
import { getAddressLookupTableAddress } from '../../alt'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import ElowenProgram, { getLatestBlockhash } from '../../../program'
import {
    findLpStatePdaByCurrency,
    getLpStateByCurrency,
    getPoolInfoByMint,
    getPoolVaultAmountByLpState,
} from './data'
import {
    Currency,
    QuoteCurrency,
    RoundDirection,
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
    calculateSlippageUp,
    currencyToRustEnum,
    getAmmConfig,
    getDecimalsByCurrency,
    getQuoteMint,
    getVaultAccount,
    toBn,
    toTokenFormat,
} from '../../../utils'
import {
    getLockingAuthorityAddress,
    getObservationAddress,
    getPoolAddress,
    getPoolLpMintAddress,
    getPoolVaultAddress,
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
