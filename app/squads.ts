import { SolanaAddress } from './types'
import { Keypair } from '@solana/web3.js'
import ElowenProgram, { getLatestBlockhash } from './program'
import { getAddressLookupTableAddress } from './instructions'
import { getMembers, getMultisigPda, getMultisigVaultPda, maybeToPublicKey } from './utils'
import {
    Transaction,
    VersionedTransaction,
    TransactionMessage,
    TransactionInstruction
} from '@solana/web3.js'
import {
    types,
    accounts,
    getVaultPda,
    transactions,
    instructions,
    getProgramConfigPda,
    getMultisigPda as getMultisigPdaSq,
    getProposalPda
} from '@sqds/multisig'

export async function createMultisigWalletTransaction(creator: SolanaAddress) {
    const members = getMembers()
    const threshold = members.length
    creator = maybeToPublicKey(creator)

    if (!members.some((member) => member.equals(creator))) {
        throw new Error('Creator is not a member of the multisig')
    }

    const createKey = Keypair.generate()

    const [multisigPda] = getMultisigPdaSq({
        createKey: createKey.publicKey
    })

    const [multisigVaultPda] = getVaultPda({
        multisigPda,
        index: 0
    })

    const programConfig = await accounts.ProgramConfig.fromAccountAddress(
        ElowenProgram.connection,
        getProgramConfigPda({})[0]
    )

    const treasury = programConfig.treasury

    const { blockhash } = await getLatestBlockhash()

    const transaction = transactions.multisigCreateV2({
        blockhash,
        treasury,
        creator,
        threshold,
        multisigPda,
        timeLock: 0,
        rentCollector: null,
        configAuthority: null,
        createKey: createKey.publicKey,
        members: members.map((member) => ({
            key: member,
            permissions: types.Permissions.all()
        }))
    })

    return { transaction, createKey, multisigPda, multisigVaultPda }
}

export async function createProposalCreateTransaction(
    memo: string,
    member: SolanaAddress,
    _transaction: Transaction | VersionedTransaction
) {
    member = maybeToPublicKey(member)
    const multisigPda = getMultisigPda()
    const { blockhash } = await getLatestBlockhash()

    const multisigInfo = await accounts.Multisig.fromAccountAddress(
        ElowenProgram.connection,
        multisigPda
    )

    const transactionIndex = BigInt(Number(multisigInfo.transactionIndex) + 1)

    let transactionMessage: TransactionMessage
    if (_transaction instanceof Transaction) {
        transactionMessage = new TransactionMessage({
            recentBlockhash: blockhash,
            payerKey: getMultisigVaultPda(),
            instructions: _transaction.instructions
        })
    } else if (_transaction instanceof VersionedTransaction) {
        transactionMessage = TransactionMessage.decompile(_transaction.message)
        transactionMessage.payerKey = getMultisigVaultPda()
    }

    const { value: addressLookupTableAccount } =
        await ElowenProgram.connection.getAddressLookupTable(await getAddressLookupTableAddress())

    const vaultIx = instructions.vaultTransactionCreate({
        memo,
        multisigPda,
        vaultIndex: 0,
        creator: member,
        ephemeralSigners: 0,
        transactionIndex: transactionIndex,
        transactionMessage: transactionMessage,
        addressLookupTableAccounts: [addressLookupTableAccount]
    })

    const proposalIx = instructions.proposalCreate({
        multisigPda,
        creator: member,
        transactionIndex
    })

    const approveIx = instructions.proposalApprove({
        member,
        multisigPda,
        transactionIndex
    })

    const transaction = new VersionedTransaction(
        new TransactionMessage({
            payerKey: member,
            recentBlockhash: blockhash,
            instructions: [vaultIx, proposalIx, approveIx]
        }).compileToV0Message()
    )

    return { transaction, transactionIndex: Number(transactionIndex) }
}

async function createTransactionExecuteInstruction(
    member: SolanaAddress,
    transactionIndex: number
) {
    const multisigPda = getMultisigPda()
    member = maybeToPublicKey(member)

    return await instructions.vaultTransactionExecute({
        member,
        multisigPda,
        connection: ElowenProgram.connection,
        transactionIndex: BigInt(transactionIndex)
    })
}

export async function createTransactionExecuteTransaction(
    member: SolanaAddress,
    transactionIndex: number
) {
    member = maybeToPublicKey(member)

    const { instruction, lookupTableAccounts } = await createTransactionExecuteInstruction(
        member,
        transactionIndex
    )

    const { blockhash } = await getLatestBlockhash()

    return new VersionedTransaction(
        new TransactionMessage({
            payerKey: member,
            recentBlockhash: blockhash,
            instructions: [instruction]
        }).compileToV0Message(lookupTableAccounts)
    )
}

export async function createProposalApproveTransaction(
    member: SolanaAddress,
    transactionIndex: number,
    executeTransaction: boolean = false
) {
    const multisigPda = getMultisigPda()
    member = maybeToPublicKey(member)

    let lookupTableAccountList = []
    const instructionList: TransactionInstruction[] = []
    instructionList.push(
        instructions.proposalApprove({
            member,
            multisigPda,
            transactionIndex: BigInt(transactionIndex)
        })
    )

    const { blockhash } = await getLatestBlockhash()

    if (executeTransaction) {
        const { instruction, lookupTableAccounts } = await createTransactionExecuteInstruction(
            member,
            transactionIndex
        )
        instructionList.push(instruction)
        lookupTableAccountList = lookupTableAccounts || []
    }

    return new VersionedTransaction(
        new TransactionMessage({
            payerKey: member,
            recentBlockhash: blockhash,
            instructions: instructionList
        }).compileToV0Message(lookupTableAccountList)
    )
}

export async function createProposalRejectTransaction(
    member: SolanaAddress,
    transactionIndex: number
) {
    const multisigPda = getMultisigPda()
    member = maybeToPublicKey(member)

    const rejectIx = instructions.proposalReject({
        member,
        multisigPda,
        transactionIndex: BigInt(transactionIndex)
    })

    const { blockhash } = await getLatestBlockhash()

    return new VersionedTransaction(
        new TransactionMessage({
            payerKey: member,
            recentBlockhash: blockhash,
            instructions: [rejectIx]
        }).compileToV0Message()
    )
}

export async function createProposalCancelTransaction(
    member: SolanaAddress,
    transactionIndex: number
) {
    const multisigPda = getMultisigPda()
    member = maybeToPublicKey(member)

    const cancelIx = instructions.proposalCancel({
        member,
        multisigPda,
        transactionIndex: BigInt(transactionIndex)
    })

    const { blockhash } = await getLatestBlockhash()

    return new VersionedTransaction(
        new TransactionMessage({
            payerKey: member,
            recentBlockhash: blockhash,
            instructions: [cancelIx]
        }).compileToV0Message()
    )
}

export async function getProposal(transactionIndex: number) {
    const multisigPda = getMultisigPda()
    const [proposalPda] = getProposalPda({
        multisigPda,
        transactionIndex: BigInt(transactionIndex)
    })
    return accounts.Proposal.fromAccountAddress(ElowenProgram.connection, proposalPda)
}
