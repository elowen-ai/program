import ElowenProgram from '../program'
import { VaultAccount } from '../types'
import {
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    AddressLookupTableProgram,
    Transaction,
    PublicKey
} from '@solana/web3.js'
import {
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token'
import {
    getAmmConfig,
    getCpSwapProgramId,
    getLockingProgramId,
    getVaultAccount,
    TOKEN_METADATA_PROGRAM_ID
} from '../utils'

export async function createAddressLookupTableTransaction() {
    const slot = await ElowenProgram.connection.getSlot()

    const [lookupTableIx, lookupTableAddress] = AddressLookupTableProgram.createLookupTable({
        authority: ElowenProgram.provider.wallet.publicKey,
        payer: ElowenProgram.provider.wallet.publicKey,
        recentSlot: slot
    })

    const addAddressesIx = AddressLookupTableProgram.extendLookupTable({
        payer: ElowenProgram.provider.wallet.publicKey,
        authority: ElowenProgram.provider.wallet.publicKey,
        lookupTable: lookupTableAddress,
        addresses: [
            getAmmConfig(),
            TOKEN_PROGRAM_ID,
            SYSVAR_RENT_PUBKEY,
            TOKEN_2022_PROGRAM_ID,
            TOKEN_METADATA_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID,
            SystemProgram.programId,
            getCpSwapProgramId(),
            getLockingProgramId(),
            getVaultAccount(VaultAccount.Platform)
        ]
    })

    const saveAddressLookupTableIx = await ElowenProgram.methods
        .saveAddressLookupTable(lookupTableAddress)
        .instruction()

    return new Transaction().add(lookupTableIx, addAddressesIx, saveAddressLookupTableIx)
}

export async function getAddressLookupTableAddress() {
    const result = await ElowenProgram.accounts.addressLookupTableAccount.fetchNullable(
        PublicKey.findProgramAddressSync([Buffer.from('alt')], ElowenProgram.ID)[0]
    )
    if (!result) {
        throw new Error('Address lookup table not found')
    }
    return result.lookupTable
}
