import '../common'
import { Currency, getPoolInfoFeesByCurrency } from '../../app'
;(async () => {
    const usdcPoolInfo = await getPoolInfoFeesByCurrency(Currency.USDC)
    console.log('USDC Pool Info Fees', usdcPoolInfo)
    const solPoolInfo = await getPoolInfoFeesByCurrency(Currency.SOL)
    console.log('SOL Pool Info Fees', solPoolInfo)
})()
