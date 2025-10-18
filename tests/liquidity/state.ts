import '../common'
import { PublicKey } from '@solana/web3.js'
import { Currency, getLpStateByCurrency } from '../../app'
;(async () => {
    const usdcLpStateAccount = await getLpStateByCurrency(Currency.USDC)
    console.log(
        'USDC LP State',
        Object.fromEntries(
            Object.entries(usdcLpStateAccount as any).map(([key, value]) => {
                if (value instanceof PublicKey) {
                    return [key, value.toString()]
                }
                return [key, value]
            })
        )
    )
    const solLpStateAccount = await getLpStateByCurrency(Currency.SOL)
    console.log(
        'SOL LP State',
        Object.fromEntries(
            Object.entries(solLpStateAccount as any).map(([key, value]) => {
                if (value instanceof PublicKey) {
                    return [key, value.toString()]
                }
                return [key, value]
            })
        )
    )
})()
