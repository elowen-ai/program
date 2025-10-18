import '../common'
import { Currency, getPriceByQuoteCurrency } from '../../app'
;(async () => {
    const usdcPrice = await getPriceByQuoteCurrency(Currency.USDC)
    const solPrice = await getPriceByQuoteCurrency(Currency.SOL)
    console.log(usdcPrice)
    console.log(solPrice)
})()
