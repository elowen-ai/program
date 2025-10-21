import { minutesToMs } from './common'
import { listenElwBurnEvent } from '../app'

console.log('Listening for elwBurnEvent')
const unSub = listenElwBurnEvent((event) => {
    console.log(event)
})

setTimeout(async () => {
    console.log('Unsubscribing from elwBurnEvent')
    ;(await unSub)()
}, minutesToMs(30))
