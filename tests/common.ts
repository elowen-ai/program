import fs from 'fs'
import 'dotenv/config'
import { Keypair } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'
import { initializeProgram } from '../app/program'
import { Connection, Cluster } from '@solana/web3.js'
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes'

const connection = new Connection('https://api.devnet.solana.com', {
    commitment: 'confirmed',
    wsEndpoint:
        'wss://cold-bold-tent.solana-devnet.quiknode.pro/a1d29ff1425c0c05510c08e98d7ce2d22a8e277c'
})

initializeProgram(connection, anchor.Wallet.local(), process.env.CLUSTER as Cluster)

const clientSecretKey1 = Buffer.from(bs58.decode(process.env.CLIENT_WALLET as string))
export const clientWallet = new anchor.Wallet(Keypair.fromSecretKey(clientSecretKey1))

const clientSecretKey2 = Buffer.from(bs58.decode(process.env.CLIENT_WALLET_2 as string))
export const clientWallet2 = new anchor.Wallet(Keypair.fromSecretKey(clientSecretKey2))

const emptyWalletSecretKey = Buffer.from(bs58.decode(process.env.EMPTY_WALLET as string))
export const emptyWallet = new anchor.Wallet(Keypair.fromSecretKey(emptyWalletSecretKey))

export const addArg = (key: string, value: any) => {
    if (!fs.existsSync('./args.json')) {
        fs.writeFileSync('./args.json', '{}')
    }
    const args = JSON.parse(fs.readFileSync('./args.json').toString())
    args[key] = value
    fs.writeFileSync('./args.json', JSON.stringify(args, null, 2))
}

export const getArg = (key: string) => {
    if (!fs.existsSync('./args.json')) {
        return null
    }
    const args = JSON.parse(fs.readFileSync('./args.json').toString())
    return args[key]
}

export const minutesToMs = (minutes: number) => {
    return minutes * 60 * 1000
}
