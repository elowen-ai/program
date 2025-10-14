import ElowenProgram from '../program'
import { isSmallerPubKey, WSOL_MINT, getUsdcMint } from '../utils'
import { Transaction, ComputeBudgetProgram, Keypair } from '@solana/web3.js'

function findVanityTokenMint() {
    let attempts = 0
    const prefix = 'ELW'
    const USDC_MINT = getUsdcMint()
    while (true) {
        const keypair = Keypair.generate()
        const pubkey = keypair.publicKey

        if (
            pubkey.toBase58().startsWith(prefix) &&
            isSmallerPubKey(pubkey, USDC_MINT) &&
            isSmallerPubKey(pubkey, WSOL_MINT)
        ) {
            return keypair
        }

        if (++attempts % 10000 === 0) {
            console.log(`${attempts} attempts...`)
        }
    }
}

function findSmallerTokenMint() {
    let attempts = 0
    const USDC_MINT = getUsdcMint()
    while (true) {
        const keypair = Keypair.generate()
        const pubkey = keypair.publicKey

        if (isSmallerPubKey(pubkey, USDC_MINT) && isSmallerPubKey(pubkey, WSOL_MINT)) {
            return keypair
        }

        if (++attempts % 10000 === 0) {
            console.log(`${attempts} attempts...`)
        }
    }
}

export async function createInitializeElwInstruction(metadataUri: string, vanity = false) {
    const elwMint = vanity ? findVanityTokenMint() : findSmallerTokenMint()
    const instruction = await ElowenProgram.methods
        .initializeElw(metadataUri)
        .accounts({
            elwMint: elwMint.publicKey,
            signer: ElowenProgram.wallet.publicKey
        })
        .signers([elwMint])
        .instruction()

    return { instruction, elwMint }
}

export async function createInitializeElwTransaction(metadataUri: string, vanity = false) {
    const { instruction, elwMint } = await createInitializeElwInstruction(metadataUri, vanity)
    const transaction = new Transaction().add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 8 }),
        instruction
    )
    return { transaction, elwMint }
}
