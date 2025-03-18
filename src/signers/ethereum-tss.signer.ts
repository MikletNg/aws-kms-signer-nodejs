import { EthereumSigner } from "./ethereum.signer.js";
import { ethers } from "ethers";
import { randomBytes, createHash } from "node:crypto";
import * as secp256k1 from "noble-secp256k1";

export interface IKeyShare {
  id: number;
  publicKey: string;
}

export interface IPartialKeySignature {
  id: string;
  kShare: Buffer;
  rPoint: Buffer;
  signature: Buffer;
}

export class EthereumTSSSigner {
  private _signers: EthereumSigner[];

  constructor(signers: EthereumSigner[]) {
    this._signers = signers;
  }

  static generateKeyShares(n: number): IKeyShare[] {
    
  }
}
