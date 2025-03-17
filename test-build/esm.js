import "dotenv/config";
import { EthereumSigner } from "../dist/esm/index.js";

async function testEsmJs() {
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
    console.log("ESM JS Test - Address:", address);

    const message = "Hello, Ethereum!";
    const signature = await signer.signMessage(message);
    console.log("ESM JS Test - Signature:", signature);
  } catch (error) {
    console.error("ESM JS Test Error:", error);
  }
}

testEsmJs();
