import "dotenv/config";
import { ethers } from "ethers";
import { EthereumSigner } from "../src/signers/ethereum.signer.js";
import { createKmsClient } from "../src/utils/create-kms-client.js";

describe("EthereumSigner", () => {
  let signer: EthereumSigner;
  const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL || "http://localhost:8545");
  const kmsKeyId = process.env.KMS_KEY_ID;

  beforeAll(() => {
    if (!kmsKeyId) {
      throw new Error("KMS_KEY_ID environment variable is required");
    }
    signer = new EthereumSigner({ keyId: kmsKeyId, rpcUrl: process.env.ETHEREUM_RPC_URL || "http://localhost:8545" }, { provider, kmsClient: createKmsClient({}) });
  });

  describe("getAddress", () => {
    it("should return a valid Ethereum address", async () => {
      const address = await signer.getAddress();
      expect(ethers.isAddress(address)).toBe(true);
    });
  });

  describe("signMessage", () => {
    it("should sign a message and verify the signature", async () => {
      const message = "Hello, Ethereum!";
      const signature = await signer.signMessage(message);

      // Verify the signature
      const recoveredAddress = ethers.verifyMessage(message, signature);

      expect(recoveredAddress.toLowerCase()).toBe((await signer.getAddress()).toLowerCase());
    });

    it("should sign a Uint8Array message", async () => {
      const message = new Uint8Array([1, 2, 3, 4, 5]);
      const signature = await signer.signMessage(message);

      const recoveredAddress = ethers.verifyMessage(message, signature);

      expect(recoveredAddress.toLowerCase()).toBe((await signer.getAddress()).toLowerCase());
    });
  });

  describe("signTypedData", () => {
    it("should sign typed data and verify the signature", async () => {
      const domain: ethers.TypedDataDomain = {
        name: "Test Domain",
        version: "1",
        chainId: 1,
      };

      const types: Record<string, ethers.TypedDataField[]> = {
        Person: [
          { name: "name", type: "string" },
          { name: "wallet", type: "address" },
        ],
        Mail: [
          { name: "from", type: "Person" },
          { name: "to", type: "Person" },
          { name: "contents", type: "string" },
        ],
      };

      const value = {
        from: {
          name: "Alice",
          wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
        },
        to: {
          name: "Bob",
          wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
        },
        contents: "Hello, Bob!",
      };

      const signature = await signer.signTypedData(domain, types, value);

      const recoveredAddress = ethers.verifyTypedData(domain, types, value, signature);

      expect(recoveredAddress.toLowerCase()).toBe((await signer.getAddress()).toLowerCase());
    });
  });

  describe("signTransaction", () => {
    it("should sign a legacy transaction", async () => {
      const chainId = await provider.getNetwork().then((network) => network.chainId);

      const tx: ethers.TransactionRequest = {
        to: "0x1234567890123456789012345678901234567890",
        value: ethers.parseEther("0"),
        type: 1,
      };

      const signedTx = await signer.signTransaction(tx);

      const parsedTx = ethers.Transaction.from(signedTx);
      expect(parsedTx.from?.toLowerCase()).toBe((await signer.getAddress()).toLowerCase());
      expect(parsedTx.chainId).toBe(chainId);
    });

    it("should sign an EIP-1559 transaction", async () => {
      const chainId = await provider.getNetwork().then((network) => network.chainId);

      const tx: ethers.TransactionRequest = {
        to: "0x1234567890123456789012345678901234567890",
        value: ethers.parseEther("0"),
        type: 2,
      };

      const signedTx = await signer.signTransaction(tx);

      const parsedTx = ethers.Transaction.from(signedTx);
      expect(parsedTx.from?.toLowerCase()).toBe((await signer.getAddress()).toLowerCase());
      expect(parsedTx.chainId).toBe(chainId);
      expect(parsedTx.type).toBe(2);
    });
  });
});
