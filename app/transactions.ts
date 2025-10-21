import { loadLogger } from './logger'
import { PROGRAM_ID } from '@sqds/multisig'
import ElowenProgram, { coder } from './program'
import { getElwMint } from './instructions/platform'
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes'
import { getCpSwapAuthorityAddress, getLockingAuthorityAddress } from './ray'
import { Currency, PresaleType, QuoteCurrency, SwapDirection, VaultAccount } from './types'
import {
    PublicKey,
    ParsedInstruction,
    ParsedTransactionWithMeta,
    TransactionError
} from '@solana/web3.js'
import {
    currencyFromRustEnum,
    fromTokenFormat,
    getDecimalsByCurrency,
    getQuoteMint,
    getUsdcMint,
    getVaultAccount,
    getVaultAccountElwAta,
    getVaultAccountTokenAtaByMint,
    presaleTypeFromRustEnum,
    swapDirectionFromRustEnum,
    vaultAccountFromRustEnum,
    WSOL_MINT
} from './utils'

export type TransactionsFilter = {
    limit?: number
    viaWait?: boolean
    lastSignature?: string
}

type InnerInstruction = {
    programId: PublicKey
    accounts?: Array<PublicKey>
    data?: string
    program?: string
    parsed?: any
}

type Withdraw = {
    receiver: string
    amount: number
}

type PoolAction = {
    elwAmount: number
    quoteAmount: number
    quoteCurrency: Currency
}

type MiningPoolAction = Omit<PoolAction, 'quoteCurrency'> & {
    pool: string
}

type Swap = {
    inputAmount: number
    outputAmount: number
    inputCurrency: Currency
    outputCurrency: Currency
    swapDirection: SwapDirection
}

type VaultSwap = Swap & {
    vaultAccount: VaultAccount
}

export interface TransactionDetails {
    withdraw_treasury_usdc: Withdraw
    withdraw_treasury_elw: Withdraw
    withdraw_platform_elw: Withdraw
    withdraw_eda_usdc: Withdraw
    withdraw_eda_elw: Withdraw
    withdraw_eda_sol: Withdraw
    claim_elw_reward: Withdraw
    claim_team_elw: Withdraw
    swap_cpmm: Swap
    vault_swap_cpmm: VaultSwap
    deposit_cpmm_liquidity: PoolAction
    initialize_cpmm_liquidity: PoolAction
    withdraw_mining_liquidity: MiningPoolAction
    deposit_mining_liquidity: MiningPoolAction
    claim_mining_rewards: {
        miner: string
        amount: number
        pool: string
    }
    collect_locked_liquidity_fees: {
        elwCollected: number
        quoteCollected: number
        elwTransferredToEda: number
        quoteTransferredToEda: number
        burnedElw: number
    }
    buy_presale_elw: {
        paidAmount: number
        currency: Currency
        receivedAmount: number
        transferredToEda: number
        presaleType: PresaleType
        transferredToLiquidity: number
    }
    claim_presale_elw: {
        claimedAmount: number
    }
    burn_platform_elw: {
        amount: number
    }
    buy_premium: {
        payer: string
        amount: number
        currency: Currency
        burnedELW?: number
    }
    upgrade: string
    unknown: null
}

export type TransactionType = keyof TransactionDetails

export interface TransactionResponse<T extends TransactionType = TransactionType> {
    type: T
    name: string
    signature: string
    signer: string
    fee: number
    date: Date
    details: TransactionDetails[T]
}

type DecodedInstruction = {
    name: string
    data: {
        [key: string]: any
    }
}

function findOurProgramInstruction(
    transaction: ParsedTransactionWithMeta
): InnerInstruction | null {
    try {
        const instructions = transaction.transaction.message.instructions
        const ourProgramInstruction = instructions.find((ix) =>
            ix.programId.equals(ElowenProgram.ID)
        ) as InnerInstruction
        return ourProgramInstruction || null
    } catch (error) {
        loadLogger().then((logger) => {
            logger.error(error)
        })
        return null
    }
}

function findOurProgramInstructionFromInners(
    innerInstructions: Array<InnerInstruction>
): InnerInstruction | null {
    try {
        const ourProgramInstruction = innerInstructions.find((ix) =>
            ix.programId.equals(ElowenProgram.ID)
        ) as InnerInstruction
        return ourProgramInstruction || null
    } catch (error) {
        loadLogger().then((logger) => {
            logger.error(error)
        })
        return null
    }
}

