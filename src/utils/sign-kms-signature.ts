import { KMSClient, SignCommand } from "@aws-sdk/client-kms";

export const signKmsSignature = async (message: Uint8Array<ArrayBufferLike>, keyId: string, kmsClient: KMSClient): Promise<Uint8Array<ArrayBufferLike>> => {
  const signResponse = await kmsClient.send(
    new SignCommand({
      KeyId: keyId,
      Message: message,
      MessageType: "DIGEST",
      SigningAlgorithm: "ECDSA_SHA_256",
    }),
  );
  if (!signResponse.Signature) {
    throw new Error("Failed to sign message with AWS KMS key");
  }
  return signResponse.Signature;
};
