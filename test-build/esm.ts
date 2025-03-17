import "dotenv/config";
import { EthereumSigner } from "../dist/esm/index.js";

async function testEsmTs() {
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
    console.log("ESM TS Test - Address:", address);

    const message = "Hello, Ethereum!";
    const signature = await signer.signMessage(message);
    console.log("ESM TS Test - Signature:", signature);
  } catch (error) {
    console.error("ESM TS Test Error:", error);
  }
}

testEsmTs();
