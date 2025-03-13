import { PublicKeyInfo } from "pkijs";
import { ethers } from "ethers";
import { Network } from "../enums/network.enum.js";
import { Types as TronWebTypes } from "tronweb";
import { TronWeb as TypedTronWebClient } from "tronweb";
import { Logger } from "winston";
import { getKmsPublicKey } from "../utils/get-kms-public-key.js";
import { KMSClient } from "@aws-sdk/client-kms";
import { createKmsClient } from "../utils/create-kms-client.js";
import { createLogger } from "../utils/create-logger.js";
import * as asn1js from "asn1js";
import { derToRS } from "../utils/der-to-rs.js";
import { signKmsSignature } from "../utils/sign-kms-signature.js";

export interface ITronSignerConstructorParams {
  kmsId: string;
  network: Network;
}

export interface ITronSignerConstructorOptions {
  tronweb?: TypedTronWebClient;
  logger?: Logger;
  host?: string;
}

export class TronSigner {
  private _logger: Logger;
  private _keyId: string;
  private _kmsClient: KMSClient;

  constructor(params: ITronSignerConstructorParams, options: ITronSignerConstructorOptions) {
    this._logger = options?.logger || createLogger();
    this._keyId = params.kmsId;
    this._kmsClient = createKmsClient({});
  }

  public async getAddress(): Promise<string> {
    const publicKeyDer = await getKmsPublicKey(this._keyId, this._kmsClient);
    const asn1Result = asn1js.fromBER(publicKeyDer.buffer);
    if (asn1Result.offset === -1) {
      throw new Error("Failed to decode public key");
    }
    const publicKeyInfo = new PublicKeyInfo({ schema: asn1Result.result });
    const publicKeyRaw = new Uint8Array(publicKeyInfo.subjectPublicKey.valueBlock.valueHexView);
    const publicKey = new Uint8Array(publicKeyRaw.slice(1));
    const hashBuffer = ethers.keccak256(publicKey);
    const hash = hashBuffer.slice(-40);
    const addressHex = "41" + hash;
    const base58Address = TypedTronWebClient.address.fromHex(addressHex);
    return base58Address;
  }

  private async _calculateRecoveryId(hash: Buffer, r: Buffer, s: Buffer): Promise<number> {
    const publicKeyDer = await getKmsPublicKey(this._keyId, this._kmsClient);
    const asn1Result = asn1js.fromBER(publicKeyDer.buffer);
    if (asn1Result.offset === -1) {
      throw new Error("Failed to decode public key");
    }
    const publicKeyInfo = new PublicKeyInfo({ schema: asn1Result.result });
    const publicKeyRaw = new Uint8Array(publicKeyInfo.subjectPublicKey.valueBlock.valueHexView);
    const publicKey = publicKeyRaw.slice(1);
    const uncompressed = ethers.SigningKey.computePublicKey(publicKey, false);
    for (let v = 0; v < 2; v++) {
      try {
        const sig = ethers.Signature.from({
          r: "0x" + r.toString("hex"),
          s: "0x" + s.toString("hex"),
          v,
        });
        const recovered = ethers.SigningKey.recoverPublicKey(hash, sig);
        if (recovered.toLowerCase() === uncompressed.toLowerCase()) {
          return v;
        }
      } catch (error) {
        console.log(error);
        continue;
      }
    }
    throw new Error("Failed to determine recovery params");
  }

  public async signTransaction(transaction: TronWebTypes.Transaction): Promise<TronWebTypes.SignedTransaction> {
    try {
      const digest = Buffer.from(transaction.txID, "hex");
      const signature = await signKmsSignature(digest, this._keyId, this._kmsClient);
      const derSignature = Buffer.from(signature);
      const { r, s } = derToRS(derSignature);
      const vValue = await this._calculateRecoveryId(digest, r, s);
      const vByte = Buffer.from([vValue]);
      const fullSig = Buffer.concat([r, s, vByte]);
      const hexSignature = fullSig.toString("hex");
      const signedTransaction: TronWebTypes.SignedTransaction = {
        ...transaction,
        signature: [hexSignature],
      };
      return signedTransaction;
    } catch (error) {
      this._logger.error("Failed to sign transaction with AWS KMS key", error);
      throw error;
    }
  }

  public async signMessage(message: string): Promise<string> {
    try {
      // Format message according to Tron's standard message format
      const messagePrefix = "\x19TRON Signed Message:\n";
      const messageBytes = Buffer.from(message);
      const prefixBytes = Buffer.from(messagePrefix + messageBytes.length.toString());
      const prefixedMessage = Buffer.concat([prefixBytes, messageBytes]);

      // Create hash of the prefixed message
      const digest = Buffer.from(ethers.keccak256(prefixedMessage).slice(2), "hex");

      // Sign the message hash with KMS
      const signature = await signKmsSignature(digest, this._keyId, this._kmsClient);
      const derSignature = Buffer.from(signature);

      // Extract r and s values from DER signature
      const { r, s } = derToRS(derSignature);

      // Calculate recovery ID
      const vValue = await this._calculateRecoveryId(digest, r, s);
      const vByte = Buffer.from([vValue]);

      // Combine the signature components
      const fullSig = Buffer.concat([r, s, vByte]);
      const hexSignature = fullSig.toString("hex");

      return hexSignature;
    } catch (error) {
      this._logger.error("Failed to sign message with AWS KMS key", error);
      throw error;
    }
  }

