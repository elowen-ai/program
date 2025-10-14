import './common'
import { createAddressLookupTableTransaction, signAndSendTransaction } from '../app'

describe('Create alt', () => {
    it('Try with correct signer', async () => {
        const txSig = await signAndSendTransaction(await createAddressLookupTableTransaction())
        console.log('Your transaction signature', txSig)
    })
})
