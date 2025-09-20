import { Transaction } from "@mysten/sui/transactions";
import { DeepBookMarketMaker } from "./deepbookMarketMaker";
import { config } from "dotenv";
import { status } from "@mysten/deepbook-v3/dist/cjs/contracts/deepbook/order";

// Load environment variables from .env file
config();

const BALANCE_MANAGER_KEY = "MANAGER_1";

// Main execution function
(async () => {
  // 프라이빗 로드
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY is not set in the .env file");
  }

  // 네트워크 타입 설정
  const env = process.env.ENV as "testnet" | "mainnet" | undefined;
  if (!env || (env !== "testnet" && env !== "mainnet")) {
    throw new Error(
      "ENV must be set to 'testnet' or 'mainnet' in the .env file"
    );
  }

  console.log(`👉 Running on ${env}`);

  const mmClient = new DeepBookMarketMaker(privateKey, env);
  if (!process.env.BALANCE_MANAGER_ADDRESS) {
    console.log("⭐️ You have to make balance manager first");
  }

  console.log("Creating Balance Manager...");
  const tx = new Transaction();
  mmClient.balanceManager.createAndShareBalanceManagerWithOwner(
    mmClient.getActiveAddress()
  )(tx);

  // // Add SUI to balance manager if balance is low
  // console.log("Depositing 0.01 SUI into Balance Manager");
  // mmClient.balanceManager.depositIntoManager(
  //   BALANCE_MANAGER_KEY,
  //   "SUI",
  //   0.1
  // )(tx);

  const res = await mmClient.signAndExecute(tx);
  if (res.digest) {
    console.log(
      `Transaction Digest: ${res.digest}, Status: ${res.effects?.status.status}`
    );
    console.log(
      `✅ Balance Manager created successfully: ${res.effects?.created?.[0].reference.objectId}`
    );
  }
})();
