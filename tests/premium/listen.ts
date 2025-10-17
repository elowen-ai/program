import { minutesToMs } from '../common'
import { listenBuyPremiumEvent } from '../../app'

console.log('Listening for buyPremiumEvent')
const unSub = listenBuyPremiumEvent((event) => {
    console.log(event)
})

setTimeout(async () => {
    console.log('Unsubscribing from buyPremiumEvent')
    ;(await unSub)()
}, minutesToMs(30))
