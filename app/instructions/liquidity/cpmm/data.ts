import axios from 'axios'
import { PublicKey } from '@solana/web3.js'
import { getElwMint } from '../../platform'
import ElowenProgram from '../../../program'
import { IdlAccounts } from '@coral-xyz/anchor'
import { publicKey } from '@metaplex-foundation/umi'
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { fetchMetadata, findMetadataPda } from '@metaplex-foundation/mpl-token-metadata'
import { Currency, IDLType, QuoteCurrency, RaydiumKeyNft, VaultAccount } from '../../../types'
import {
    ConfigInfoLayout,
    getElwVaultAddress,
    getLockedLiquidityAddress,
    getObservationAddress,
    getPoolAddress,
    getPoolLpMintAddress,
    getQuoteVaultAddress,
    LockedLiquidityStateLayout,
    ObservationInfoLayout,
    PoolInfoLayout
} from '../../../ray'
import {
    findCurrencyFromNumber,
    fixDecimals,
    formatNumber,
    fromTokenFormat,
    getAmmConfig,
    getDecimalsByCurrency,
    getQuoteCurrency,
    getQuoteMint,
    getTokenAccountInfo,
    getVaultAccount,
    getVaultAccountWithElwAta,
    toBn,
    WSOL_MINT
} from '../../../utils'

export async function prepareLpState(lpState: IdlAccounts<IDLType>['lpStateAccount'] | null) {
    if (!lpState) {
        throw new Error('LP state not found')
    }
    const lpAmount = fromTokenFormat(lpState.lpAmount)
    const elwAmount = fromTokenFormat(lpState.elwAmount)
    const currency = findCurrencyFromNumber(lpState.quoteCurrency) as QuoteCurrency
    const quoteAmount = fromTokenFormat(lpState.quoteAmount, getDecimalsByCurrency(currency))
    return {
        ...lpState,
        lpAmount,
        elwAmount,
        quoteAmount,
        lpAmountFormatted: formatNumber(lpAmount),
        elwAmountFormatted: formatNumber(elwAmount),
        quoteAmountFormatted: formatNumber(quoteAmount),
        quoteCurrencyFormatted: currency as QuoteCurrency
    }
}

export function findLpStatePdaByCurrency(currency: QuoteCurrency) {
    const [pda, _bump] = PublicKey.findProgramAddressSync(
        [Buffer.from('lp_state'), getQuoteMint(currency).toBuffer()],
        ElowenProgram.ID
    )
    return pda
}

export async function getLpStateByCurrency(currency: QuoteCurrency) {
    return prepareLpState(
        await ElowenProgram.accounts.lpStateAccount.fetchNullable(
            findLpStatePdaByCurrency(currency)
        )
    )
}

function findLpStatePdaByMint(mint: PublicKey) {
    const [pda, _bump] = PublicKey.findProgramAddressSync(
        [Buffer.from('lp_state'), mint.toBuffer()],
        ElowenProgram.ID
    )
    return pda
}

export async function getLpStateByMint(mint: PublicKey) {
    return prepareLpState(
        await ElowenProgram.accounts.lpStateAccount.fetchNullable(findLpStatePdaByMint(mint))
    )
}

