// Network configuration
export const SEPOLIA_CHAIN_ID = 11155111;
export const FEE_RECEIVER_ADDRESS =
  "0xe6DdDcbb2848983D9cAaB715611849E579759CB0" as `0x${string}`;

// Contract addresses on Sepolia
export const CONTRACTS = {
  // Official PYUSD contract on Sepolia (checksummed)
  PYUSD: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9" as `0x${string}`,

  // Our deployed GaslessPaymentAccount contract on Sepolia
  // GASLESS_PAYMENT_ACCOUNT:
  //   "0x57192C5A0F4c44Aeb0208569345A7939a8c65578" as `0x${string}`,
  GASLESS_PAYMENT_ACCOUNT:
    "0x8dcdadd6222199af209ddc4454ab3df402454867" as `0x${string}`,

  // EIP-7702 implementation addresses (must have bytecode on Sepolia).
  // Prefer setting NEXT_PUBLIC_7702_IMPLEMENTATION in .env.local to your chosen implementation.
  GASLESS_PAYMENT_ACCOUNT_IMPLEMENTATION:
    (process.env.NEXT_PUBLIC_7702_IMPLEMENTATION as `0x${string}`) ||
    ("0xe6Cae83BdE06E4c305530e199D7217f42808555B" as `0x${string}`),

  // SimpleAccount implementations
  SIMPLE_ACCOUNT: "0xe6Cae83BdE06E4c305530e199D7217f42808555B" as `0x${string}`, // Standard SimpleAccount

  // Transaction counter for free tier tracking
  TRANSACTION_COUNTER:
    "0xE6A149825907757801936FCdA35Ab96A13c8cB04" as `0x${string}`,
} as const;

// Pimlico configuration
export const PIMLICO = {
  // Pimlico API endpoints
  SEPOLIA_RPC_URL: (apiKey: string) =>
    `https://api.pimlico.io/v2/11155111/rpc?apikey=${apiKey}`,
} as const;

// RPC endpoints
export const RPC_ENDPOINTS = {
  // SEPOLIA: "https://sepolia.drpc.org",
  SEPOLIA: "https://ethereum-sepolia-rpc.publicnode.com",
} as const;

// Default values - use environment variables if available, otherwise empty
export const DEFAULT_TEST_VALUES = {
  RECIPIENT_ADDRESS: (process.env.NEXT_PUBLIC_DEFAULT_RECIPIENT ||
    "") as `0x${string}`,
  AMOUNT_PYUSD: process.env.NEXT_PUBLIC_DEFAULT_AMOUNT || "",
} as const;
