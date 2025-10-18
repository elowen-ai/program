import '../common'
import { getLiquidityVaultRaydiumKeyNfts } from '../../app'
;(async () => {
    const raydiumNfts = await getLiquidityVaultRaydiumKeyNfts(true)
    raydiumNfts.forEach(async (nft) => {
        console.log(
            `Locked LP State for ${nft.lockedLpState?.quoteCurrencyFormatted}`,
            nft.lockedLpState
        )
    })
    console.log('Total Locked LP States', raydiumNfts.length)
})()