export async function getPoolInfoByMint(mint: PublicKey) {
    const accountInfo = await ElowenProgram.connection.getAccountInfo(mint)
    if (!accountInfo) {
        throw new Error('Pool info not found')
    }
    const result = PoolInfoLayout.decode(accountInfo.data)
    return {
        ...result,
        lpSupply: toBn(result.lpSupply),
        elwFundFees: toBn(result.elwFundFees),
        quoteFundFees: toBn(result.quoteFundFees),
        elwProtocolFees: toBn(result.elwProtocolFees),
        quoteProtocolFees: toBn(result.quoteProtocolFees),
        lpSupplyNumber: fromTokenFormat(result.lpSupply, result.lpDecimals),
        elwFundFeesNumber: fromTokenFormat(result.elwFundFees, result.elwDecimals),
        quoteFundFeesNumber: fromTokenFormat(result.quoteFundFees, result.quoteDecimals),
        elwProtocolFeesNumber: fromTokenFormat(result.elwProtocolFees, result.elwDecimals),
        quoteProtocolFeesNumber: fromTokenFormat(result.quoteProtocolFees, result.quoteDecimals),
        lpSupplyFormatted: formatNumber(
            fromTokenFormat(result.lpSupply, result.lpDecimals),
            result.lpDecimals
        ),
        elwFundFeesFormatted: formatNumber(
            fromTokenFormat(result.elwFundFees, result.elwDecimals),
            result.elwDecimals
        ),
        quoteFundFeesFormatted: formatNumber(
            fromTokenFormat(result.quoteFundFees, result.quoteDecimals),
            result.quoteDecimals
        ),
        elwProtocolFeesFormatted: formatNumber(
            fromTokenFormat(result.elwProtocolFees, result.elwDecimals),
            result.elwDecimals
        ),
        quoteProtocolFeesFormatted: formatNumber(
            fromTokenFormat(result.quoteProtocolFees, result.quoteDecimals),
            result.quoteDecimals
        )
    }
}

export async function getPoolInfoByCurrency(currency: QuoteCurrency) {
    return await getPoolInfoByMint((await getLpStateByCurrency(currency)).poolState)
}

export async function getPoolInfoFeesByMint(mint: PublicKey) {
    const poolInfo = await getPoolInfoByMint(mint)
    return {
        elwFundFees: poolInfo.elwFundFeesNumber,
        quoteFundFees: poolInfo.quoteFundFeesNumber,
        elwProtocolFees: poolInfo.elwProtocolFeesNumber,
        quoteProtocolFees: poolInfo.quoteProtocolFeesNumber,
        elwFundFeesFormatted: poolInfo.elwFundFeesFormatted,
        quoteFundFeesFormatted: poolInfo.quoteFundFeesFormatted,
        elwProtocolFeesFormatted: poolInfo.elwProtocolFeesFormatted,
        quoteProtocolFeesFormatted: poolInfo.quoteProtocolFeesFormatted
    }
}

export async function getPoolInfoFeesByLpState(lpState: { poolState: PublicKey }) {
    return await getPoolInfoFeesByMint(lpState.poolState)
}

export async function getPoolInfoFeesByCurrency(currency: QuoteCurrency) {
    return await getPoolInfoFeesByLpState(await getLpStateByCurrency(currency))
}

export async function getLockedLpStateByFeeNftMint(mint: PublicKey) {
    const result = await ElowenProgram.accounts.lockedLpStateAccount.fetchNullable(
        PublicKey.findProgramAddressSync(
            [Buffer.from('locked_lp_state'), mint.toBuffer()],
            ElowenProgram.ID
        )[0]
    )
    if (!result) {
        throw new Error('Locked liquidity state not found')
    }
    return {
        ...result,
        quoteCurrency: result.quoteCurrency,
        lockedLpAmount: fromTokenFormat(result.lockedLpAmount),
        lockedLpAmountFormatted: formatNumber(fromTokenFormat(result.lockedLpAmount)),
        quoteCurrencyFormatted: findCurrencyFromNumber(result.quoteCurrency) as QuoteCurrency
    }
}

