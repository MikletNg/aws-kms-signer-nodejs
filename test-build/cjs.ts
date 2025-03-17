import "dotenv/config";
import { EthereumSigner } from "../dist/cjs/index.js";

async function testCjsTs() {
  try {
    const signer = new EthereumSigner(
      {
        keyId: process.env.KMS_KEY_ID,
        rpcUrl: process.env.ETHEREUM_RPC_URL,
      },
      {
        network: "testnet",
      },
    );

    const address = await signer.getAddress();
    console.log("CJS TS Test - Address:", address);

    const message = "Hello, Ethereum!";
    const signature = await signer.signMessage(message);
    console.log("CJS TS Test - Signature:", signature);
  } catch (error) {
    console.error("CJS TS Test Error:", error);
  }
}

testCjsTs();
