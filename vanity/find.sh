#!/bin/bash

PREFIX="ELW"

while true; do
    OLD_KEYFILE=$(find . -maxdepth 1 -name "*.json" | head -n 1)
    if [[ -f "$OLD_KEYFILE" ]]; then
        rm -f "$OLD_KEYFILE"
    fi

    solana-keygen grind --starts-with $PREFIX:1

    KEYFILE=$(find . -maxdepth 1 -name "*.json" | head -n 1)

    if [[ ! -f "$KEYFILE" ]]; then
        echo "❌ No Keypair found"
        continue
    fi

    RESULT=$(node -e "
        const fs = require('fs');
        const { NATIVE_MINT } = require('@solana/spl-token');
        const { Keypair, PublicKey } = require('@solana/web3.js');
        const { bs58 } = require('@coral-xyz/anchor/dist/cjs/utils/bytes');

        const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

        const keypairJson = JSON.parse(fs.readFileSync('$KEYFILE').toString());
        const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairJson));

        function isSmallerPubKey(firstPubkey, secondPubkey) {
            return Buffer.compare(firstPubkey.toBytes(), secondPubkey.toBytes()) < 0
        }

        console.log(isSmallerPubKey(keypair.publicKey, USDC_MINT) && isSmallerPubKey(keypair.publicKey, NATIVE_MINT));
    ")

    if [[ "$RESULT" == "true" ]]; then
        PUBKEY=$(basename "${KEYFILE%.json}")
        echo "--------------------------------"
        echo "✅ Found new key: $PUBKEY"
        break
    fi
done
