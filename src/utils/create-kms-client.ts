import { KMSClient } from "@aws-sdk/client-kms";
import { AwsCredentialIdentity } from "@aws-sdk/types";

export interface ICreateKmsClient {
  region?: string;
  credentials?: AwsCredentialIdentity;
}

export const createKmsClient = ({ region, credentials }: ICreateKmsClient) => {
  return new KMSClient({ region: region || process.env.AWS_REGION || "us-east-1", credentials });
};