export async function getLockedLiquidityInfoByFeeNftMint(mint: PublicKey) {
    const accountInfo = await ElowenProgram.connection.getAccountInfo(
        getLockedLiquidityAddress(mint)
    )
    if (!accountInfo) {
        throw new Error('Locked liquidity info not found')
    }
    const result = LockedLiquidityStateLayout.decode(accountInfo.data)
    return {
        ...result,
        lastLp: toBn(result.lastLp),
        lastK: toBn(result.lastK),
        recentEpoch: toBn(result.recentEpoch),
        lockedLpAmount: toBn(result.lockedLpAmount),
        claimedLpAmount: toBn(result.claimedLpAmount),
        unclaimedLpAmount: toBn(result.unclaimedLpAmount),
        lastLpNumber: fromTokenFormat(result.lastLp),
        lockedLpAmountNumber: fromTokenFormat(result.lockedLpAmount),
        claimedLpAmountNumber: fromTokenFormat(result.claimedLpAmount),
        unclaimedLpAmountNumber: fromTokenFormat(result.unclaimedLpAmount),
        lastLpFormatted: formatNumber(fromTokenFormat(result.lastLp)),
        lockedLpAmountFormatted: formatNumber(fromTokenFormat(result.lockedLpAmount)),
        claimedLpAmountFormatted: formatNumber(fromTokenFormat(result.claimedLpAmount)),
        unclaimedLpAmountFormatted: formatNumber(fromTokenFormat(result.unclaimedLpAmount))
    }
}

export function getLiquidityVaultRaydiumKeyNfts(
    withLockedLpState: true,
    currency?: QuoteCurrency
): Promise<Array<RaydiumKeyNft>>
export function getLiquidityVaultRaydiumKeyNfts(
    withLockedLpState?: false,
    currency?: never
): Promise<Array<RaydiumKeyNft>>
export async function getLiquidityVaultRaydiumKeyNfts(
    withLockedLpState: boolean = false,
    currency: QuoteCurrency
) {
    const tokenAccounts = await ElowenProgram.connection.getParsedTokenAccountsByOwner(
        getVaultAccount(VaultAccount.Liquidity),
        {
            programId: TOKEN_PROGRAM_ID
        }
    )

    const nftTokens = tokenAccounts.value.filter((account) => {
        const amount = account.account.data.parsed.info.tokenAmount
        return amount.amount === '1' && amount.decimals === 0
    })

    const result = await Promise.all(
        nftTokens
            .map(async (account) => {
                const mint = new PublicKey(account.account.data.parsed.info.mint)
                const metadata = await fetchMetadata(
                    ElowenProgram.umi,
                    findMetadataPda(ElowenProgram.umi, { mint: publicKey(mint) })
                )
                return {
                    mint,
                    metadata,
                    account: account.pubkey,
                    lockedLpState: withLockedLpState
                        ? await getLockedLpStateByFeeNftMint(mint)
                        : null
                }
            })
            .filter((item) => item !== null)
    )

    return result.filter(
        (item) => !currency || item.lockedLpState?.quoteCurrencyFormatted === currency
    )
}

export async function getPoolConfigByMint(mint: PublicKey) {
    const accountInfo = await ElowenProgram.connection.getAccountInfo(mint)
    if (!accountInfo) {
        throw new Error('Pool config not found')
    }
    const result = ConfigInfoLayout.decode(accountInfo.data)
    return {
        ...result,
        fundFeeRate: toBn(result.fundFeeRate),
        tradeFeeRate: toBn(result.tradeFeeRate),
        createPoolFee: toBn(result.createPoolFee),
        protocolFeeRate: toBn(result.protocolFeeRate)
    }
}

export async function getPoolConfig() {
    return await getPoolConfigByMint(getAmmConfig())
}

export async function getPoolObservationByMint(mint: PublicKey) {
    const accountInfo = await ElowenProgram.connection.getAccountInfo(mint)
    if (!accountInfo) {
        throw new Error('Pool observation not found')
    }
    return ObservationInfoLayout.decode(accountInfo.data)
}

export async function getPoolObservationByCurrency(currency: QuoteCurrency) {
    return await getPoolObservationByMint(
        getObservationAddress((await getLpStateByCurrency(currency)).poolState)
    )
}

