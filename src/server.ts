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
