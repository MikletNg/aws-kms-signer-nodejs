import "dotenv/config";
import { TronWeb } from "tronweb";
import { TronSigner } from "../src/signers/tron.signer.js";
import { createKmsClient } from "../src/utils/create-kms-client.js";

describe("TronSigner", () => {
  let signer: TronSigner;
  let tronWeb: TronWeb;
  const kmsKeyId = process.env.KMS_KEY_ID;

  beforeAll(() => {
    if (!kmsKeyId) {
      throw new Error("KMS_KEY_ID environment variable is required");
    }
    tronWeb = new TronWeb({
      fullHost: process.env.TRON_RPC_URL || "https://api.trongrid.io",
      headers: { "TRON-PRO-API-KEY": process.env.TRON_API_KEY },
    });
    signer = new TronSigner({ keyId: kmsKeyId }, { kmsClient: createKmsClient({}) });
  });

  describe("getAddress", () => {
    it("should return a valid Tron address", async () => {
      const address = await signer.getAddress();
      expect(TronWeb.isAddress(address)).toBe(true);
    });
  });

  describe("Message Signing V2 (TIP-191 compliant)", () => {
    it("should sign and verify a plain text message", async () => {
      const message = "Hello, Tron!";
      const address = await signer.getAddress();
      const signature = await signer.signMessageV2(message);

      // Verify using TronWeb's verifyMessageV2
      const recoveredAddress = await tronWeb.trx.verifyMessageV2(message, signature);
      expect(recoveredAddress).toBe(address);
    });

    it("should sign and verify a Uint8Array message", async () => {
      const message = new Uint8Array([1, 2, 3, 4, 5]);
      const address = await signer.getAddress();
      const signature = await signer.signMessageV2(message);

      // For Uint8Array messages, we need to pass the original Uint8Array to verifyMessageV2
      const recoveredAddress = await tronWeb.trx.verifyMessageV2(message, signature);
      expect(recoveredAddress).toBe(address);
    });

    it("should verify message using our own verifyMessageV2 method", async () => {
      const message = "Test message";
      const signature = await signer.signMessageV2(message);
      const recoveredAddress = await signer.verifyMessageV2(message, signature);
      expect(recoveredAddress).toBe(await signer.getAddress());
    });

    it("should handle hex string as plain text (not as hex data)", async () => {
      const message = "0x1234";
      const address = await signer.getAddress();
      const signature = await signer.signMessageV2(message);

      // Verify using TronWeb's verifyMessageV2
      const recoveredAddress = await tronWeb.trx.verifyMessageV2(message, signature);
      expect(recoveredAddress).toBe(address);
    });

    it("should handle empty string message", async () => {
      const message = "";
      const address = await signer.getAddress();
      const signature = await signer.signMessageV2(message);

      // Verify using TronWeb's verifyMessageV2
      const recoveredAddress = await tronWeb.trx.verifyMessageV2(message, signature);
      expect(recoveredAddress).toBe(address);
    });

    it("should handle empty Uint8Array message", async () => {
      const message = new Uint8Array([]);
      const address = await signer.getAddress();
      const signature = await signer.signMessageV2(message);

      // Convert Uint8Array to hex string for verification
      const messageHex = Buffer.from(message).toString("hex");
      const recoveredAddress = await tronWeb.trx.verifyMessageV2(messageHex, signature);
      expect(recoveredAddress).toBe(address);
    });
  });

  describe("signTransaction", () => {
    it("should sign a transaction and verify the signature format", async () => {
      const address = await signer.getAddress();
      const amount = 100000; // 0.1 TRX in SUN
      const transaction = await tronWeb.transactionBuilder.sendTrx("TNoaUU7iJgbWRyXgY6A2bKBwtBCrXnmGUZ", amount, address);

      const signedTransaction = await signer.signTransaction(transaction);

      // Verify the signature format
      expect(signedTransaction.signature).toBeDefined();
      expect(Array.isArray(signedTransaction.signature)).toBe(true);
      expect(signedTransaction.signature.length).toBe(1);
      expect(typeof signedTransaction.signature[0]).toBe("string");
      expect(signedTransaction.signature[0].length).toBe(130); // 65 bytes in hex = 130 characters
    });
  });
});
