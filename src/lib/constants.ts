// Network configuration
export const SEPOLIA_CHAIN_ID = 11155111;

// Contract addresses on Sepolia
export const CONTRACTS = {
  // Official PYUSD contract on Sepolia (checksummed)
  PYUSD: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9" as `0x${string}`,

  // Our deployed SimpleAccount contract on Sepolia
  SIMPLE_ACCOUNT: "0x57192C5A0F4c44Aeb0208569345A7939a8c65578" as `0x${string}`,

  // EIP-7702 SimpleAccount implementation address (must have bytecode on Sepolia).
  // Prefer setting NEXT_PUBLIC_7702_IMPLEMENTATION in .env.local to your chosen implementation.
  SIMPLE_ACCOUNT_IMPLEMENTATION:
    (process.env.NEXT_PUBLIC_7702_IMPLEMENTATION as `0x${string}`) ||
    ("0xe6Cae83BdE06E4c305530e199D7217f42808555B" as `0x${string}`),

  // EntryPoint v0.7 address (used by Pimlico)
  ENTRY_POINT_V07:
    "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as `0x${string}`,
} as const;

// Pimlico configuration
export const PIMLICO = {
  // Pimlico paymaster address (from user operation logs)
  PAYMASTER: "0x888888888888Ec68A58AB8094Cc1AD20Ba3D2402" as `0x${string}`,

  // Pimlico API endpoints
  API_BASE_URL: "https://api.pimlico.io/v2",
  SEPOLIA_RPC_URL: (apiKey: string) =>
    `https://api.pimlico.io/v2/11155111/rpc?apikey=${apiKey}`,
} as const;

// RPC endpoints
export const RPC_ENDPOINTS = {
  SEPOLIA: "https://sepolia.drpc.org",
} as const;

// Token configuration
export const TOKENS = {
  PYUSD: {
    address: CONTRACTS.PYUSD,
    decimals: 6, // PYUSD uses 6 decimals
    symbol: "PYUSD",
    name: "PayPal USD",
  },
} as const;

// EIP-7702 configuration
export const EIP7702 = {
  DOMAIN: {
    name: "EIP-7702",
    version: "1",
  },
  TYPES: {
    Authorization: [
      { name: "address", type: "address" },
      { name: "chainId", type: "uint256" },
      { name: "nonce", type: "uint256" },
    ],
  },
  PRIMARY_TYPE: "Authorization",
} as const;

// Default test values (for development)
export const DEFAULT_TEST_VALUES = {
  RECIPIENT_ADDRESS:
    "0xB0826C6f126A04cEc28229D048911Fd8B9668F04" as `0x${string}`,
  AMOUNT_PYUSD: "1",
} as const;
