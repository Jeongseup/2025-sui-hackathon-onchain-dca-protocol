import { Transaction } from "@mysten/sui/transactions";
import { DeepBookMarketMaker } from "./deepbookMarketMaker";
import { config } from "dotenv";

// Load environment variables from .env file
config();

const balanceManagerAddress = {
  testnet: process.env.MAINNET_BALANCE_MANAGER_ADDRESS || "",
  mainnet: process.env.TESTNET_BALANCE_MANAGER_ADDRESS || "",
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
  if (!process.env.BALANCE_MANAGER_ADDRESS) {
    console.log("⭐️ You have to make balance manager first");

    const tx = new Transaction();
    // console.log("Created Balance Manager");
    // mmClient.balanceManager.createAndShareBalanceManagerWithOwner(
    //   mmClient.getActiveAddress()
    // )(tx);

    // Add SUI to balance manager if balance is low
    // console.log("Depositing 0.01 SUI into Balance Manager");
    // mmClient.balanceManager.depositIntoManager(
    //   BALANCE_MANAGER_KEY,
    //   "SUI",
    //   0.1
    // )(tx);

    const res = await mmClient.signAndExecute(tx);
    console.dir(res, { depth: null });
  }

  // Check balances of various assets
  const assets = ["DEEP", "SUI", "DBUSDC", "DBUSDT"]; // Update assets as needed
  // const assets = ["SUI", "USDC", "WUSDT", "WUSDC", "BETH", "DEEP"]; // Update assets as needed
  const manager = "MANAGER_1"; // Update the manager accordingly
  console.log("Manager:", manager);

  let bmSuiBalance = 0;
  for (const asset of assets) {
    const result = await mmClient.checkManagerBalance(manager, asset);
    console.log(result);
    if (asset === "SUI") {
      bmSuiBalance = result.balance;
    }
  }

  if (false) {
    console.log("⭐️ Balance Manager SUI balance is low, depositing 0.1 SUI");
    const tx = new Transaction();
    mmClient.balanceManager.depositIntoManager(
      BALANCE_MANAGER_KEY,
      "USDC",
      5
    )(tx);
    const res = await mmClient.signAndExecute(tx);
    console.dir(res, { depth: null });
  }

  // console.log(await mmClient.checkManagerBalance(BALANCE_MANAGER_KEY, "SUI"));
  // console.log(await mmClient.getLevel2Range("SUI_DBUSDC", 0.1, 100, true));

  // get open orders
  const pools = ["DEEP_SUI", "SUI_USDC", "DEEP_USDC", "XBTC_USDC"]; // Live pools, add more if needed
  for (const pool of pools) {
    console.log(pool);
    console.log(await mmClient.accountOpenOrders(pool, BALANCE_MANAGER_KEY));
  }

  // const minSize = `poolDetails.lotSize; // lotSize가 최소 주문 단위입니다.
  // console.log(`Minimum order size for ${poolKey} is: ${minSize}`);

  // mmClient.

  // const poolKey = "DEEP_SUI";
  const poolKey = "SUI_USDC";
  const tx = new Transaction();
  await mmClient.getPoolBookParams(poolKey);
  // mmClient.placeMarketOrder(tx, poolKey, BALANCE_MANAGER_KEY);
  // mmClient.swapExactBaseForQuote(tx);
  // mmClient.placeMarketOrder(tx, poolKey, BALANCE_MANAGER_KEY);
  // mmClient.placeLimitOrder(tx, poolKey, BALANCE_MANAGER_KEY);
  let res = null;

  // 3. 트랜잭션을 네트워크로 "전송(send)"하기 직전에...
  // .getData() 메소드를 호출하여 현재까지 빌드된 트랜잭션의 내용을 가져옵니다.
  const builtTransactionData = tx.getData();
  if (builtTransactionData.inputs.length > 0) {
    console.log(
      "Built Transaction Commands Data:",
      builtTransactionData.commands.length
    );

    console.log(
      "Built Transaction Input Data:",
      builtTransactionData.inputs.length
    );

    // builtTransactionData.inputs.forEach((input, index) => {
    //   console.log(`Input ${index}:`, input);
    // });

    res = await mmClient.signAndExecute(tx);
  } else {
    console.log("No transaction inputs to process.");
  }

  console.dir(res, { depth: null });
})();

// 일단 그냥 이게 BTC 페어라고 생각하고 동작시키자
// 	DEEP_SUI: {
// 	address: `0x48c95963e9eac37a316b7ae04a0deb761bcdcc2b67912374d6036e7f0e9bae9f`,
// 	baseCoin: 'DEEP',
// 	quoteCoin: 'SUI',
// },

// INPUT 4,000,000,000