function findSquadsProgramInstruction(
    transaction: ParsedTransactionWithMeta
): InnerInstruction | null {
    try {
        const instructions = transaction.transaction.message.instructions
        const ourProgramInstruction = instructions.find((ix) =>
            ix.programId.equals(PROGRAM_ID)
        ) as InnerInstruction
        return ourProgramInstruction || null
    } catch (error) {
        loadLogger().then((logger) => {
            logger.error(error)
        })
        return null
    }
}

function decodeInstructionByCoder(instruction: InnerInstruction | null): DecodedInstruction | null {
    if (!instruction) return null
    return coder.instruction.decode(
        Buffer.from(bs58.decode(instruction.data))
    ) as DecodedInstruction
}

function getInstructionName(transaction: ParsedTransactionWithMeta): string | null {
    let ourInstruction = findOurProgramInstruction(transaction)
    if (!ourInstruction && findSquadsProgramInstruction(transaction)) {
        ourInstruction = findOurProgramInstructionFromInners(
            getParsedInnerInstructions(transaction)
        )
    }
    const ix = decodeInstructionByCoder(ourInstruction)
    if (ix && ix.name) return ix.name
    return null
}

function getTransactionType(transaction: ParsedTransactionWithMeta): TransactionType {
    let type = getInstructionName(transaction)
    const upgradeIx = transaction.transaction.message.instructions.find(
        (ix: ParsedInstruction) => ix.program == 'bpf-upgradeable-loader'
    )
    if (upgradeIx) {
        type = 'upgrade'
    }
    return type ? (type as TransactionType) : ('unknown' as TransactionType)
}

function getParsedInnerInstructions(
    transaction: ParsedTransactionWithMeta
): Array<ParsedInstruction> {
    return (transaction.meta.innerInstructions?.[0]?.instructions || []) as ParsedInstruction[]
}

export function isTransactionType<T extends TransactionType>(
    tx: TransactionResponse,
    type: T
): tx is TransactionResponse & { details: TransactionDetails[T] } {
    return tx.type === type
}

