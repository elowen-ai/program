import { clientWallet, clientWallet2 } from '../../common'
import {
    Currency,
    getMinerLpVaultAddress,
    getMinerLpVaultTokenAmountByCurrency,
    getMinerLpVaultTokenAtaByCurrency
} from '../../../app'
;(async () => {
    const lpVaultAddress = getMinerLpVaultAddress(clientWallet.publicKey)
    const lpTokenAta = await getMinerLpVaultTokenAtaByCurrency(clientWallet.publicKey, Currency.SOL)
    const lpTokenAmount = await getMinerLpVaultTokenAmountByCurrency(
        clientWallet.publicKey,
        Currency.SOL
    )

    console.log('Client 1 SOL LP Vault Address', lpVaultAddress.toBase58())
    console.log('Client 1 SOL LP Token Ata', lpTokenAta.toBase58())
    console.log('Client 1 SOL LP Token Amount', lpTokenAmount.uiAmount)

    console.log('--------------------------------')

    const lpVaultAddress2 = getMinerLpVaultAddress(clientWallet.publicKey)
    const lpTokenAta2 = await getMinerLpVaultTokenAtaByCurrency(
        clientWallet.publicKey,
        Currency.USDC
    )
    const lpTokenAmount2 = await getMinerLpVaultTokenAmountByCurrency(
        clientWallet.publicKey,
        Currency.USDC
    )

    console.log('Client 1 USDC LP Vault Address', lpVaultAddress2.toBase58())
    console.log('Client 1 USDC LP Token Ata', lpTokenAta2.toBase58())
    console.log('Client 1 USDC LP Token Amount', lpTokenAmount2.uiAmount)

    console.log('--------------------------------')

    const lpVaultAddress3 = getMinerLpVaultAddress(clientWallet2.publicKey)
    const lpTokenAta3 = await getMinerLpVaultTokenAtaByCurrency(
        clientWallet2.publicKey,
        Currency.SOL
    )
    const lpTokenAmount3 = await getMinerLpVaultTokenAmountByCurrency(
        clientWallet2.publicKey,
        Currency.SOL
    )

    console.log('Client 2 SOL LP Vault Address', lpVaultAddress3.toBase58())
    console.log('Client 2 SOL LP Token Ata', lpTokenAta3.toBase58())
    console.log('Client 2 SOL LP Token Amount', lpTokenAmount3.uiAmount)

    console.log('--------------------------------')

    const lpVaultAddress4 = getMinerLpVaultAddress(clientWallet2.publicKey)
    const lpTokenAta4 = await getMinerLpVaultTokenAtaByCurrency(
        clientWallet2.publicKey,
        Currency.USDC
    )
    const lpTokenAmount4 = await getMinerLpVaultTokenAmountByCurrency(
        clientWallet2.publicKey,
        Currency.USDC
    )

    console.log('Client 2 USDC LP Vault Address', lpVaultAddress4.toBase58())
    console.log('Client 2 USDC LP Token Ata', lpTokenAta4.toBase58())
    console.log('Client 2 USDC LP Token Amount', lpTokenAmount4.uiAmount)
})()
