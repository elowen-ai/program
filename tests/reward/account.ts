import { clientWallet } from '../common'
import { getVaultAccount, getRewardAccountData, VaultAccount } from '../../app'
;(async () => {
    const platformPda = getVaultAccount(VaultAccount.Platform)
    const clientRewardAccount = await getRewardAccountData(clientWallet.publicKey)
    const platformRewardAccount = await getRewardAccountData(platformPda)
    console.log('Client reward account', clientRewardAccount)
    console.log('Platform reward account', platformRewardAccount)
})()
