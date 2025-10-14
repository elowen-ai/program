import '../common'
import { VaultAccount, getVaultAccountWithElwAta } from '../../app'
;(async () => {
    const edaVault = await getVaultAccountWithElwAta(VaultAccount.Eda)
    const teamVault = await getVaultAccountWithElwAta(VaultAccount.Team)
    const platformVault = await getVaultAccountWithElwAta(VaultAccount.Platform)
    const rewardVault = await getVaultAccountWithElwAta(VaultAccount.Reward)
    const presaleVault = await getVaultAccountWithElwAta(VaultAccount.Presale)
    const treasuryVault = await getVaultAccountWithElwAta(VaultAccount.Treasury)
    const liquidityVault = await getVaultAccountWithElwAta(VaultAccount.Liquidity)

    console.log('EDA Vault: ', edaVault.account.toBase58())
    console.log('Team Vault: ', teamVault.account.toBase58())
    console.log('Platform Vault: ', platformVault.account.toBase58())
    console.log('Reward Vault: ', rewardVault.account.toBase58())
    console.log('Presale Vault: ', presaleVault.account.toBase58())
    console.log('Treasury Vault: ', treasuryVault.account.toBase58())
    console.log('Liquidity Vault: ', liquidityVault.account.toBase58())

    console.log('EDA Token ATA: ', edaVault.elwAta.toBase58())
    console.log('Team Token ATA: ', teamVault.elwAta.toBase58())
    console.log('Platform Token ATA: ', platformVault.elwAta.toBase58())
    console.log('Reward Token ATA: ', rewardVault.elwAta.toBase58())
    console.log('Presale Token ATA: ', presaleVault.elwAta.toBase58())
    console.log('Treasury Token ATA: ', treasuryVault.elwAta.toBase58())
    console.log('Liquidity Token ATA: ', liquidityVault.elwAta.toBase58())
})()
