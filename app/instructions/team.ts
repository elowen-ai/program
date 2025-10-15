import ElowenProgram from '../program'
import { getElwMint } from './platform'
import { VaultAccount, SolanaAddress } from '../types'
import { PublicKey, Transaction } from '@solana/web3.js'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import {
    formatNumber,
    fromTokenFormat,
    getTokenAccountInfo,
    getVaultAccountElwAta,
    maybeToPublicKey
} from '../utils'

export async function createClaimTeamMemberElwInstruction(teamMember: SolanaAddress) {
    const [elwMint, teamTokenAta] = await Promise.all([
        getElwMint(),
        getVaultAccountElwAta(VaultAccount.Team)
    ])
    return ElowenProgram.methods
        .claimTeamElw()
        .accounts({
            elwMint,
            member: maybeToPublicKey(teamMember)
        })
        .accountsPartial({
            teamTokenAta,
            memberTokenAta: getAssociatedTokenAddressSync(elwMint, maybeToPublicKey(teamMember))
        })
        .instruction()
}

export async function createClaimTeamMemberElwTransaction(teamMember: SolanaAddress) {
    return new Transaction().add(await createClaimTeamMemberElwInstruction(teamMember))
}

export async function getTeamMemberClaimAccountData(userWallet: SolanaAddress) {
    const [pda, _bump] = PublicKey.findProgramAddressSync(
        [Buffer.from('member'), maybeToPublicKey(userWallet).toBuffer()],
        ElowenProgram.ID
    )
    const result = await ElowenProgram.accounts.memberClaimAccount.fetchNullable(pda)
    if (!result) {
        return null
    }
    return {
        member: maybeToPublicKey(userWallet),
        amount: fromTokenFormat(result.amount),
        lastPeriod: result.lastPeriod.toNumber(),
        amountFormatted: formatNumber(fromTokenFormat(result.amount)),
        lastPeriodFormatted: new Date(result.lastPeriod.toNumber() * 1000).toLocaleString()
    }
}

export async function getTeamVaultElwBalance() {
    const result = await getTokenAccountInfo(await getVaultAccountElwAta(VaultAccount.Team))
    const teamElw = result?.parsed.info.tokenAmount || { uiAmount: 0 }
    return {
        amount: teamElw.uiAmount,
        amountFormatted: formatNumber(teamElw.uiAmount)
    }
}
