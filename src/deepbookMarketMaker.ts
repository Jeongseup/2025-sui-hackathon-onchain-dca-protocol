import { BalanceManager, DeepBookClient } from "@mysten/deepbook-v3";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";

import { decodeSuiPrivateKey, Keypair } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { bcs } from "@mysten/sui/bcs";

const BALANCE_MANAGER_KEY = "MANAGER_1";
const PLATFORM_ADMIN_ADDRESS =
  "0x2ff4c579c27f507626641f7f6e795adf2da10c1394d95b57f9f4fa0538f94060";

export class DeepBookMarketMaker extends DeepBookClient {
  keypair: Keypair;
  suiClient: SuiClient;

  constructor(
    keypair: string | Keypair,
    env: "testnet" | "mainnet",
    balanceManagers?: { [key: string]: BalanceManager },
    adminCap?: string
  ) {
    let resolvedKeypair: Keypair;

    if (typeof keypair === "string") {
      resolvedKeypair = DeepBookMarketMaker.#getSignerFromPK(keypair);
    } else {
      resolvedKeypair = keypair;
    }

    const address = resolvedKeypair.toSuiAddress();

    super({
      address: address,
      env: env,
      client: new SuiClient({
        url: getFullnodeUrl(env),
      }),
      balanceManagers: balanceManagers,
      adminCap: adminCap,
    });

    this.keypair = resolvedKeypair;
    this.suiClient = new SuiClient({
      url: getFullnodeUrl(env),
    });
  }

  static #getSignerFromPK = (privateKey: string) => {
    const { schema, secretKey } = decodeSuiPrivateKey(privateKey);
    if (schema === "ED25519") return Ed25519Keypair.fromSecretKey(secretKey);

    throw new Error(`Unsupported schema: ${schema}`);
  };

  signAndExecute = async (tx: Transaction) => {
    // remove arguments
    return this.suiClient.signAndExecuteTransaction({
      transaction: tx,
      signer: this.keypair,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
  };

  getActiveAddress() {
    return this.keypair.getPublicKey().toSuiAddress();
  }

  createBalanceManagerAndReinitialize = async () => {
    let tx = new Transaction();
    tx.add(this.balanceManager.createAndShareBalanceManager());

    const res = await this.suiClient.signAndExecuteTransaction({
      transaction: tx,
      signer: this.keypair,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    // @ts-ignore
    const balanceManagerAddress = res.objectChanges?.find((change) => {
      return (
        change.type === "created" &&
        change.objectType.includes("BalanceManager")
      );
    })?.["objectId"];

    const balanceManagers: { [key: string]: BalanceManager } = {
      [BALANCE_MANAGER_KEY]: {
        address: balanceManagerAddress,
        tradeCap: undefined,
      },
    };

    console.log("Created Balance Manager at:", balanceManagerAddress);
  };

  placeLimitOrder = (tx: Transaction, poolKey: string, managerKey: string) => {
    tx.add(
      this.deepBook.placeLimitOrder({
        poolKey: poolKey,
        balanceManagerKey: managerKey,
        clientOrderId: "123456789",
        price: 100,
        quantity: 100000000,
        isBid: true,
        // orderType default: no restriction
        // selfMatchingOption default: allow self matching
        // payWithDeep default: true
      })
    );
  };

  // Example usage in DeepBookMarketMaker class
  // Place a market sell of 10 SUI in the DEEP_SUI pool
  placeMarketOrder = (
    tx: Transaction,
    poolKey: string,
    managerKey: string,
    quantity: number
  ) => {
    tx.add(
      this.deepBook.placeMarketOrder({
        poolKey: poolKey,
        balanceManagerKey: managerKey,
        clientOrderId: "123456789",
        quantity: quantity, // 4USDC for 1 SUI
        isBid: true,
        payWithDeep: false,
      })
    );
  };

  /**
   * @description 특정 풀의 tick_size, lot_size, min_size와 같은 북(Book) 파라미터를 가져옵니다.
   * @param {string} poolKey - 정보를 가져올 풀의 키
   * @returns {Promise<{tickSize: string, lotSize: string, minSize: string}>} 풀의 북 파라미터
   */
  getPoolBookParams = async (poolKey: string) => {
    const tx = new Transaction();

    // deepBook 인스턴스에 있는 poolBookParams 함수를 호출합니다.
    // 이 함수는 트랜잭션 객체를 인자로 받는 또 다른 함수를 반환합니다.
    tx.add(this.deepBook.poolBookParams(poolKey));

    // signAndExecute 대신 devInspectTransaction을 사용하여 읽기 전용 호출을 실행합니다.
    const res = await this.client.devInspectTransactionBlock({
      sender: this.getActiveAddress(),
      transactionBlock: tx,
    });

    // res.results[0].returnValues는 [[bytes, 'u64'], [bytes, 'u64'], ...] 형태의 배열입니다.
    const returnValues = res.results![0].returnValues;

    // 1. 각 배열 요소에서 첫 번째 항목(byte 배열)을 추출합니다.
    // 2. new Uint8Array()로 변환합니다.
    // 3. BCS.U64.parse()를 사용해 u64 값으로 디코딩합니다.
    const [tickSize, lotSize, minSize] = returnValues!.map(
      // value는 [ [128, 150, ...], 'u64' ] 형태의 튜플입니다.
      (value) => bcs.U64.parse(new Uint8Array(value[0]))
    );

    console.log(`✅ Parameters for ${poolKey}:`, {
      tickSize,
      lotSize,
      minSize,
    });
    return { tickSize, lotSize, minSize };
  };

  delegateTradeCap = async (tx: Transaction, managerKey: string) => {
    // 1. balance_manager::mint_trade_cap 함수 호출
    const [tradeCap] = this.balanceManager.mintTradeCap(managerKey)(tx);

    // 2. 생성된 TradeCap을 플랫폼 주소로 전송
    tx.transferObjects([tradeCap], PLATFORM_ADMIN_ADDRESS);
  };

  // 조회하려는 토큰의 정확한 코인 타입을 지정합니다.
  // 이것은 메인넷의 Wormhole을 통해 브릿지된 USDC의 주소입니다.
  // 여기에 확인하려는 토큰의 코인 타입을 입력하세요.
  // 이 예시는 메인넷에 있는 Wormhole 브릿지 USDC 주소입니다.
  getUserUsdcBalance = async (coinType: string) => {
    // const config = new DeepBookConfig();
    const balance = await this.client.getBalance({
      owner: this.getActiveAddress(),
      coinType: coinType,
    });

    // totalBalance는 문자열 형태로 반환되므로, 필요에 따라 숫자로 변환하여 사용해야 합니다.
    console.log(`Total USDC Balance: ${balance.totalBalance}`);
    // UI에 표시하기 위해 잔액을 정수 단위로 변환합니다.
    // USDC는 일반적으로 6개의 소수점을 가집니다.
    // 실제 사용 시에는 코인의 메타데이터를 통해 소수점 정보를 동적으로 가져오는 것이 좋습니다.
    const formattedBalance = Number(balance.totalBalance) / 1_000_000;
    console.log(`Formatted Balance: ${formattedBalance} USDC`);
  };

  // generateProofAsTrader
}
