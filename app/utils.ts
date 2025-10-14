import ElowenProgram from './program'
import { BN } from '@coral-xyz/anchor'
import { getVaultPda } from '@sqds/multisig'
import { SolanaAddress, VaultAccount } from './types'
import { getElwMint } from './instructions/platform'
import { ParsedAccountData, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddressSync, NATIVE_MINT } from '@solana/spl-token'

export const WSOL_MINT = NATIVE_MINT

export const USDC_DEVNET = new PublicKey('28zvdJE2BwGLMeqtP1punErLRE38rE2qM7uvVAnXBKaL')
export const USDC_MAINNET = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

export const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
)

export function isSmallerPubKey(firstPubkey: PublicKey, secondPubkey: PublicKey) {
    return Buffer.compare(firstPubkey.toBytes(), secondPubkey.toBytes()) < 0
}

export function toBn(amount: number | string | number[] | Uint8Array | Buffer | BN) {
    return new BN(amount)
}

export function fromBn(amount: BN) {
    return amount.toString()
}

export function toFormat(amount: number, decimals: number = 2) {
    return amount * 10 ** decimals
}

export function fromFormat(amount: number, decimals: number = 2) {
    return amount / 10 ** decimals
}

export function toTokenFormat(amount: number, decimals: number = 9) {
    try {
        return toBn(amount * 10 ** decimals)
    } catch (error) {
        return new BN(amount).mul(new BN(10).pow(new BN(decimals)))
    }
}

export function fromTokenFormat(amount: BN | string | number, decimals: number = 9) {
    if (!(amount instanceof BN)) {
        amount = new BN(amount)
    }
    return Number(fromBn(amount)) / 10 ** decimals
}

export function formatNumber(number: number | string, decimals: number = 2) {
    const num = Number(number)
    const useDecimals = num < 0.01 && num !== 0 ? decimals : 2
    return num.toLocaleString('en-US', {
        minimumFractionDigits: useDecimals,
        maximumFractionDigits: useDecimals
    })
}

export function fixDecimals(value: number, decimals: number) {
    return Math.floor(value * 10 ** decimals) / 10 ** decimals
}

export function maybeToPublicKey(value: SolanaAddress) {
    return typeof value === 'string' ? new PublicKey(value) : value
}

export function getUsdcMint() {
    if (ElowenProgram.cluster === 'devnet') {
        return USDC_DEVNET
    } else if (ElowenProgram.cluster === 'mainnet-beta') {
        return USDC_MAINNET
    } else {
        throw new Error('Invalid cluster')
    }
}

export function getVaultAccount(vault: VaultAccount) {
    const [pda, _bump] = PublicKey.findProgramAddressSync([Buffer.from(vault)], ElowenProgram.ID)
    return pda
}

export function getMembers() {
    if (ElowenProgram.cluster === 'devnet') {
        return [
            new PublicKey('2FuPdqnyPAGRBtsURuzVpjiYePqCQMLENBz6ZAsLUxxw'),
            new PublicKey('9AVAef1rAuyhzyjJxquUBjEgWn9zyoN4ZRZuSaibSaEv'),
            new PublicKey('5QvcwUs3DkxcY1FHj7hjSFcrYyvXhhXkpFSGk94PLkV')
        ]
    } else if (ElowenProgram.cluster === 'mainnet-beta') {
        return [
            new PublicKey('EXPjTRuSHDSMxzxd8UbhcaktyPBn1Eg3ZZFJKn77zrp2'),
            new PublicKey('7XeTie8StTYcH4XDePKJ6Gjz24o5RurYX2DU2uWFpnk6'),
            new PublicKey('5n7c3o6cS9zjt3c6yDNDi3eXBRFoRitunaQuLMmEyqcW')
        ]
    } else {
        throw new Error('Invalid cluster')
    }
}

export function getMultisigPda() {
    if (ElowenProgram.cluster === 'devnet') {
        return new PublicKey('Afym3upPd2uJcUQfQz9gcC9ieRKf8HidFpouDnstTmek')
    } else if (ElowenProgram.cluster === 'mainnet-beta') {
        return new PublicKey('Afym3upPd2uJcUQfQz9gcC9ieRKf8HidFpouDnstTmek')
    } else {
        throw new Error('Invalid cluster')
    }
}

export function getMultisigVaultPda(index: number = 0) {
    const multisigPda = getMultisigPda()
    const [vaultPda] = getVaultPda({
        multisigPda,
        index
    })
    return vaultPda
}

export async function getTokenAccountInfo(address: PublicKey): Promise<ParsedAccountData | null> {
    const result = await ElowenProgram.connection.getParsedAccountInfo(address)
    return result.value ? (result.value.data as ParsedAccountData) : null
}

export async function getVaultAccountElwAta(vault: VaultAccount) {
    return getAssociatedTokenAddressSync(await getElwMint(), getVaultAccount(vault), true)
}

export async function getVaultAccountWithElwAta(vault: VaultAccount) {
    const account = getVaultAccount(vault)
    const elwAta = await getVaultAccountElwAta(vault)
    return {
        account,
        elwAta
    }
}