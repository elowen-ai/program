import '../common'
import { getLiquidityVaultRaydiumKeyNfts, getLockedLiquidityInfoByFeeNftMint } from '../../app'
;(async () => {
    const raydiumNfts = await getLiquidityVaultRaydiumKeyNfts()
    raydiumNfts.forEach(async (nft) => {
        const lockedLp = await getLockedLiquidityInfoByFeeNftMint(nft.mint)
        console.log('Locked LP', lockedLp)
    })
    console.log('Total Locked LP Info', raydiumNfts.length)
})()
