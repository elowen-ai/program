import ElowenProgram from '../program'
import { getElwMint } from './platform'
import { PublicKey, Signer, Transaction } from '@solana/web3.js'
import { ClaimableReward, SolanaAddress, VaultAccount } from '../types'
import {
    formatNumber,
    fromFormat,
    fromTokenFormat,
    getTokenAccountInfo,
    getVaultAccount,
    getVaultAccountElwAta,
    maybeToPublicKey,
    toBn,
    toFormat
} from '../utils'

export async function createClaimElwRewardInstruction(
    userWallet: SolanaAddress,
    claimableRewards: ClaimableReward[]
) {
    const [elwMint, rewardTokenAta] = await Promise.all([
        getElwMint(),
        getVaultAccountElwAta(VaultAccount.Reward)
    ])
    let ataAuthority: PublicKey
    if (maybeToPublicKey(userWallet).equals(ElowenProgram.provider.wallet.publicKey)) {
        ataAuthority = getVaultAccount(VaultAccount.Platform)
    } else {
        ataAuthority = maybeToPublicKey(userWallet)
    }
    const instruction = await ElowenProgram.methods
        .claimElwReward(
            claimableRewards.map((reward) => ({
                timestamp: toBn(reward.timestamp),
                percentage: toFormat(reward.percentage)
            }))
        )
        .accounts({
            elwMint,
            ataAuthority,
            rewardTokenAta,
            signer: ElowenProgram.wallet.publicKey,
            receiver: maybeToPublicKey(userWallet)
        })
        .signers([ElowenProgram.wallet.payer])
        .instruction()

    return { instruction, signerWallet: ElowenProgram.wallet.payer as Signer }
}

export async function createClaimElwRewardTransaction(
    userWallet: SolanaAddress,
    claimableRewards: ClaimableReward[]
) {
    const { instruction, signerWallet } = await createClaimElwRewardInstruction(
        userWallet,
        claimableRewards
    )
    const transaction = new Transaction().add(instruction)
    return { transaction, signerWallet }
}

export async function getRewardVaultElwBalance() {
    const result = await getTokenAccountInfo(await getVaultAccountElwAta(VaultAccount.Reward))
    const rewardElw = result?.parsed.info.tokenAmount || { uiAmount: 0 }
    return {
        amount: rewardElw.uiAmount,
        amountFormatted: formatNumber(rewardElw.uiAmount)
    }
}

export async function getRewardAccountData(userWallet: SolanaAddress) {
    const [pda, _bump] = PublicKey.findProgramAddressSync(
        [Buffer.from('reward'), maybeToPublicKey(userWallet).toBuffer()],
        ElowenProgram.ID
    )
    const result = await ElowenProgram.accounts.rewardAccount.fetchNullable(pda)
    if (!result) {
        return null
    }
    return {
        receiver: maybeToPublicKey(userWallet),
        amount: fromTokenFormat(result.amount),
        percentage: fromFormat(result.percentage)
    }
}
