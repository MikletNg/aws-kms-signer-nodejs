const dotenv = require("dotenv");
dotenv.config();
const { EthereumSigner } = require("../dist/cjs/index.js");

async function testCjsJs() {
  try {
    const signer = new EthereumSigner({
      keyId: process.env.KMS_KEY_ID,
      rpcUrl: process.env.ETHEREUM_RPC_URL,
    });

    const address = await signer.getAddress();
    console.log("CJS JS Test - Address:", address);

    const message = "Hello, Ethereum!";
    const signature = await signer.signMessage(message);
    console.log("CJS JS Test - Signature:", signature);
  } catch (error) {
    console.error("CJS JS Test Error:", error);
  }
}

testCjsJs();
