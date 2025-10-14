import ElowenProgram from './program'
import { PublicKey } from '@solana/web3.js'
import { NATIVE_MINT } from '@solana/spl-token'
import { VaultAccount } from './types'

export const WSOL_MINT = NATIVE_MINT

export const USDC_DEVNET = new PublicKey('28zvdJE2BwGLMeqtP1punErLRE38rE2qM7uvVAnXBKaL')
export const USDC_MAINNET = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

export const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
)

export function isSmallerPubKey(firstPubkey: PublicKey, secondPubkey: PublicKey) {
    return Buffer.compare(firstPubkey.toBytes(), secondPubkey.toBytes()) < 0
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
