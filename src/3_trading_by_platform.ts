import { Transaction } from "@mysten/sui/transactions";
import { DeepBookMarketMaker } from "./deepbookMarketMaker";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { config } from "dotenv";

// Load environment variables from .env file
config();

const balanceManagerAddress = {
  testnet: process.env.TESTNET_BALANCE_MANAGER_ADDRESS || "",
  mainnet: process.env.MAINNET_BALANCE_MANAGER_ADDRESS || "",
};

const balanceManagerTradecap = {
  testnet: process.env.TESTNET_BALANCE_MANAGER_TRADECAP || "",
  mainnet: process.env.MAINNET_BALANCE_MANAGER_TRADECAP || "",
};

const assets = {
  testnet: ["DEEP", "SUI", "DBUSDC"],
  mainnet: ["SUI", "USDC", "DEEP"],
};

const usdc = {
  testnet:
    "0xf7152c05930480cd740d7311b5b8b45c6f488e3a53a11c3f74a6fac36a52e0d7::DBUSDC::DBUSDC",
  mainnet:
    "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
};

const buyingAmount = {
  testnet: 100000000,
  mainnet: 1,
};

const poolKeys = {
  testnet: "DEEP_SUI",
  mainnet: "SUI_USDC",

  // const poolKey = "DEEP_SUI";
  // const poolKey = "SUI_USDC";
};

const BALANCE_MANAGER_KEY = "MANAGER_1";

(async () => {
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

  const keypair = Ed25519Keypair.fromSecretKey(privateKey);
  const address = keypair.getPublicKey().toSuiAddress();

  console.log(`👉 Running on ${env} By Platform Account: ${address}`);

  // Initialize with balance managers if created
  const balanceManagers = {
    [BALANCE_MANAGER_KEY]: {
      address: balanceManagerAddress[env],
      tradeCap: balanceManagerTradecap[env],
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
  mmClient.placeMarketOrder(
    tx,
    poolKeys[env],
    BALANCE_MANAGER_KEY,
    buyingAmount[env]
  );
  const res = await mmClient.signAndExecute(tx);
  if (res.digest) {
    console.log(
      `Transaction Digest: ${res.digest}, Status: ${res.effects?.status.status}`
    );
  }
})();
