import '../common'
import { Currency, getPoolInfoByCurrency } from '../../app'
;(async () => {
    const usdcPoolInfo = await getPoolInfoByCurrency(Currency.USDC)
    console.log(usdcPoolInfo)
    const solPoolInfo = await getPoolInfoByCurrency(Currency.SOL)
    console.log(solPoolInfo)
})()
