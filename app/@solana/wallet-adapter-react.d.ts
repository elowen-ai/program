declare module '@solana/wallet-adapter-react' {
    export interface AnchorWallet {
        publicKey: {
            toBytes(): Uint8Array
        }
        signTransaction(tx: any): Promise<any>
        signAllTransactions?(txs: any[]): Promise<any[]>
    }
}
