import { clientWallet } from '../common'
import { PresaleType, getPresalePurchaseAccountData } from '../../app'
;(async () => {
    const presalePurchaseAccount = await getPresalePurchaseAccountData(
        clientWallet.publicKey,
        PresaleType.ThreeMonthsLockup
    )
    console.log('Presale purchase account', presalePurchaseAccount)
    const presalePurchaseAccount2 = await getPresalePurchaseAccountData(
        clientWallet.publicKey,
        PresaleType.SixMonthsLockup
    )
    console.log('Presale purchase account', presalePurchaseAccount2)
})()
