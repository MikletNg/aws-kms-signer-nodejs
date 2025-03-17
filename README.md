# AWS KMS Signer for Ethereum and Tron

A secure and efficient signer implementation for Ethereum and Tron networks using AWS KMS (Key Management Service) instead of plaintext private keys.

## Features

- 🔐 Secure key management using AWS KMS
- ⚡ Support for both Ethereum and Tron networks
- 📝 Message signing (including EIP-191 and TIP-191 standards)
- 🔄 Transaction signing
- ✅ TypeScript support
- 🧪 Comprehensive test suite

## Installation

```bash
npm install aws-kms-signer-nodejs
```

## Prerequisites

- An AWS account with KMS access
- AWS credentials configured in your environment
- Node.js 20 or higher

## Quick Start

### Setting up AWS KMS

1. Create an asymmetric signing key in AWS KMS:

   - Key type: `ECC_SECG_P256K1`
   - Key usage: `SIGN_VERIFY`
   - Signing algorithm: `ECDSA_SHA_256`

2. Note down the Key ID (you'll need this for the signer)

### Ethereum Signer Usage

```typescript
import { EthereumSigner } from "aws-kms-signer";

// Initialize the signer
const signer = new EthereumSigner({
  keyId: "your-kms-key-id",
});

// Get the Ethereum address
const address = await signer.getAddress();

// Sign a message
const message = "Hello, Ethereum!";
const signature = await signer.signMessage(message);

// Sign a transaction
const transaction = {
  to: "0x...",
  value: ethers.parseEther("0.1"),
  // ... other transaction parameters
};
const signedTx = await signer.signTransaction(transaction);
```

### Tron Signer Usage

```typescript
import { TronSigner } from "aws-kms-signer";

// Initialize the signer
const signer = new TronSigner({
  keyId: "your-kms-key-id",
});

// Get the Tron address
const address = await signer.getAddress();

// Sign a message (TIP-191 compliant)
const message = "Hello, Tron!";
const signature = await signer.signMessageV2(message);

// Sign a transaction
const transaction = await tronWeb.transactionBuilder.sendTrx(
  "recipient-address",
  1000000, // amount in SUN
  address,
);
const signedTx = await signer.signTransaction(transaction);
```

## API Reference

### EthereumSigner

#### Constructor

```typescript
new EthereumSigner({
  keyId: string,
  network: Network,
  provider: Provider,
  logger: Logger,
  kmsClient: KMSClient,
});
```

#### Methods

- `getAddress(): Promise<string>`
- `signMessage(message: string | Uint8Array): Promise<string>`
- `signTransaction(transaction: TransactionRequest): Promise<string>`

### TronSigner

#### Constructor

```typescript
new TronSigner({
  keyId: string,
  network: Network,
  tronweb: TronWeb,
  logger: Logger,
  kmsClient: KMSClient,
});
```

#### Methods

- `getAddress(): Promise<string>`
- `signMessageV2(message: string | Uint8Array): Promise<string>`
- `verifyMessageV2(message: string | Uint8Array, signature: string): Promise<string>`
- `signTransaction(transaction: Transaction): Promise<SignedTransaction>`

## Security Considerations

- AWS KMS keys never leave the AWS KMS service
- All signing operations are performed within AWS KMS
- Access to the KMS key is controlled through AWS IAM policies
- No private keys are stored in your application

## AWS IAM Policy

Minimum required permissions for the AWS user/role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["kms:GetPublicKey", "kms:Sign"],
      "Resource": "arn:aws:kms:region:account-id:key/key-id"
    }
  ]
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For issues and feature requests, please open an issue on GitHub.