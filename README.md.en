# Sui On-Chain DCA Protocol

This project is a backend service for an on-chain Dollar-Cost Averaging (DCA) protocol on the Sui network, utilizing DeepBook for trading.

## Working Flow

1.  **Create Balance Manager**: A virtual deposit wallet is created for the user.
2.  **Delegate Authority and Deposit Funds**: The user deposits funds into the balance manager and delegates trading authority to the platform.
3.  **Periodic Trading**: The backend service, running as a cron job, periodically executes trades using the platform's key.
4.  **Balance Check**: Users can check the balance of their virtual deposit wallet.

## Prerequisites

- Node.js
- npm (or yarn)

## Environment Setup

1.  Create a `.env` file from the `.env.sample` file:

    ```bash
    cp .env.sample .env
    ```

2.  Update the `.env` file with your credentials:

    - `ENV`: Set to `testnet` or `mainnet`.
    - `BALANCE_MANAGER_KEY`: A key for the balance manager.
    - `PRIVATE_KEY`: Your private key for the Sui network.
    - `MAINNET_BALANCE_MANAGER_ADDRESS`: The address of the balance manager on the mainnet.
    - `TESTNET_BALANCE_MANAGER_ADDRESS`: The address of the balance manager on the testnet.

## Installation

Install the project dependencies:

```bash
npm install
```

## Usage

The following scripts are located in the `src` directory and should be run in the following order:

1.  **`0_faucet.ts`**: (Testnet only) Request SUI tokens from the faucet.

    ```bash
    npx ts-node src/0_faucet.ts
    ```

2.  **`1_create_balance_manager.ts`**: Create a new balance manager.

    ```bash
    npx ts-node src/1_create_balance_manager.ts
    ```

3.  **`2_deposit_and_delegate_tradecap.ts`**: Deposit funds and delegate trading authority to the platform.

    ```bash
    # ⭐️ Update .env file with generated Balance Manager ID
    npx ts-node src/2_deposit_and_delegate_tradecap.ts
    ```

4.  **`3_trading_by_platform.ts`**: Execute trades using the platform's key.

    ```bash
    npx ts-node src/3_trading_by_platform.ts
    ```

5.  **`4_balance.ts`**: Check the balance of the virtual deposit wallet.

    ```bash
    npx ts-node src/4_balance.ts
    ```

## Backend Service with Cron Jobs

To run the trading logic as a backend service with cron jobs, you can use a library like `node-cron`.

First, install `node-cron` and its types:

```bash
npm install node-cron
npm install -D @types/node-cron
```

Next, create a `src/server.ts` file with the following content:

```typescript
import cron from "node-cron";
import { Transaction } from "@mysten/sui/transactions";
import { DeepBookMarketMaker } from "./deepbookMarketMaker";
import { config } from "dotenv";

// Load environment variables from .env file
config();

const balanceManagerAddress = {
  testnet: process.env.TESTNET_BALANCE_MANAGER_ADDRESS || "",
  mainnet: process.env.MAINNET_BALANCE_MANAGER_ADDRESS || "",
};

const assets = {
  testnet: ["DEEP", "SUI", "DBUSDC"],
  mainnet: ["SUI", "USDC", "DEEP"],
};

const poolKeys = {
  testnet: "DEEP_SUI",
  mainnet: "SUI_DBUSDC",
};

const BALANCE_MANAGER_KEY = "MANAGER_1";

const trade = async () => {
  const privateKey = process.env.PLATFORM_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PLATFORM_PRIVATE_KEY is not set in the .env file");
  }

  const env = process.env.ENV as "testnet" | "mainnet" | undefined;
  if (!env || (env !== "testnet" && env !== "mainnet")) {
    throw new Error(
      "ENV must be set to 'testnet' or 'mainnet' in the .env file"
    );
  }

  console.log(`👉 Running on ${env}`);

  // Initialize with balance managers if created
  const balanceManagers = {
    [BALANCE_MANAGER_KEY]: {
      address: balanceManagerAddress[env],
      tradeCap:
        "0x9434b149adc74e022d49f760bb333337c93779205efdec7c2e8fc1474b874fe8",
    },
  };

  console.log(`Selected balance manager object: ${balanceManagerAddress[env]}`);
  const mmClient = new DeepBookMarketMaker(privateKey, env, balanceManagers);

  // 1. 밸런스 매니저 확인
  for (const asset of assets[env]) {
    const result = await mmClient.checkManagerBalance(
      BALANCE_MANAGER_KEY,
      asset
    );
    console.log(result);
  }

  // 2. 풀 파라미터 체크. 최소 구매 수량 확인
  await mmClient.getPoolBookParams(poolKeys[env]);

  // 3. 플랫폼 키로 구매 실행
  const tx = new Transaction();
  mmClient.placeMarketOrder(tx, poolKeys[env], BALANCE_MANAGER_KEY, 100000000);
  const res = await mmClient.signAndExecute(tx);
  if (res.digest) {
    console.log(
      `Transaction Digest: ${res.digest}, Status: ${res.effects?.status.status}`
    );
  }
};

// Schedule the trading logic to run every hour
cron.schedule("0 * * * *", () => {
  console.log("Running a trade...");
  trade();
});

console.log("Cron job scheduled.");
```

Finally, add a `start:server` script to your `package.json` file:

```json
"scripts": {
  "start:server": "npx ts-node src/server.ts"
}
```

You can then start the backend service with the following command:

```bash
npm run start:server
```
