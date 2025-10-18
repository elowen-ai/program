import '../common'
import { Currency, getPoolVaultAmountByCurrency } from '../../app'
;(async () => {
    const usdcAmount = await getPoolVaultAmountByCurrency(Currency.USDC)
    console.log(usdcAmount)
    const solAmount = await getPoolVaultAmountByCurrency(Currency.SOL)
    console.log(solAmount)
})()