async function transactionDetails<T extends TransactionType>(
    transaction: ParsedTransactionWithMeta,
    type: T
): Promise<TransactionDetails[T]> {
    let details: any = null
    let ourInstruction = findOurProgramInstruction(transaction)
    let innerInstructions = getParsedInnerInstructions(transaction)
    let decodedInstructionTry = decodeInstructionByCoder(ourInstruction)

    if (!ourInstruction && findSquadsProgramInstruction(transaction)) {
        ourInstruction = findOurProgramInstructionFromInners(innerInstructions)
        decodedInstructionTry = decodeInstructionByCoder(ourInstruction)
    }

    if (ourInstruction && decodedInstructionTry) {
        const decodedInstruction = decodedInstructionTry.data

        const elwMint = await getElwMint()
        const edaVault = getVaultAccount(VaultAccount.Eda)
        const teamVault = getVaultAccount(VaultAccount.Team)
        const rewardVault = getVaultAccount(VaultAccount.Reward)
        const platformVault = getVaultAccount(VaultAccount.Platform)
        const treasuryVault = getVaultAccount(VaultAccount.Treasury)
        const liquidityVault = getVaultAccount(VaultAccount.Liquidity)
        const edaElwAta = await getVaultAccountElwAta(VaultAccount.Eda)

        switch (type) {
            case 'withdraw_mining_liquidity':
            case 'deposit_mining_liquidity':
                const withdrawMiningCurrency = currencyFromRustEnum(decodedInstruction.currency)
                const withdrawMiningElwIx = innerInstructions.find((ix) => {
                    if (!ix?.parsed?.type) return false
                    return (
                        ix.program == 'spl-token' &&
                        ix.parsed.type === 'transferChecked' &&
                        new PublicKey(ix.parsed.info.mint).equals(elwMint)
                    )
                })
                const withdrawMiningQuoteIx = innerInstructions.find((ix) => {
                    if (!ix?.parsed?.type) return false
                    return (
                        ix.program == 'spl-token' &&
                        ix.parsed.type === 'transferChecked' &&
                        !new PublicKey(ix.parsed.info.mint).equals(elwMint)
                    )
                })
                details = {
                    pool: 'ELW/' + withdrawMiningCurrency,
                    elwAmount: fromTokenFormat(withdrawMiningElwIx.parsed.info.tokenAmount.amount),
                    quoteAmount: fromTokenFormat(
                        withdrawMiningQuoteIx.parsed.info.tokenAmount.amount,
                        withdrawMiningQuoteIx.parsed.info.tokenAmount.decimals
                    )
                }
                break
            case 'claim_mining_rewards':
                const claimMiningRewardsIx = innerInstructions.find((ix) => {
                    return ix.parsed.type === 'transfer' && ix.program == 'spl-token'
                })
                const claimMiningRewardsCurrency = currencyFromRustEnum(
                    decodedInstruction._currency
                )
                const firstSigner = transaction?.transaction.message?.accountKeys.find(
                    (account) => {
                        return account.signer
                    }
                )
                details = {
                    pool: 'ELW/' + claimMiningRewardsCurrency,
                    miner: firstSigner?.pubkey.toBase58() ?? '',
                    amount: fromTokenFormat(claimMiningRewardsIx.parsed.info.amount)
                }
                break
            case 'swap_cpmm':
            case 'vault_swap_cpmm':
                const inputCurrency = currencyFromRustEnum(decodedInstruction.input_currency)
                const outputCurrency = currencyFromRustEnum(decodedInstruction.output_currency)
                const inputMint =
                    inputCurrency === Currency.ELW ? elwMint : getQuoteMint(inputCurrency)
                const outputMint =
                    outputCurrency === Currency.ELW ? elwMint : getQuoteMint(outputCurrency)
                const swapDirection = swapDirectionFromRustEnum(decodedInstruction.swap_direction)
                const swapDirectionMap = {
                    [SwapDirection.Input]: 'input',
                    [SwapDirection.Output]: 'output'
                }
                const swapInputIx = innerInstructions.find((ix) => {
                    if (!ix?.parsed?.type) return false
                    return (
                        ix.program == 'spl-token' &&
                        ix.parsed.type === 'transferChecked' &&
                        new PublicKey(ix.parsed.info.mint).equals(inputMint) &&
                        !new PublicKey(ix.parsed.info.authority).equals(getCpSwapAuthorityAddress())
                    )
                })
                const swapOutputIx = innerInstructions.find((ix) => {
                    if (!ix?.parsed?.type) return false
                    return (
                        ix.program == 'spl-token' &&
                        ix.parsed.type === 'transferChecked' &&
                        new PublicKey(ix.parsed.info.mint).equals(outputMint) &&
                        new PublicKey(ix.parsed.info.authority).equals(getCpSwapAuthorityAddress())
                    )
                })
                details = {
                    inputCurrency,
                    outputCurrency,
                    swapDirection: swapDirectionMap[swapDirection],
                    inputAmount: fromTokenFormat(
                        swapInputIx.parsed.info.tokenAmount.amount,
                        swapInputIx.parsed.info.tokenAmount.decimals
                    ),
                    outputAmount: fromTokenFormat(
                        swapOutputIx.parsed.info.tokenAmount.amount,
                        swapOutputIx.parsed.info.tokenAmount.decimals
                    )
                }
                if (type === 'vault_swap_cpmm') {
                    details.vaultAccount = vaultAccountFromRustEnum(decodedInstruction.vault)
                }
                break
            case 'deposit_cpmm_liquidity':
                const depositLiqCurrency = currencyFromRustEnum(
                    decodedInstruction.currency
                ) as QuoteCurrency
                const depositLiqElwIx = innerInstructions.find((ix) => {
                    if (!ix.parsed?.type) return false
                    return (
                        ix.parsed.type === 'transferChecked' &&
                        ix.program == 'spl-token' &&
                        !new PublicKey(ix.parsed.info.mint).equals(
                            getQuoteMint(depositLiqCurrency)
                        ) &&
                        new PublicKey(ix.parsed.info.authority).equals(liquidityVault)
                    )
                })
                const depositLiqQuoteIx = innerInstructions.find((ix) => {
                    if (!ix.parsed?.type) return false
                    return (
                        ix.parsed.type === 'transferChecked' &&
                        ix.program == 'spl-token' &&
                        new PublicKey(ix.parsed.info.mint).equals(
                            getQuoteMint(depositLiqCurrency)
                        ) &&
                        new PublicKey(ix.parsed.info.authority).equals(liquidityVault)
                    )
                })
                details = {
                    quoteCurrency: depositLiqCurrency,
                    elwAmount: fromTokenFormat(depositLiqElwIx.parsed.info.tokenAmount.amount),
                    quoteAmount: fromTokenFormat(
                        depositLiqQuoteIx.parsed.info.tokenAmount.amount,
                        getDecimalsByCurrency(depositLiqCurrency)
                    )
                }
                break
            case 'collect_locked_liquidity_fees':
                const collectCurrency = currencyFromRustEnum(
                    decodedInstruction.currency
                ) as QuoteCurrency
                const collectElwIx = innerInstructions.find((ix) => {
                    if (!ix.parsed?.type) return false
                    return (
                        ix.parsed.type === 'transferChecked' &&
                        ix.program == 'spl-token' &&
                        !new PublicKey(ix.parsed.info.mint).equals(getQuoteMint(collectCurrency)) &&
                        new PublicKey(ix.parsed.info.authority).equals(getCpSwapAuthorityAddress())
                    )
                })
                const collectQuoteIx = innerInstructions.find((ix) => {
                    if (!ix.parsed?.type) return false
                    return (
                        ix.parsed.type === 'transferChecked' &&
                        ix.program == 'spl-token' &&
                        new PublicKey(ix.parsed.info.mint).equals(getQuoteMint(collectCurrency)) &&
                        new PublicKey(ix.parsed.info.authority).equals(getCpSwapAuthorityAddress())
                    )
                })
                const elwTransferredToEdaIx = innerInstructions.find((ix) => {
                    if (!ix.parsed?.type) return false
                    return (
                        ix.parsed.type === 'transfer' &&
                        ix.program == 'spl-token' &&
                        new PublicKey(ix.parsed.info.destination).equals(edaElwAta)
                    )
                })
                const quoteTransferredToEdaIx = innerInstructions.find((ix) => {
                    if (!ix.parsed?.type) return false
                    return (
                        ix.parsed.type === 'transfer' &&
                        ix.program == 'spl-token' &&
                        new PublicKey(ix.parsed.info.destination).equals(
                            getVaultAccountTokenAtaByMint(
                                VaultAccount.Eda,
                                getQuoteMint(collectCurrency)
                            )
                        )
                    )
                })
                const collectElwBurnIx = innerInstructions.find((ix) => {
                    if (!ix.parsed?.type) return false
                    return (
                        ix.parsed.type === 'burn' &&
                        ix.program == 'spl-token' &&
                        !new PublicKey(ix.parsed.info.authority).equals(
                            getLockingAuthorityAddress()
                        )
                    )
                })
                const burnedElw = fromTokenFormat(collectElwBurnIx.parsed.info.amount)
                const elwCollected = fromTokenFormat(collectElwIx.parsed.info.tokenAmount.amount)
                const quoteCollected = fromTokenFormat(
                    collectQuoteIx.parsed.info.tokenAmount.amount,
                    getDecimalsByCurrency(collectCurrency)
                )
                const elwTransferredToEda = fromTokenFormat(
                    elwTransferredToEdaIx.parsed.info.amount
                )
                const quoteTransferredToEda = fromTokenFormat(
                    quoteTransferredToEdaIx.parsed.info.amount,
                    getDecimalsByCurrency(collectCurrency)
                )
                details = {
                    burnedElw,
                    elwCollected,
                    quoteCollected,
                    elwTransferredToEda,
                    quoteTransferredToEda
                }
                break
            case 'initialize_cpmm_liquidity':
                const initQuoteCurrency = currencyFromRustEnum(decodedInstruction.currency)
                details = {
                    quoteCurrency: initQuoteCurrency,
                    elwAmount: fromTokenFormat(decodedInstruction.elw_amount),
                    quoteAmount: fromTokenFormat(
                        decodedInstruction.quote_amount,
                        getDecimalsByCurrency(initQuoteCurrency)
                    )
                }
                break
            case 'claim_presale_elw':
                const claimPresaleElwIx = innerInstructions.find(
                    (ix) => ix.parsed.type === 'transfer' && ix.program == 'spl-token'
                )
                details = {
                    claimedAmount: fromTokenFormat(claimPresaleElwIx.parsed.info.amount)
                }
                break
            case 'buy_presale_elw':
                let transferredToEda = 0
                let transferredToLiquidity = 0
                const buyPresaleCurrency = currencyFromRustEnum(decodedInstruction.currency)
                if (buyPresaleCurrency === Currency.SOL) {
                    const buyPresaleSolIxs = innerInstructions.filter(
                        (ix) => ix.parsed.type === 'transfer' && ix.program == 'system'
                    )
                    const buyPresaleEdaIx = buyPresaleSolIxs.find((ix) =>
                        new PublicKey(ix.parsed.info.destination).equals(edaVault)
                    )
                    const buyPresaleLiquidityIx = buyPresaleSolIxs.find((ix) =>
                        new PublicKey(ix.parsed.info.destination).equals(
                            getVaultAccountTokenAtaByMint(VaultAccount.Liquidity, WSOL_MINT)
                        )
                    )
                    transferredToEda = fromTokenFormat(buyPresaleEdaIx.parsed.info.lamports)
                    transferredToLiquidity = fromTokenFormat(
                        buyPresaleLiquidityIx.parsed.info.lamports
                    )
                } else {
                    const buyPresaleUsdcIxs = innerInstructions.filter(
                        (ix) => ix.parsed.type === 'transfer' && ix.program == 'spl-token'
                    )
                    const buyPresaleEdaIx = buyPresaleUsdcIxs.find((ix) =>
                        new PublicKey(ix.parsed.info.destination).equals(
                            getVaultAccountTokenAtaByMint(VaultAccount.Eda, getUsdcMint())
                        )
                    )
                    const buyPresaleLiquidityIx = buyPresaleUsdcIxs.find((ix) =>
                        new PublicKey(ix.parsed.info.destination).equals(
                            getVaultAccountTokenAtaByMint(VaultAccount.Liquidity, getUsdcMint())
                        )
                    )
                    transferredToEda = fromTokenFormat(buyPresaleEdaIx.parsed.info.amount, 6)
                    transferredToLiquidity = fromTokenFormat(
                        buyPresaleLiquidityIx.parsed.info.amount,
                        6
                    )
                }
                details = {
                    transferredToEda,
                    transferredToLiquidity,
                    currency: buyPresaleCurrency,
                    paidAmount: transferredToEda + transferredToLiquidity,
                    receivedAmount: fromTokenFormat(decodedInstruction.amount_to_buy),
                    presaleType: presaleTypeFromRustEnum(decodedInstruction.presale_type)
                }
                break
            case 'withdraw_platform_elw':
                const platformReceiverBalance = transaction.meta.postTokenBalances.find(
                    (balance) => !new PublicKey(balance.owner).equals(platformVault)
                )
                details = {
                    receiver: platformReceiverBalance.owner,
                    amount: fromTokenFormat(decodedInstruction.amount)
                }
                break
            case 'burn_platform_elw':
                details = {
                    amount: fromTokenFormat(decodedInstruction.amount)
                }
                break
            case 'claim_elw_reward':
                const rewardReceiverBalance = transaction.meta.postTokenBalances.find(
                    (balance) => !new PublicKey(balance.owner).equals(rewardVault)
                )
                const claimRewardElwIx = innerInstructions.find(
                    (ix) => ix.parsed.type === 'transfer' && ix.program == 'spl-token'
                )
                details = {
                    receiver: rewardReceiverBalance.owner,
                    amount: fromTokenFormat(claimRewardElwIx.parsed.info.amount)
                }
                break
            case 'claim_team_elw':
                const teamReceiverBalance = transaction.meta.postTokenBalances.find(
                    (balance) => !new PublicKey(balance.owner).equals(teamVault)
                )
                const claimTeamElwIx = innerInstructions.find(
                    (ix) => ix.parsed.type === 'transfer' && ix.program == 'spl-token'
                )
                details = {
                    receiver: teamReceiverBalance.owner,
                    amount: fromTokenFormat(claimTeamElwIx.parsed.info.amount)
                }
                break
            case 'withdraw_eda_sol':
                const withdrawEdaSolIx = innerInstructions.find(
                    (ix) => ix.parsed.type === 'transfer' && ix.program == 'system'
                )
                details = {
                    receiver: withdrawEdaSolIx.parsed.info.destination,
                    amount: fromTokenFormat(withdrawEdaSolIx.parsed.info.lamports)
                }
                break
            case 'withdraw_eda_usdc':
            case 'withdraw_eda_elw':
                let edaReceiverBalance = transaction.meta.postTokenBalances.find(
                    (balance) => !new PublicKey(balance.owner).equals(edaVault)
                )
                details = {
                    receiver: edaReceiverBalance.owner,
                    amount: fromTokenFormat(
                        decodedInstruction.amount,
                        edaReceiverBalance.uiTokenAmount.decimals
                    )
                }
                break
            case 'buy_premium':
                const payerBalance = transaction.meta.postTokenBalances.find(
                    (balance) => !new PublicKey(balance.owner).equals(treasuryVault)
                )
                const currency = currencyFromRustEnum(decodedInstruction.currency)
                const buyPremiumBurnIx = innerInstructions.find((ix) => ix.parsed.type === 'burn')
                details = {
                    currency,
                    payer: payerBalance.owner,
                    amount: fromTokenFormat(
                        decodedInstruction.amount_to_pay,
                        getDecimalsByCurrency(currency)
                    ),
                    burnedELW:
                        currency === Currency.ELW
                            ? fromTokenFormat(
                                  buyPremiumBurnIx.parsed.info.amount,
                                  getDecimalsByCurrency(currency)
                              )
                            : undefined
                }
                break
            case 'withdraw_treasury_elw':
            case 'withdraw_treasury_usdc':
                const treasuryReceiverBalance = transaction.meta.postTokenBalances.find(
                    (balance) => !new PublicKey(balance.owner).equals(treasuryVault)
                )
                details = {
                    receiver: treasuryReceiverBalance.owner,
                    amount: fromTokenFormat(
                        decodedInstruction.amount,
                        treasuryReceiverBalance.uiTokenAmount.decimals
                    )
                }
                break
        }
    } else {
        switch (type) {
            case 'upgrade':
                details = 'Upgrade the program'
                break
        }
    }
    return details as TransactionDetails[T]
}

