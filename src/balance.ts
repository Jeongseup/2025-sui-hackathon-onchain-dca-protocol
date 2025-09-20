// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";

// import { DeepBookClient } from '../src/index.js'; // Adjust import source accordingly
import { DeepBookClient } from "@mysten/deepbook-v3";

/// Example to check balance for a balance manager
(async () => {
  const env = "testnet";

  const balanceManagers = {
    MANAGER_1: {
      address:
        "0x635c3863dea3c940981c4c9f64b977553bb6ad985b5345cdbf1839f7d39b4c05",
      tradeCap: "",
    },
  };

  const dbClient = new DeepBookClient({
    address: "0x0",
    env: env,
    client: new SuiClient({
      url: getFullnodeUrl(env),
    }),
    balanceManagers: balanceManagers,
  });

  const assets = ["DEEP", "SUI", "DBUSDC", "DBUSDT"]; // Update assets as needed
  const manager = "MANAGER_1"; // Update the manager accordingly
  console.log("Manager:", manager);
  for (const asset of assets) {
    console.log(await dbClient.checkManagerBalance(manager, asset));
  }
})();
