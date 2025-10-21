import { clientWallet, clientWallet2 } from '../common'
import { getTeamMemberClaimAccountData } from '../../app'
import { PublicKey } from '@solana/web3.js'
;(async () => {
    const claimData1 = await getTeamMemberClaimAccountData(
        new PublicKey('9HGJSAC4HAwtQEpGSDNSWxDsksBVUFHVDUnu5JbhVwnK')
    )
    console.log('Client member claim account 1', claimData1)

    const claimData2 = await getTeamMemberClaimAccountData(clientWallet.publicKey)
    console.log('Client member claim account 2', claimData2)

    const claimData3 = await getTeamMemberClaimAccountData(clientWallet2.publicKey)
    console.log('Client member claim account 3', claimData3)
})()