function formatTransactionName(type: TransactionType): string {
    return type
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .split(' ')
        .map((word) =>
            ['Elw', 'Usdc', 'Sol', 'Wsol', 'Eda'].includes(word) ? word.toUpperCase() : word
        )
        .join(' ')
}

async function prepareTransactionResponse(
    transaction: ParsedTransactionWithMeta
): Promise<TransactionResponse> {
    let type = getTransactionType(transaction)
    const firstSigner = transaction?.transaction.message?.accountKeys.find((account) => {
        return account.signer
    })
    return {
        type,
        name: formatTransactionName(type),
        fee: (transaction.meta.fee || 0) / 10 ** 9,
        date: new Date(transaction.blockTime * 1000),
        signer: firstSigner?.pubkey.toBase58() ?? '',
        signature: transaction.transaction.signatures[0],
        details: await transactionDetails(transaction, type)
    }
}

async function _getTransactions(
    address: PublicKey,
    limit: number = 25,
    viaWait: boolean = false,
    lastSignature?: string
) {
    const signatures = await ElowenProgram.connection.getSignaturesForAddress(address, {
        limit,
        before: lastSignature
    })

    let transactions = []

    if (viaWait) {
        for (const { signature } of signatures) {
            await new Promise((resolve) => setTimeout(resolve, 100))
            transactions.push(
                await ElowenProgram.connection.getParsedTransaction(signature, {
                    maxSupportedTransactionVersion: 0
                })
            )
        }
    } else {
        transactions = await ElowenProgram.connection.getParsedTransactions(
            signatures.map(({ signature }) => signature),
            {
                maxSupportedTransactionVersion: 0
            }
        )
    }

    return await Promise.all(
        transactions.map(async (transaction) => {
            if (!transaction) {
                return null
            }
            return await prepareTransactionResponse(transaction)
        })
    )
}

export async function getTransactions(filter?: TransactionsFilter): Promise<TransactionResponse[]> {
    return await _getTransactions(
        ElowenProgram.ID,
        filter?.limit ?? 25,
        filter?.viaWait,
        filter?.lastSignature
    )
}

export function listenTransactions(
    callback: (transaction: TransactionResponse, error?: TransactionError | null) => void,
    vault?: VaultAccount
): () => void {
    const subPubkey = vault ? getVaultAccount(vault) : ElowenProgram.ID
    const subscriptionId = ElowenProgram.connection.onLogs(subPubkey, async (logs) => {
        try {
            callback(
                await prepareTransactionResponse(
                    await ElowenProgram.connection.getParsedTransaction(logs.signature, {
                        maxSupportedTransactionVersion: 0
                    })
                ),
                logs.err
            )
        } catch (error) {
            callback(null, error)
        }
    })

    return () => {
        ElowenProgram.connection.removeOnLogsListener(subscriptionId)
    }
}
