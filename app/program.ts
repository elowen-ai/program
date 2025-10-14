import { loadLogger } from './logger'
import { IDLType, ErrorCode } from './types'
import { Umi } from '@metaplex-foundation/umi'
import programIdl from '../target/idl/elowen.json'
import type { Elowen } from '../target/types/elowen'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata'
import {
    Cluster,
    Commitment,
    VersionedTransaction,
    SendTransactionError,
    Connection,
    PublicKey,
    Transaction,
    Signer
} from '@solana/web3.js'
import {
    Wallet,
    Program,
    BorshCoder,
    AnchorProvider,
    MethodsNamespace,
    AccountNamespace,
    IdlEvents
} from '@coral-xyz/anchor'

export const IDL = programIdl

export { Wallet } from '@coral-xyz/anchor'

export const coder = new BorshCoder(programIdl as IDLType)

export async function confirmTransaction(signature: string) {
    const latestBlockHash = await ElowenProgram.connection.getLatestBlockhash()
    return await ElowenProgram.connection.confirmTransaction(
        {
            signature,
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight
        },
        'confirmed'
    )
}

export async function getLatestBlockhash() {
    const latestBlockhash = await ElowenProgram.connection.getLatestBlockhash()
    return {
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    }
}

export function errorMap(error: SendTransactionError) {
    loadLogger().then((logger) => logger.error(error))

    let matchedCode = Object.values(ErrorCode).find((code) => error.message.includes(code))

    if (matchedCode) {
        return new Error(matchedCode)
    }

    if (error.message.includes('signer. Error Code: ConstraintRaw')) {
        return new Error(ErrorCode.Unauthorized)
    }

    return error
}

export async function signAndSendTransaction(
    transaction: Transaction | VersionedTransaction,
    signers: Signer[] = [],
    wallet?: Wallet,
    disableFilling: boolean = false
) {
    try {
        if (transaction instanceof Transaction && !disableFilling) {
            transaction = await fillTransactionRequirements(transaction, wallet?.publicKey)
        }
        const signedTx = await (wallet ?? ElowenProgram.provider.wallet).signTransaction(
            transaction
        )
        if (signedTx instanceof VersionedTransaction) {
            signedTx.sign(signers)
        } else {
            if (signers.length > 0) {
                signedTx.partialSign(...signers)
            }
        }
        const signature = await ElowenProgram.connection.sendRawTransaction(signedTx.serialize())
        await confirmTransaction(signature)
        return signature
    } catch (error) {
        throw errorMap(error)
    }
}

export async function fillTransactionRequirements(transaction: Transaction, payer?: PublicKey) {
    const result = await getLatestBlockhash()
    transaction.recentBlockhash = result.blockhash
    transaction.feePayer = payer ?? ElowenProgram.wallet.publicKey
    return transaction
}

export function initializeProgram(connection: Connection, wallet: Wallet, cluster: Cluster) {
    new ElowenProgram(connection, wallet, cluster)
}

export default class ElowenProgram {
    private static isInitialized: boolean = false

    private static program: Program<Elowen>

    private static _cluster: Cluster

    private static _programId: PublicKey

    private static _connection: Connection

    private static _provider: AnchorProvider

    private static _methods: MethodsNamespace<Elowen>

    private static _accounts: AccountNamespace<IDLType>

    private static _umi: Umi

    static addEventListener<E extends keyof IdlEvents<Elowen>>(
        eventName: E & string,
        callback: (event: IdlEvents<Elowen>[E], slot: number, signature: string) => void,
        commitment?: Commitment
    ): number {
        return ElowenProgram.program.addEventListener(eventName, callback, commitment)
    }

    static removeEventListener(subscriptionId: number) {
        return ElowenProgram.program.removeEventListener(subscriptionId)
    }

    constructor(connection: Connection, wallet: Wallet, cluster: Cluster) {
        const provider = new AnchorProvider(connection, wallet)
        const program = new Program<Elowen>(programIdl, provider)
        ElowenProgram.program = program
        ElowenProgram.isInitialized = true
        ElowenProgram._cluster = cluster
        ElowenProgram._provider = provider
        ElowenProgram._connection = connection
        ElowenProgram._methods = program.methods
        ElowenProgram._accounts = program.account
        ElowenProgram._programId = program.programId
        ElowenProgram._umi = createUmi(connection).use(mplTokenMetadata())
    }

    static get cluster() {
        if (!ElowenProgram.isInitialized) {
            throw new Error('ElowenProgram is not initialized')
        }
        return ElowenProgram._cluster
    }

    static get connection() {
        if (!ElowenProgram.isInitialized) {
            throw new Error('ElowenProgram is not initialized')
        }
        return ElowenProgram._connection
    }

    static get ID() {
        if (!ElowenProgram.isInitialized) {
            throw new Error('ElowenProgram is not initialized')
        }
        return ElowenProgram._programId
    }

    static get provider() {
        if (!ElowenProgram.isInitialized) {
            throw new Error('ElowenProgram is not initialized')
        }
        return ElowenProgram._provider
    }

    static get methods() {
        if (!ElowenProgram.isInitialized) {
            throw new Error('ElowenProgram is not initialized')
        }
        return ElowenProgram._methods
    }

    static get accounts() {
        if (!ElowenProgram.isInitialized) {
            throw new Error('ElowenProgram is not initialized')
        }
        return ElowenProgram._accounts
    }

    static get wallet() {
        if (!ElowenProgram.isInitialized) {
            throw new Error('ElowenProgram is not initialized')
        }
        return ElowenProgram._provider.wallet
    }

    static get umi() {
        if (!ElowenProgram.isInitialized) {
            throw new Error('ElowenProgram is not initialized')
        }
        return ElowenProgram._umi
    }
}
