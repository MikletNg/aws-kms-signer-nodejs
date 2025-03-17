import { ethers } from "ethers";
import { Network } from "../enums/network.enum.js";
import { getKmsPublicKey } from "../utils/get-kms-public-key.js";
import { createKmsClient } from "../utils/create-kms-client.js";
import { createLogger } from "../utils/create-logger.js";
import { KMSClient } from "@aws-sdk/client-kms";
import { Logger } from "winston";
import { AsnParser } from "@peculiar/asn1-schema";
import { SubjectPublicKeyInfo } from "@peculiar/asn1-x509";
import { signKmsSignature } from "../utils/sign-kms-signature.js";
import { derToRS } from "../utils/der-to-rs.js";

export interface IEthereumSignerConstructorParams {
  keyId: string;
  rpcUrl: string;
}

export interface IEthereumSignerConstructorOptions {
  network?: Network;
  provider?: ethers.Provider;
  kmsClient?: KMSClient;
  logger?: Logger;
}

export class EthereumSigner extends ethers.AbstractSigner {
  private _logger: Logger;
  private _keyId: string;
  private _kmsClient: KMSClient;
  private _provider: ethers.Provider;
  private _rpcUrl: string;

  constructor(params: IEthereumSignerConstructorParams, options?: IEthereumSignerConstructorOptions) {
    const provider = options?.provider || new ethers.JsonRpcProvider(params.rpcUrl);
    super(provider);
    this._logger = options?.logger || createLogger();
    this._keyId = params.keyId;
    this._kmsClient = options?.kmsClient || createKmsClient({});
    this._provider = provider;
    this._rpcUrl = params.rpcUrl;
  }

  connect(provider: ethers.Provider | null): ethers.Signer {
    return new EthereumSigner({ keyId: this._keyId, rpcUrl: this._rpcUrl }, { provider: provider || this._provider, kmsClient: this._kmsClient });
  }

  public async getAddress(): Promise<string> {
    const publicKey = await getKmsPublicKey(this._keyId, this._kmsClient);
    const publicKeyInfo = AsnParser.parse(publicKey, SubjectPublicKeyInfo);
    const publicKeyBytes = new Uint8Array(publicKeyInfo.subjectPublicKey).subarray(1);
    let uncompressed: Uint8Array;
    if (publicKeyBytes.length === 64) {
      uncompressed = new Uint8Array(65);
      uncompressed[0] = 0x04;
      uncompressed.set(publicKeyBytes, 1);
    } else if (publicKeyBytes.length === 65 && publicKeyBytes[0] === 0x04) {
      uncompressed = publicKeyBytes;
    } else if (publicKeyBytes.length === 33) {
      const compressedHex = ethers.hexlify(publicKeyBytes);
      uncompressed = ethers.getBytes(ethers.SigningKey.computePublicKey(compressedHex, false));
    } else {
      throw new Error(`Unsupported public key format: ${publicKeyBytes.length} bytes`);
    }
    if (uncompressed[0] !== 0x04) {
      throw new Error("Invalid uncompressed public key format");
    }
    const keyData = uncompressed.subarray(1);
    const hash = ethers.keccak256(keyData);
    return ethers.getAddress(`0x${hash.slice(-40)}`);
  }

  async signTransaction(transaction: ethers.TransactionRequest): Promise<string> {
    const populatedTx = await this.populateTransaction(transaction);
    const unsignedTx = ethers.Transaction.from({ ...populatedTx, from: undefined });
    if (!unsignedTx.chainId) throw new Error("Chain ID must be defined");
    const serializedTx = unsignedTx.unsignedSerialized;
    const hash = ethers.keccak256(serializedTx);
    const signature = await signKmsSignature(Buffer.from(ethers.getBytes(hash)), this._keyId, this._kmsClient);
    const derBuffer = Buffer.from(signature);
    const { r, s } = derToRS(derBuffer);
    if (unsignedTx.type === 1) {
      const address = await this.getAddress();
      for (const recovery of [0, 1]) {
        try {
          const signature = { r: ethers.hexlify(r), s: ethers.hexlify(s), v: recovery };
          const recovered = ethers.recoverAddress(hash, signature);
          if (recovered.toLowerCase() === address.toLowerCase()) {
            const chainId = unsignedTx.chainId;
            const v = typeof chainId === "bigint" && chainId > 0n ? Number(35n + chainId * 2n + BigInt(recovery)) : 27 + recovery;
            return ethers.Transaction.from({
              ...unsignedTx.toJSON(),
              signature: { r: ethers.hexlify(r), s: ethers.hexlify(s), v },
            }).serialized;
          }
        } catch {
          continue;
        }
      }
    } else if (unsignedTx.type === 2) {
      for (const v of [0, 1]) {
        try {
          const recovered = ethers.recoverAddress(hash, { r: ethers.hexlify(r), s: ethers.hexlify(s), v });
          if (recovered.toLowerCase() === (await this.getAddress()).toLowerCase()) {
            return ethers.Transaction.from({
              ...unsignedTx.toJSON(),
              signature: { r: ethers.hexlify(r), s: ethers.hexlify(s), v },
            }).serialized;
          }
        } catch {
          continue;
        }
      }
    }
    throw new Error("Failed to determine recovery ID for transaction signing");
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    const messageHash = ethers.hashMessage(message);
    const signature = await signKmsSignature(Buffer.from(ethers.getBytes(messageHash)), this._keyId, this._kmsClient);
    const derBuffer = Buffer.from(signature);
    const { r, s } = derToRS(derBuffer);
    for (const v of [0, 1]) {
      try {
        const recovered = ethers.recoverAddress(messageHash, { r: ethers.hexlify(r), s: ethers.hexlify(s), v });
        if (recovered.toLowerCase() === (await this.getAddress()).toLowerCase()) {
          return ethers.Signature.from({ r: ethers.hexlify(r), s: ethers.hexlify(s), v }).serialized;
        }
      } catch {
        continue;
      }
    }
    throw new Error("Failed to determine recovery ID for message signing");
  }

  async signTypedData(domain: ethers.TypedDataDomain, types: Record<string, ethers.TypedDataField[]>, value: Record<string, unknown>): Promise<string> {
    const typeHash = ethers.TypedDataEncoder.hash(domain, types, value);
    const signature = await signKmsSignature(Buffer.from(ethers.getBytes(typeHash)), this._keyId, this._kmsClient);
    const derBuffer = Buffer.from(signature);
    const { r, s } = derToRS(derBuffer);
    for (const v of [0, 1]) {
      try {
        const recovered = ethers.recoverAddress(typeHash, { r: ethers.hexlify(r), s: ethers.hexlify(s), v });
        if (recovered.toLowerCase() === (await this.getAddress()).toLowerCase()) {
          return ethers.Signature.from({ r: ethers.hexlify(r), s: ethers.hexlify(s), v }).serialized;
        }
      } catch {
        continue;
      }
    }
    throw new Error("Failed to determine recovery ID for typed data signing");
  }
}
