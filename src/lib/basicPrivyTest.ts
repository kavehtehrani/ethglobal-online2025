import { RPC_ENDPOINTS, CONTRACTS } from "./constants";
import { createPublicClient, encodeFunctionData, http, parseEther } from "viem";
import { sepolia } from "viem/chains";

// Type for Privy sendTransaction function
type PrivySendTransaction = (
  transaction: {
    to: `0x${string}`;
    value?: bigint;
    data?: `0x${string}`;
    chainId: number;
  },
  options?: {
    uiOptions?: {
      showWalletUIs?: boolean;
    };
    address?: `0x${string}`;
  }
) => Promise<string>;

// Simple ETH transfer test for Privy
export async function testBasicPrivyTransaction({
  privySendTransaction,
  walletAddress,
  recipientAddress,
  amount = "0.001", // Small amount for testing
}: {
  privySendTransaction: PrivySendTransaction;
  walletAddress: `0x${string}`;
  recipientAddress: `0x${string}`;
  amount?: string;
}) {

  if (!privySendTransaction) {
    throw new Error("Privy sendTransaction not available");
  }

  // Create public client for reading
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(RPC_ENDPOINTS.SEPOLIA),
  });

  // Check ETH balance
  const balance = await publicClient.getBalance({
    address: walletAddress,
  });


  const amountInWei = parseEther(amount);

  if (balance < amountInWei) {
    throw new Error(
      `Insufficient ETH balance. Required: ${amount} ETH, Available: ${balance.toString()} wei`
    );
  }

  // Send simple ETH transfer using Privy's sendTransaction
  const hash = await privySendTransaction(
    {
      to: recipientAddress,
      value: amountInWei,
      chainId: sepolia.id,
    },
    {
      uiOptions: {
        showWalletUIs: true,
      },
      address: walletAddress,
    }
  );


  return {
    success: true,
    txHash: hash,
    from: walletAddress,
    to: recipientAddress,
    amount: amount,
  };
}

// Simple PYUSD transfer test (without gasless features)
export async function testBasicPYUSDTransfer({
  privySendTransaction,
  walletAddress,
  recipientAddress,
  amount = "1", // 1 PYUSD
}: {
  privySendTransaction: PrivySendTransaction;
  walletAddress: `0x${string}`;
  recipientAddress: `0x${string}`;
  amount?: string;
}) {

  if (!privySendTransaction) {
    throw new Error("Privy sendTransaction not available");
  }

  // Create public client
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(RPC_ENDPOINTS.SEPOLIA),
  });

  // PYUSD contract ABI (minimal)
  const PYUSD_ABI = [
    {
      inputs: [{ internalType: "address", name: "account", type: "address" }],
      name: "balanceOf",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        { internalType: "address", name: "to", type: "address" },
        { internalType: "uint256", name: "amount", type: "uint256" },
      ],
      name: "transfer",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "nonpayable",
      type: "function",
    },
  ] as const;

  const PYUSD_ADDRESS = CONTRACTS.PYUSD; // Use the correct checksummed address from constants

  // Check PYUSD balance
  const balance = await publicClient.readContract({
    address: PYUSD_ADDRESS,
    abi: PYUSD_ABI,
    functionName: "balanceOf",
    args: [walletAddress],
  });


  const amountInWei = BigInt(parseFloat(amount) * 10 ** 6); // PYUSD has 6 decimals

  if (balance < amountInWei) {
    throw new Error(
      `Insufficient PYUSD balance. Required: ${amount} PYUSD, Available: ${balance.toString()} wei`
    );
  }

  // Send PYUSD transfer using Privy's sendTransaction
  const hash = await privySendTransaction(
    {
      to: PYUSD_ADDRESS,
      data: encodeFunctionData({
        abi: PYUSD_ABI,
        functionName: "transfer",
        args: [recipientAddress, amountInWei],
      }),
      chainId: sepolia.id,
    },
    {
      uiOptions: {
        showWalletUIs: true,
      },
      address: walletAddress,
    }
  );


  return {
    success: true,
    txHash: hash,
    from: walletAddress,
    to: recipientAddress,
    amount: amount,
    token: "PYUSD",
  };
}
