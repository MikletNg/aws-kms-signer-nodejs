import { KMSClient, GetPublicKeyCommand } from "@aws-sdk/client-kms";

export const getKmsPublicKey = async (keyId: string, kmsClient: KMSClient): Promise<Uint8Array<ArrayBuffer>> => {
  const response = await kmsClient.send(new GetPublicKeyCommand({ KeyId: keyId }));
  if (!response.PublicKey) throw new Error("Failed to get public key from KMS");
  return new Uint8Array(response.PublicKey);
};
