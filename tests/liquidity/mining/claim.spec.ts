import { expect } from 'chai'
import { clientWallet, clientWallet2 } from '../../common'
import {
    Currency,
    ErrorCode,
    createClaimMiningRewardsTransaction,
    signAndSendTransaction
} from '../../../app'

describe('Liquidity Mining Claim', () => {
    it('Claim USDC pool rewards for client 1', async () => {
        let result: any
        try {
            const transaction = await createClaimMiningRewardsTransaction(
                clientWallet.publicKey,
                Currency.USDC
            )
            const txSig = await signAndSendTransaction(transaction, [], clientWallet)
            console.log('Your transaction signature', txSig)
            result = true
        } catch (error: any) {
            result = error.message === ErrorCode.NoClaimableRewards
        }
        expect(result).to.be.equal(true)
    })
    it('Claim SOL pool rewards for client 1', async () => {
        let result: any
        try {
            const transaction = await createClaimMiningRewardsTransaction(
                clientWallet.publicKey,
                Currency.SOL
            )
            const txSig = await signAndSendTransaction(transaction, [], clientWallet)
            console.log('Your transaction signature', txSig)
            result = true
        } catch (error: any) {
            result = error.message === ErrorCode.NoClaimableRewards
        }
        expect(result).to.be.equal(true)
    })
    it('Claim USDC pool rewards for client 2', async () => {
        let result: any
        try {
            const transaction = await createClaimMiningRewardsTransaction(
                clientWallet2.publicKey,
                Currency.USDC
            )
            const txSig = await signAndSendTransaction(transaction, [], clientWallet2)
            console.log('Your transaction signature', txSig)
            result = true
        } catch (error: any) {
            result = error.message === ErrorCode.NoClaimableRewards
        }
        expect(result).to.be.equal(true)
    })
    it('Claim SOL pool rewards for client 2', async () => {
        let result: any
        try {
            const transaction = await createClaimMiningRewardsTransaction(
                clientWallet2.publicKey,
                Currency.SOL
            )
            const txSig = await signAndSendTransaction(transaction, [], clientWallet2)
            console.log('Your transaction signature', txSig)
            result = true
        } catch (error: any) {
            result = error.message === ErrorCode.NoClaimableRewards
        }
        expect(result).to.be.equal(true)
    })
})
