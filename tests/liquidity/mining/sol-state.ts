import { clientWallet, clientWallet2 } from '../../common'
import { Currency, getMinerStateAccountData, getMiningStateAccountData } from '../../../app'
;(async () => {
    const miningSolState = await getMiningStateAccountData(Currency.SOL)

    console.log('Mining SOL State', miningSolState)

    const c1MinerSolStateAccount = await getMinerStateAccountData(
        clientWallet.publicKey,
        Currency.SOL,
        miningSolState
    )

    console.log('Client 1 Miner SOL State', c1MinerSolStateAccount)

    const c2MinerSolStateAccount = await getMinerStateAccountData(
        clientWallet2.publicKey,
        Currency.SOL,
        miningSolState
    )

    console.log('Client 2 Miner SOL State', c2MinerSolStateAccount)
})()
