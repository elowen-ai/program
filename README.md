## Elowen Program

A Solana program (Anchor) with a TypeScript SDK. It covers token operations, presale, rewards, liquidity, and related utilities. The SDK wraps common interactions and helpers for clients and scripts.

### Tech stack
- Rust + Anchor for on-chain program (`programs/elowen`)
- TypeScript SDK under `app/` bundled via `esbuild`
- Tests and scripts using `ts-mocha` and Anchor scripts

### Program IDs
- Devnet: `48ug74S2RBzih8DtNpyDqhTCZnzUoYuYyzwttmHEiMRS` (matches `Anchor.toml` and `declare_id!`)

## Prerequisites
- Node.js 18+ and Yarn
- Rust toolchain
- Solana CLI
- Anchor CLI 0.31.x

## Install
```bash
yarn install
```

## Build
- Build TypeScript SDK:
```bash
yarn build
```

- Build the Solana program:
```bash
# Devnet (enables devnet feature flags)
yarn build-devnet

# Mainnet-compatible build
yarn build-mainnet
```

## Deploy
```bash
# Configure cluster
yarn set-devnet

# Deploy to devnet
yarn deploy-devnet

# Deploy to mainnet (requires proper config and keys)
yarn deploy-mainnet
```

## Using the SDK
The package exports both Node and Browser builds.

```ts
import { Connection, clusterApiUrl } from '@solana/web3.js'
import { Wallet } from '@coral-xyz/anchor'
import ElowenProgram, { initializeProgram, getUserSolBalance } from '@elowen-ai/program'

const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
const wallet: Wallet = /* your Anchor-compatible wallet */

initializeProgram(connection, wallet, 'devnet')

const sol = await getUserSolBalance(wallet.publicKey)
console.log(sol.amount, sol.amountFormatted)
```

Key entry points:
- `initializeProgram(connection, wallet, cluster)`
- Static accessors on `ElowenProgram`: `connection`, `provider`, `methods`, `accounts`, `ID`
- Helpers like `getUserSolBalance`, `getUserUsdcBalance`, `getUserElwBalance`

## Scripts and tests
Common scripts are defined in `Anchor.toml` and `package.json`. Examples:
```bash
# Type checking
yarn typecheck

# Prettier check / fix
yarn lint
yarn lint:fix

# Example Anchor/ts-mocha flows (see Anchor.toml [scripts])
anchor run initialize-elw
anchor run liquidity-initialize
anchor run presale-buy
```

## Project structure
- `programs/elowen`: Anchor program (Rust)
- `app/`: TypeScript SDK and utilities
- `tests/`: TS-based tests and examples referenced by `Anchor.toml`
- `esbuild.ts`: SDK bundling to `dist/esm` and `dist/cjs`
- `Anchor.toml`: Anchor config, program id, scripts, provider

## License
MIT


