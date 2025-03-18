import * as secp256k1 from "noble-secp256k1";
import { createHash } from "node:crypto";

export class TSSUtils {
  static bufferToBigInt(buffer: Buffer): bigint {
    return BigInt("0x" + buffer.toString("hex"));
  }
  static bigIntToBuffer(value: bigint, length = 32): Buffer {
    return Buffer.from(value.toString(16).padStart(length * 2, "0"), "hex");
  }

  static hash(data: Buffer): Buffer {
    return createHash("sha256").update(data).digest();
  }

  static modAdd(a: bigint, b: bigint): bigint {
    return (a + b) % secp256k1.CURVE.n;
  }

  static modMul(a: bigint, b: bigint): bigint {
    return (a * b) % secp256k1.CURVE.n;
  }

  static modInv(a: bigint): bigint {
    const n = secp256k1.CURVE.n;
    let t = BigInt(0);
    let newt = BigInt(1);
    let r = n;
    let newr = a;
    while (newr !== BigInt(0)) {
      const quotient = r / newr;
      [t, newt] = [newt, t - quotient * newt];
      [r, newr] = [newr, r - quotient * newr];
    }
    if (t < BigInt(0)) {
      t += n;
    }
    return t;
  }

  static derivePoint(seed: Buffer): Buffer {
    const hash = this.hash(seed);
    const scalar = this.bufferToBigInt(hash) % secp256k1.CURVE.n;
    const point = secp256k1.Point.fromPrivateKey(scalar);
    return Buffer.from(point.toHex(true), "hex");
  }
}
