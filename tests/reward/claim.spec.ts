import { expect } from 'chai'
import { clientWallet } from '../common'
import { Wallet } from '@coral-xyz/anchor'
import ElowenProgram, {
    ErrorCode,
    VaultAccount,
    createClaimElwRewardTransaction,
    getRewardAccountData,
    getVaultAccount,
    signAndSendTransaction
} from '../../app'

const initialTime = 1765756800

const getMonthLaterTimestamp = (month: number): number => {
    const date = new Date(initialTime * 1000)
    date.setUTCMonth(date.getUTCMonth() + month)
    return Math.floor(date.getTime() / 1000)
}

const claimableRewards = [
    {
        timestamp: getMonthLaterTimestamp(0), // 62500000
        percentage: 2 // 2% of 62500000 = 1250000
    },
    {
        timestamp: getMonthLaterTimestamp(1), // 62500000
        percentage: 5 // 5% of 62500000 = 3125000
    },
    {
        timestamp: getMonthLaterTimestamp(2), // 62500000
        percentage: 8 // 8% of 62500000 = 5000000
    },
    {
        timestamp: getMonthLaterTimestamp(3), // 62500000
        percentage: 10 // 10% of 62500000 = 6250000
    },
    {
        timestamp: getMonthLaterTimestamp(4), // 31250000
        percentage: 2 // 2% of 31250000 = 625000
    },
    {
        timestamp: getMonthLaterTimestamp(5), // 31250000
        percentage: 6 // 6% of 31250000 = 1875000
    },
    {
        timestamp: getMonthLaterTimestamp(6), // 31250000
        percentage: 7 // 7% of 31250000 = 2187500
    },
    {
        timestamp: getMonthLaterTimestamp(7), // 31250000
        percentage: 3 // 3% of 31250000 = 937500
    },
    {
        timestamp: getMonthLaterTimestamp(8), // 15625000
        percentage: 1 // 1% of 15625000 = 156250
    },
    {
        timestamp: getMonthLaterTimestamp(9), // 15625000
        percentage: 7 // 7% of 15625000 = 1093750
    },
    {
        timestamp: getMonthLaterTimestamp(10), // 15625000
        percentage: 3 // 3% of 15625000 = 468750
    },
    {
        timestamp: getMonthLaterTimestamp(11), // 15625000
        percentage: 12 // 12% of 15625000 = 1875000
    }
]

// total distributed = (62500000 * 4) + (31250000 * 4) + (15625000 * 4) = 437500000

// total reward first 6 month = 1250000 + 3125000 + 5000000 + 6250000 + 625000 + 1875000 = 18125000
// total reward last 6 month = 2187500 + 937500 + 156250 + 1093750 + 468750 + 1875000 = 6718750

// total reward = 18125000 + 6718750 = 24843750
// percentage = 24843750 / 500000000 * 100 = 4.97

const initialReward = 24843750
const initialPercentage = 4.97

describe('Claim rewards', () => {
    // test for unauthorized access
    afterEach(() => {
        // @ts-ignore - for test
        ElowenProgram._provider.wallet = Wallet.local()
    })
    it('Withdraw bulk reward without platform signer (partialSign)', async () => {
        try {
            const claimableRewards = [
                {
                    timestamp: getMonthLaterTimestamp(0),
                    percentage: 2
                }
            ]
            // @ts-ignore - for test
            ElowenProgram._provider.wallet = clientWallet
            const { transaction } = await createClaimElwRewardTransaction(
                clientWallet.publicKey,
                claimableRewards
            )
            const txSig = await signAndSendTransaction(transaction, [], clientWallet)
            console.log('Your transaction signature', txSig)
        } catch (error: any) {
            expect(error.message).to.be.equal(ErrorCode.Unauthorized)
        }
    })

    // test for client access also signer have to be our wallet
    it('Withdraw bulk reward as a client', async () => {
        let result: any
        try {
            const { transaction, signerWallet } = await createClaimElwRewardTransaction(
                clientWallet.publicKey,
                claimableRewards
            )
            const rewardAccountBefore = await getRewardAccountData(clientWallet.publicKey)
            const txSig = await signAndSendTransaction(transaction, [signerWallet], clientWallet)
            const rewardAccountAfter = await getRewardAccountData(clientWallet.publicKey)
            expect(rewardAccountAfter?.amount).to.be.equal(
                (rewardAccountBefore?.amount ?? 0) + initialReward
            )
            expect(rewardAccountAfter?.percentage).to.be.equal(
                (rewardAccountBefore?.percentage ?? 0) + initialPercentage
            )
            expect(rewardAccountAfter?.receiver.toBase58()).to.be.equal(
                clientWallet.publicKey.toBase58()
            )
            console.log('Your transaction signature', txSig)
            result = true
        } catch (error: any) {
            result = error.message === ErrorCode.ClaimableRewardNotReady
        }
        expect(result).to.be.equal(true)
    })

    // test for platform access, signer have to be same receiver wallet
    it('Withdraw bulk reward as a platform', async () => {
        let result: any
        try {
            const platformPda = getVaultAccount(VaultAccount.Platform)
            const { transaction, signerWallet } = await createClaimElwRewardTransaction(
                ElowenProgram.wallet.publicKey,
                claimableRewards
            )
            const rewardAccountBefore = await getRewardAccountData(platformPda)
            const txSig = await signAndSendTransaction(transaction, [signerWallet])
            const rewardAccountAfter = await getRewardAccountData(platformPda)
            expect(rewardAccountAfter?.amount).to.be.equal(
                (rewardAccountBefore?.amount ?? 0) + initialReward
            )
            expect(rewardAccountAfter?.percentage).to.be.equal(
                (rewardAccountBefore?.percentage ?? 0) + initialPercentage
            )
            expect(rewardAccountAfter?.receiver.toBase58()).to.be.equal(platformPda.toBase58())
            console.log('Your transaction signature', txSig)
            result = true
        } catch (error: any) {
            result = error.message === ErrorCode.ClaimableRewardNotReady
        }
        expect(result).to.be.equal(true)
    })
})
