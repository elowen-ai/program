import { minutesToMs } from './common'
import { listenTransactions } from '../app'

console.log('Listening for transactions')
const unSub = listenTransactions((event) => {
    console.log(event)
})

setTimeout(async () => {
    console.log('Unsubscribing from transactions')
    ;(await unSub)()
}, minutesToMs(30))
