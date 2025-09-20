# Sui 온체인 DCA 프로토콜

이 프로젝트는 DeepBook을 활용하여 Sui 네트워크에서 온체인 DCA(달러 비용 평균법) 프로토콜을 위한 백엔드 서비스입니다.

## 작동 흐름

1.  **Balance Manager 생성**: 사용자를 위한 가상 입금 지갑이 생성됩니다.
2.  **권한 위임 및 자금 입금**: 사용자는 balance manager에 자금을 입금하고 거래 권한을 플랫폼에 위임합니다.
3.  **주기적인 거래**: cron job으로 실행되는 백엔드 서비스가 주기적으로 플랫폼의 키를 사용하여 거래를 실행합니다.
4.  **잔액 확인**: 사용자는 가상 입금 지갑의 잔액을 확인할 수 있습니다.

## 사전 요구 사항

- Node.js
- npm (또는 yarn)

## 환경 설정

1.  `.env.sample` 파일로부터 `.env` 파일을 생성합니다:

    ```bash
    cp .env.sample .env
    ```

2.  `.env` 파일을 당신의 자격 증명으로 업데이트하세요:

    - `ENV`: `testnet` 또는 `mainnet`으로 설정합니다.
    - `BALANCE_MANAGER_KEY`: balance manager를 위한 키입니다.
    - `PRIVATE_KEY`: Sui 네트워크를 위한 당신의 private key입니다.
    - `MAINNET_BALANCE_MANAGER_ADDRESS`: 메인넷의 balance manager 주소입니다.
    - `TESTNET_BALANCE_MANAGER_ADDRESS`: 테스트넷의 balance manager 주소입니다.

## 설치

프로젝트 의존성을 설치합니다:

```bash
npm install
```

## 사용법

다음 스크립트들은 `src` 디렉토리에 위치해 있으며, 아래 순서대로 실행해야 합니다:

1.  **`0_faucet.ts`**: (테스트넷 전용) faucet에서 SUI 토큰을 요청합니다.

    ```bash
    npx ts-node src/0_faucet.ts
    ```

2.  **`1_create_balance_manager.ts`**: 새로운 balance manager를 생성합니다.

    ```bash
    npx ts-node src/1_create_balance_manager.ts
    ```

3.  **`2_deposit_and_delegate_tradecap.ts`**: 자금을 입금하고 플랫폼에 거래 권한을 위임합니다.

    ```bash
    # ⭐️ 생성된 Balance Manager ID로 .env 파일을 업데이트하세요
    npx ts-node src/2_deposit_and_delegate_tradecap.ts
    ```

4.  **`3_trading_by_platform.ts`**: 플랫폼의 키를 사용하여 거래를 실행합니다.

    ```bash
    npx ts-node src/3_trading_by_platform.ts
    ```

5.  **`4_balance.ts`**: 가상 입금 지갑의 잔액을 확인합니다.

    ```bash
    npx ts-node src/4_balance.ts
    ```

## Cron Job을 이용한 백엔드 서비스

거래 로직을 cron job을 사용하는 백엔드 서비스로 실행하려면, `node-cron`과 같은 라이브러리를 사용할 수 있습니다.

먼저, `node-cron`과 그 타입을 설치합니다:

```bash
npm install node-cron
npm install -D @types/node-cron
```

다음으로, `src/server.ts` 파일을 아래 내용으로 생성합니다:

```typescript
import cron from "node-cron";
import { Transaction } from "@mysten/sui/transactions";
import { DeepBookMarketMaker } from "./deepbookMarketMaker";
import { config } from "dotenv";

// .env 파일에서 환경 변수 로드
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
    throw new Error("PLATFORM_PRIVATE_KEY가 .env 파일에 설정되지 않았습니다");
  }

  const env = process.env.ENV as "testnet" | "mainnet" | undefined;
  if (!env || (env !== "testnet" && env !== "mainnet")) {
    throw new Error(
      "ENV는 .env 파일에서 'testnet' 또는 'mainnet'으로 설정되어야 합니다"
    );
  }

  console.log(`👉 ${env}에서 실행 중`);

  // 생성된 balance manager로 초기화
  const balanceManagers = {
    [BALANCE_MANAGER_KEY]: {
      address: balanceManagerAddress[env],
      tradeCap:
        "0x9434b149adc74e022d49f760bb333337c93779205efdec7c2e8fc1474b874fe8",
    },
  };

  console.log(`선택된 balance manager 객체: ${balanceManagerAddress[env]}`);
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
      `트랜잭션 다이제스트: ${res.digest}, 상태: ${res.effects?.status.status}`
    );
  }
};

// 매시간 거래 로직을 실행하도록 스케줄링
cron.schedule("0 * * * *", () => {
  console.log("거래 실행 중...");
  trade();
});

console.log("Cron job이 스케줄되었습니다.");
```

마지막으로, `package.json` 파일에 `start:server` 스크립트를 추가합니다:

```json
"scripts": {
  "start:server": "npx ts-node src/server.ts"
}
```

그 다음 아래 명령어로 백엔드 서비스를 시작할 수 있습니다:

```bash
npm run start:server
```
