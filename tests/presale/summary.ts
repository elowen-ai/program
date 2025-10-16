import '../common'
import { getPresaleSummaryAccountData } from '../../app'
;(async () => {
    const summaryAccount = await getPresaleSummaryAccountData()
    console.log('Summary account', summaryAccount)
})()
