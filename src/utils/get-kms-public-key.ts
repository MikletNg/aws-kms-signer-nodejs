import { KMSClient, GetPublicKeyCommand } from "@aws-sdk/client-kms";

const CACHE = new Map<string, Uint8Array<ArrayBuffer>>();

export const getKmsPublicKey = async (keyId: string, kmsClient: KMSClient): Promise<Uint8Array<ArrayBuffer>> => {
  if (CACHE.has(keyId)) {
    return CACHE.get(keyId)!;
  }
  const response = await kmsClient.send(new GetPublicKeyCommand({ KeyId: keyId }));
  if (!response.PublicKey) throw new Error("Failed to get public key from KMS");
  const publicKey = new Uint8Array(response.PublicKey);
  CACHE.set(keyId, publicKey);
  return publicKey;
};
