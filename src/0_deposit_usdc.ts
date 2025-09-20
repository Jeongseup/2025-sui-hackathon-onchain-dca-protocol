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
  mainnet: ["SUI", "USDC", "WUSDT", "WUSDC", "BETH", "DEEP"],
};

const usdc = {
  testnet: {
    coinName: "DBUSDC",
    coinType:
      "0xf7152c05930480cd740d7311b5b8b45c6f488e3a53a11c3f74a6fac36a52e0d7::DBUSDC::DBUSDC",
  },
  mainnet: {
    coinName: "USDC",
    coinType:
      "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
  },
};

const BALANCE_MANAGER_KEY = "MANAGER_1";

(async () => {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY is not set in the .env file");
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
      tradeCap: "",
    },
  };

  console.log(`Selected balance manager object: ${balanceManagerAddress[env]}`);

  const mmClient = new DeepBookMarketMaker(privateKey, env, balanceManagers);

  // 유저의 USDC 밸런스 체크
  await mmClient.getUserUsdcBalance(usdc[env].coinType);

  // 1. 밸런스 매니저 확인
  for (const asset of assets[env]) {
    const result = await mmClient.checkManagerBalance(
      BALANCE_MANAGER_KEY,
      asset
    );
    console.log(result);
  }

  console.log("⭐️ Balance Manager SUI balance is low, depositing 0.1 SUI");

  // 2. 밸런스 매니저에 자금 예치 (유저가 total amount(= n day * m amount, ex: 10 day * 100 usdc = 1000usdc)
  const tx = new Transaction();
  mmClient.balanceManager.depositIntoManager(
    BALANCE_MANAGER_KEY,
    usdc[env].coinName,
    10
  )(tx);

  // send tx
  const res = await mmClient.signAndExecute(tx);
  if (res.digest) {
    console.log(
      `Transaction Digest: ${res.digest}, Status: ${res.effects?.status.status}`
    );
  }

  // 3. 자금 예치 후에 밸런스 매니저 재확인
  for (const asset of assets[env]) {
    const result = await mmClient.checkManagerBalance(
      BALANCE_MANAGER_KEY,
      asset
    );
    console.log(result);
  }
})();
