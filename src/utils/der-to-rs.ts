import { AsnParser } from "@peculiar/asn1-schema";
import { ECDSASigValue } from "@peculiar/asn1-ecc";

const N = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");

export interface RSVSignature {
  r: Buffer;
  s: Buffer;
  v?: number;
}

export function derToRS(derSignature: Buffer): { r: Buffer; s: Buffer } {
  try {
    const parsed = AsnParser.parse(derSignature, ECDSASigValue);
    const r = Buffer.from(parsed.r);
    let s = Buffer.from(parsed.s);

    // Convert to bigints for canonical check
    const sBigInt = BigInt("0x" + s.toString("hex"));
    const canonicalS = sBigInt > N / BigInt(2) ? N - sBigInt : sBigInt;

    // Convert back to buffer with proper padding
    s = Buffer.from(canonicalS.toString(16).padStart(64, "0"), "hex");

    return {
      r: r.length > 32 ? r.subarray(-32) : Buffer.concat([Buffer.alloc(32 - r.length), r]),
      s: s.length > 32 ? s.subarray(-32) : Buffer.concat([Buffer.alloc(32 - s.length), s]),
    };
  } catch (error) {
    throw new Error(`Invalid DER signature: ${error}`);
  }
}
