import ElowenProgram from '../program'
import { currencyFromRustEnum, fromTokenFormat, getDecimalsByCurrency } from '../utils'
import { BuyPremiumEvent, BuyPresaleTokenEvent, ClaimRewardEvent, ElwBurnEvent } from '../types'

export async function listenClaimRewardEvent(callback: (event: ClaimRewardEvent) => void) {
    const subscriptionId = ElowenProgram.addEventListener('claimRewardEvent', (event) => {
        callback({
            receiver: event.receiver,
            amount: fromTokenFormat(event.amount)
        })
    })

    return () => {
        ElowenProgram.removeEventListener(subscriptionId)
    }
}

export async function listenBuyPremiumEvent(callback: (event: BuyPremiumEvent) => void) {
    const subscriptionId = ElowenProgram.addEventListener('buyPremiumEvent', (event) => {
        callback({
            buyer: event.buyer,
            currency: currencyFromRustEnum(event.currency),
            amount: fromTokenFormat(
                event.amount,
                getDecimalsByCurrency(currencyFromRustEnum(event.currency))
            )
        })
    })

    return () => {
        ElowenProgram.removeEventListener(subscriptionId)
    }
}

export async function listenBuyPresaleTokenEvent(callback: (event: BuyPresaleTokenEvent) => void) {
    const subscriptionId = ElowenProgram.addEventListener('buyPresaleTokenEvent', (event) => {
        callback({
            receiver: event.receiver,
            amount: fromTokenFormat(event.amount)
        })
    })

    return () => {
        ElowenProgram.removeEventListener(subscriptionId)
    }
}

export async function listenElwBurnEvent(callback: (event: ElwBurnEvent) => void) {
    const subscriptionId = ElowenProgram.addEventListener('elwBurnEvent', (event) => {
        callback({
            process: event.process,
            amount: fromTokenFormat(event.amount)
        })
    })

    return () => {
        ElowenProgram.removeEventListener(subscriptionId)
    }
}