  public async signMessageV2(message: string | Uint8Array): Promise<string> {
    try {
      // Convert message to Uint8Array if it's a string
      const messageBytes =
        typeof message === "string"
          ? new TextEncoder().encode(message) // UTF-8 encode strings
          : message; // Already a Uint8Array

      // Format message according to TIP-191 standard
      const messagePrefix = "\x19TRON Signed Message:\n";
      const messageLength = messageBytes.length.toString();
      const prefixBytes = new TextEncoder().encode(messagePrefix + messageLength);
      const prefixedMessage = Buffer.concat([Buffer.from(prefixBytes), Buffer.from(messageBytes)]);

      // Create hash of the prefixed message
      const digest = Buffer.from(ethers.keccak256(prefixedMessage).slice(2), "hex");

      // Sign the message hash with KMS
      const signature = await signKmsSignature(digest, this._keyId, this._kmsClient);
      const derSignature = Buffer.from(signature);

      // Extract r and s values from DER signature
      const { r, s } = derToRS(derSignature);

      // Calculate recovery ID
      const vValue = await this._calculateRecoveryId(digest, r, s);
      const vByte = Buffer.from([vValue]);

      // Combine the signature components
      const fullSig = Buffer.concat([r, s, vByte]);
      const hexSignature = fullSig.toString("hex");

      return hexSignature;
    } catch (error) {
      this._logger.error("Failed to sign message with AWS KMS key", error);
      throw error;
    }
  }

  public async verifyMessage(message: string, signature: string): Promise<string> {
    try {
      // Format message according to Tron's standard message format (same as in signMessage)
      const messagePrefix = "\x19TRON Signed Message:\n";
      const messageBytes = Buffer.from(message);
      const prefixBytes = Buffer.from(messagePrefix + messageBytes.length.toString());
      const prefixedMessage = Buffer.concat([prefixBytes, messageBytes]);

      // Create hash of the prefixed message
      const digest = Buffer.from(ethers.keccak256(prefixedMessage).slice(2), "hex");

      // Extract signature components
      const signatureBuffer = Buffer.from(signature, "hex");
      if (signatureBuffer.length !== 65) {
        throw new Error("Invalid signature length. Expected 65 bytes.");
      }

      const r = signatureBuffer.subarray(0, 32);
      const s = signatureBuffer.subarray(32, 64);
      const v = signatureBuffer[64];

      // Recover the public key
      const sig = ethers.Signature.from({
        r: "0x" + r.toString("hex"),
        s: "0x" + s.toString("hex"),
        v,
      });

      const recoveredPublicKey = ethers.SigningKey.recoverPublicKey(digest, sig);

      // Convert public key to Tron address
      const ethAddress = ethers.computeAddress(recoveredPublicKey);
      const tronAddressHex = "41" + ethAddress.slice(2);
      const base58Address = TypedTronWebClient.address.fromHex(tronAddressHex);

      return base58Address;
    } catch (error) {
      this._logger.error("Failed to verify message signature", error);
      throw error;
    }
  }

  public async verifyMessageV2(message: string | Uint8Array, signature: string): Promise<string> {
    try {
      // Convert message to Uint8Array if it's a string (same as in signMessageV2)
      const messageBytes =
        typeof message === "string"
          ? new TextEncoder().encode(message) // UTF-8 encode strings
          : message; // Already a Uint8Array

      // Format message according to TIP-191 standard
      const messagePrefix = "\x19TRON Signed Message:\n";
      const messageLength = messageBytes.length.toString();
      const prefixBytes = new TextEncoder().encode(messagePrefix + messageLength);
      const prefixedMessage = Buffer.concat([Buffer.from(prefixBytes), Buffer.from(messageBytes)]);

      // Create hash of the prefixed message
      const digest = Buffer.from(ethers.keccak256(prefixedMessage).slice(2), "hex");

      // Extract signature components
      const signatureBuffer = Buffer.from(signature, "hex");
      if (signatureBuffer.length !== 65) {
        throw new Error("Invalid signature length. Expected 65 bytes.");
      }

      const r = signatureBuffer.subarray(0, 32);
      const s = signatureBuffer.subarray(32, 64);
      const v = signatureBuffer[64];

      // Recover the public key
      const sig = ethers.Signature.from({
        r: "0x" + r.toString("hex"),
        s: "0x" + s.toString("hex"),
        v,
      });

      const recoveredPublicKey = ethers.SigningKey.recoverPublicKey(digest, sig);

      // Convert public key to Tron address
      const ethAddress = ethers.computeAddress(recoveredPublicKey);
      const tronAddressHex = "41" + ethAddress.slice(2);
      const base58Address = TypedTronWebClient.address.fromHex(tronAddressHex);

      return base58Address;
    } catch (error) {
      this._logger.error("Failed to verify message signature", error);
      throw error;
    }
  }
}