export async function getPoolVaultAmount(vault: PublicKey) {
    const vaultData = await getTokenAccountInfo(vault)
    if (!vaultData) {
        throw new Error('Vault not found. Vault: ' + vault.toString())
    }
    const amount = vaultData.parsed.info.tokenAmount.amount
    const decimals = vaultData.parsed.info.tokenAmount.decimals
    const uiAmount = vaultData.parsed.info.tokenAmount.uiAmount
    return {
        decimals,
        amountStr: amount,
        amount: Number(amount),
        uiAmount: Number(uiAmount),
        amountFormatted: formatNumber(uiAmount)
    }
}

export async function getPoolVaultAmountByLpState(lpState: {
    poolState: PublicKey
    quoteCurrencyFormatted: QuoteCurrency
}) {
    const [elwVault, quoteVault] = await Promise.all([
        getElwVaultAddress(lpState.poolState),
        getQuoteVaultAddress(lpState.poolState, lpState.quoteCurrencyFormatted)
    ])
    const [elw, quote] = await Promise.all([
        getPoolVaultAmount(elwVault),
        getPoolVaultAmount(quoteVault)
    ])
    return {
        elwAmount: elw.amount,
        quoteAmount: quote.amount,
        elwUiAmount: elw.uiAmount,
        quoteUiAmount: quote.uiAmount,
        elwAmountStr: elw.amountStr,
        quoteAmountStr: quote.amountStr,
        elwAmountFormatted: elw.amountFormatted,
        quoteAmountFormatted: quote.amountFormatted
    }
}

export async function getPoolVaultAmountByCurrency(currency: QuoteCurrency) {
    return await getPoolVaultAmountByLpState(await getLpStateByCurrency(currency))
}

export async function getPoolVaultAmountByMint(mint: PublicKey) {
    return await getPoolVaultAmountByLpState(await getLpStateByMint(mint))
}

export async function getPriceByVaults(elwVault: PublicKey, quoteVault: PublicKey) {
    const [elwAmount, quoteAmount] = await Promise.all([
        getPoolVaultAmount(elwVault),
        getPoolVaultAmount(quoteVault)
    ])
    const elwToQuote = quoteAmount.uiAmount / elwAmount.uiAmount
    const quoteToElw = elwAmount.uiAmount / quoteAmount.uiAmount
    return {
        elwToQuote: fixDecimals(elwToQuote, elwAmount.decimals),
        quoteToElw: fixDecimals(quoteToElw, quoteAmount.decimals),
        elwToQuoteFormatted: formatNumber(elwToQuote, elwAmount.decimals),
        quoteToElwFormatted: formatNumber(quoteToElw, quoteAmount.decimals)
    }
}

export async function getPriceByLpState(lpState: {
    poolState: PublicKey
    quoteCurrencyFormatted: QuoteCurrency
}) {
    return await getPriceByVaults(
        ...(await Promise.all([
            getElwVaultAddress(lpState.poolState),
            getQuoteVaultAddress(lpState.poolState, lpState.quoteCurrencyFormatted)
        ]))
    )
}

export async function getPriceByQuoteMint(quoteMint: PublicKey) {
    const poolState = getPoolAddress(getAmmConfig(), await getElwMint(), quoteMint)
    return await getPriceByVaults(
        ...(await Promise.all([
            getElwVaultAddress(poolState),
            getQuoteVaultAddress(poolState, getQuoteCurrency(quoteMint))
        ]))
    )
}

export async function getPriceByQuoteCurrency(currency: QuoteCurrency) {
    return await getPriceByQuoteMint(getQuoteMint(currency))
}

