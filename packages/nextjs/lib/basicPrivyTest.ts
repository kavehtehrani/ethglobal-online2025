import { RPC_ENDPOINTS } from "./constants";
import { createPublicClient, createWalletClient, custom, encodeFunctionData, http, parseEther } from "viem";
import { sepolia } from "viem/chains";

// Simple ETH transfer test for Privy
export async function testBasicPrivyTransaction({
  privyWallet,
  recipientAddress,
  amount = "0.001", // Small amount for testing
}: {
  privyWallet: any;
  recipientAddress: `0x${string}`;
  amount?: string;
}) {
  try {
    console.log("🧪 Testing basic Privy transaction...");
    console.log("Privy wallet:", {
      address: privyWallet?.address,
      type: privyWallet?.walletClientType,
    });

    if (!privyWallet) {
      throw new Error("Privy wallet not available");
    }

    if (!privyWallet.address) {
      throw new Error("Privy wallet address not available");
    }

    // Create public client for reading
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(RPC_ENDPOINTS.SEPOLIA),
    });

    // Check ETH balance
    const balance = await publicClient.getBalance({
      address: privyWallet.address,
    });

    console.log("ETH Balance:", balance.toString(), "wei");
    console.log("ETH Balance:", parseEther(balance.toString()), "ETH");

    const amountInWei = parseEther(amount);
    console.log("Amount to send:", amountInWei.toString(), "wei");

    if (balance < amountInWei) {
      throw new Error(`Insufficient ETH balance. Required: ${amount} ETH, Available: ${balance.toString()} wei`);
    }

    // Send simple ETH transfer using Privy wallet
    console.log("🚀 Sending ETH transfer...");
    const hash = await privyWallet.sendTransaction({
      to: recipientAddress,
      value: amountInWei,
    });

    console.log("✅ Transaction sent!");
    console.log("Transaction hash:", hash);

    return {
      success: true,
      txHash: hash,
      from: privyWallet.address,
      to: recipientAddress,
      amount: amount,
    };
  } catch (error) {
    console.error("❌ Basic Privy transaction failed:", error);
    throw error;
  }
}

// Simple PYUSD transfer test (without gasless features)
export async function testBasicPYUSDTransfer({
  privyWallet,
  recipientAddress,
  amount = "1", // 1 PYUSD
}: {
  privyWallet: any;
  recipientAddress: `0x${string}`;
  amount?: string;
}) {
  try {
    console.log("🧪 Testing basic PYUSD transfer...");

    if (!privyWallet) {
      throw new Error("Privy wallet not available");
    }

    if (!privyWallet.address) {
      throw new Error("Privy wallet address not available");
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

    const PYUSD_ADDRESS = "0x6c3ea9036406852006290770BEdFcAbC0a33aE06"; // Sepolia PYUSD

    // Check PYUSD balance
    const balance = await publicClient.readContract({
      address: PYUSD_ADDRESS,
      abi: PYUSD_ABI,
      functionName: "balanceOf",
      args: [privyWallet.address],
    });

    console.log("PYUSD Balance:", balance.toString());

    const amountInWei = BigInt(parseFloat(amount) * 10 ** 6); // PYUSD has 6 decimals
    console.log("Amount to send:", amountInWei.toString(), "wei");

    if (balance < amountInWei) {
      throw new Error(`Insufficient PYUSD balance. Required: ${amount} PYUSD, Available: ${balance.toString()} wei`);
    }

    // Send PYUSD transfer using Privy wallet
    console.log("🚀 Sending PYUSD transfer...");
    const hash = await privyWallet.sendTransaction({
      to: PYUSD_ADDRESS,
      data: encodeFunctionData({
        abi: PYUSD_ABI,
        functionName: "transfer",
        args: [recipientAddress, amountInWei],
      }),
    });

    console.log("✅ PYUSD transfer sent!");
    console.log("Transaction hash:", hash);

    return {
      success: true,
      txHash: hash,
      from: privyWallet.address,
      to: recipientAddress,
      amount: amount,
      token: "PYUSD",
    };
  } catch (error) {
    console.error("❌ Basic PYUSD transfer failed:", error);
    throw error;
  }
}
