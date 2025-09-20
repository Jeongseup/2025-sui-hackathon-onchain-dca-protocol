import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { getFaucetHost, requestSuiFromFaucetV2 } from "@mysten/sui/faucet";
import { config } from "dotenv";

// Load environment variables from .env file
config();

/// Example to check balance for a balance manager
(async () => {
  const env = "testnet";
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY .env 파일에 설정되지 않았습니다.");
  }
  const keypair = Ed25519Keypair.fromSecretKey(privateKey);
  const address = keypair.getPublicKey().toSuiAddress();

  // get tokens from the Devnet faucet server
  const res = await requestSuiFromFaucetV2({
    // connect to Devnet
    host: getFaucetHost(env),
    recipient: address,
  });

  console.log(`Faucet response: ${JSON.stringify(res, null, 2)}`);
})();
