import { clientWallet, clientWallet2 } from '../../common'
import { Currency, getMinerStateAccountData, getMiningStateAccountData } from '../../../app'
;(async () => {
    const miningSolState = await getMiningStateAccountData(Currency.USDC)

    console.log('Mining USDC State', miningSolState)

    const c1MinerUsdcStateAccount = await getMinerStateAccountData(
        clientWallet.publicKey,
        Currency.USDC,
        miningSolState
    )

    console.log('Client 1 Miner USDC State', c1MinerUsdcStateAccount)

    const c2MinerUsdcStateAccount = await getMinerStateAccountData(
        clientWallet2.publicKey,
        Currency.USDC,
        miningSolState
    )

    console.log('Client 2 Miner USDC State', c2MinerUsdcStateAccount)
})()