export async function getPriceByRaydiumAPI(currency: QuoteCurrency) {
    const elwMint = await getElwMint()
    const wsolEndpoint = `https://api-v3.raydium.io/mint/price?mints=${WSOL_MINT.toBase58()}`
    const elwEndpoint = `https://api-v3.raydium.io/mint/price?mints=${elwMint.toBase58()}`

    const elwResult = await axios.get(elwEndpoint)

    if (elwResult.status !== 200) {
        throw new Error(
            'Failed to get price from Raydium API. Response: ' + JSON.stringify(elwResult.data)
        )
    }

    if (elwResult.data.data[elwMint.toBase58()]) {
        const elwUsdPrice = Number(elwResult.data.data[elwMint.toBase58()])
        const price = {
            elwToQuote: elwUsdPrice,
            quoteToElw: 1 / elwUsdPrice,
            elwToQuoteFormatted: formatNumber(elwUsdPrice, 6),
            quoteToElwFormatted: formatNumber(1 / elwUsdPrice, 6)
        }
        if (currency === Currency.USDC) {
            return price
        } else {
            const wsolResult = await axios.get(wsolEndpoint)
            if (wsolResult.status !== 200) {
                throw new Error('Failed to get price from Raydium API')
            }
            const wsolUsdPrice = Number(wsolResult.data.data[WSOL_MINT.toBase58()])
            return {
                elwToQuote: price.elwToQuote / wsolUsdPrice,
                quoteToElw: 1 / (price.elwToQuote / wsolUsdPrice),
                elwToQuoteFormatted: formatNumber(price.elwToQuote / wsolUsdPrice, 9),
                quoteToElwFormatted: formatNumber(1 / (price.elwToQuote / wsolUsdPrice), 9)
            }
        }
    }

    throw new Error(
        'Failed to get price from Raydium API. Response: ' + JSON.stringify(elwResult.data)
    )
}

export async function getLiquidityVaultBalances() {
    const { account: liquidityVault, elwAta: liquidityElwAta } = await getVaultAccountWithElwAta(
        VaultAccount.Liquidity
    )
    const result = await ElowenProgram.connection.getParsedTokenAccountsByOwner(liquidityVault, {
        programId: TOKEN_PROGRAM_ID
    })
    if (!result.value.length) {
        return null
    }
    const solAta = getAssociatedTokenAddressSync(getQuoteMint(Currency.SOL), liquidityVault, true)
    const usdcAta = getAssociatedTokenAddressSync(getQuoteMint(Currency.USDC), liquidityVault, true)
    const sol = result.value.find((item) => item.pubkey.toString() === solAta.toString())?.account
        .data.parsed.info
    const usdc = result.value.find((item) => item.pubkey.toString() === usdcAta.toString())?.account
        .data.parsed.info
    const elw = result.value.find((item) => item.pubkey.toString() === liquidityElwAta.toString())
        ?.account.data.parsed.info
    const ammConfig = getAmmConfig()
    const elwSolLpMint = getPoolLpMintAddress(
        getPoolAddress(ammConfig, new PublicKey(elw.mint), new PublicKey(sol.mint))
    )
    const elwUsdcLpMint = getPoolLpMintAddress(
        getPoolAddress(ammConfig, new PublicKey(elw.mint), new PublicKey(usdc.mint))
    )
    const elwSolLp = result.value.find(
        (item) => item.account.data.parsed.info.mint === elwSolLpMint.toString()
    )?.account.data.parsed.info
    const elwUsdcLp = result.value.find(
        (item) => item.account.data.parsed.info.mint === elwUsdcLpMint.toString()
    )?.account.data.parsed.info
    return {
        solAmount: sol?.tokenAmount.uiAmount || 0,
        elwAmount: elw?.tokenAmount.uiAmount || 0,
        usdcAmount: usdc?.tokenAmount.uiAmount || 0,
        elwSolLpAmount: elwSolLp?.tokenAmount.uiAmount || 0,
        elwUsdcLpAmount: elwUsdcLp?.tokenAmount.uiAmount || 0,
        solAmountFormatted: formatNumber(sol?.tokenAmount.uiAmount || 0),
        elwAmountFormatted: formatNumber(elw?.tokenAmount.uiAmount || 0),
        usdcAmountFormatted: formatNumber(usdc?.tokenAmount.uiAmount || 0),
        elwSolLpAmountFormatted: formatNumber(elwSolLp?.tokenAmount.uiAmount || 0),
        elwUsdcLpAmountFormatted: formatNumber(elwUsdcLp?.tokenAmount.uiAmount || 0)
    }
}
