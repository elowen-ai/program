import { minutesToMs } from '../common'
import { listenClaimRewardEvent } from '../../app'

console.log('Listening for claimRewardEvent')
const unSub = listenClaimRewardEvent((event) => {
    console.log(event)
})

setTimeout(async () => {
    console.log('Unsubscribing from claimRewardEvent')
    ;(await unSub)()
}, minutesToMs(30))
