import { minutesToMs } from '../common'
import { listenBuyPresaleTokenEvent } from '../../app'

console.log('Listening for buyPresaleTokenEvent')
const unSub = listenBuyPresaleTokenEvent((event) => {
    console.log(event)
})

setTimeout(async () => {
    console.log('Unsubscribing from buyPresaleTokenEvent')
    ;(await unSub)()
}, minutesToMs(30))
