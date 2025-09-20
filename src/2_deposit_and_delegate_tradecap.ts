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
  if (env === "testnet") {
    mmClient.balanceManager.depositIntoManager(
      BALANCE_MANAGER_KEY,
      "SUI",
      0.5
    )(tx);
  } else {
    mmClient.balanceManager.depositIntoManager(
      BALANCE_MANAGER_KEY,
      "USDC",
      5
    )(tx);
  }

  // 2.5 deposit 후 tradecap mint해서 플랫폼 주소로 전달
  // 플랫폼 주소(큐레이션 주소):
  const PLATFORM_SUI_ADDRESS =
    "0x2ff4c579c27f507626641f7f6e795adf2da10c1394d95b57f9f4fa0538f94060";

  mmClient.delegateTradeCap(tx, BALANCE_MANAGER_KEY);

  // send tx
  const res = await mmClient.signAndExecute(tx);
  if (res.digest) {
    console.log(
      `Transaction Digest: ${res.digest}, Status: ${res.effects?.status.status}`
    );
    const tradeCapChange = res.objectChanges?.find(
      (change) => change.type === "created" && "objectId" in change
    );
    console.log(
      `👉 TradeCap ID: ${
        tradeCapChange ? (tradeCapChange as any).objectId : "Not found"
      }`
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
