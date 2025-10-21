import { clientWallet } from './common'
import {
    getUserSolBalance,
    getUserUsdcBalance,
    getUserWsolBalance,
    getUserElwBalance
} from '../app'
;(async () => {
    const userSolBalance = await getUserSolBalance(clientWallet.publicKey)
    console.log('userSolBalance', userSolBalance)
    const userUsdcBalance = await getUserUsdcBalance(clientWallet.publicKey)
    console.log('userUsdcBalance', userUsdcBalance)
    const userWsolBalance = await getUserWsolBalance(clientWallet.publicKey)
    console.log('userWsolBalance', userWsolBalance)
    const userElwBalance = await getUserElwBalance(clientWallet.publicKey)
    console.log('userElwBalance', userElwBalance)
})()
