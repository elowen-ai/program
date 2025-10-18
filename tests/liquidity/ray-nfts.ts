import '../common'
import { getLiquidityVaultRaydiumKeyNfts } from '../../app'
;(async () => {
    const nfts = await getLiquidityVaultRaydiumKeyNfts()
    console.log('Raydium NFTs', nfts)
    console.log('Total NFTs', nfts.length)
})()
