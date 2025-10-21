import './common'
import { getTransactions } from '../app/transactions'
;(async () => {
    const transactions = await getTransactions({
        viaWait: true,
        limit: 4
    })
    console.log('Transactions', transactions)
})()
