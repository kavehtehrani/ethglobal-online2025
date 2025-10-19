import { CONTRACTS, PIMLICO, RPC_ENDPOINTS, TOKENS } from "./constants";
import { createSmartAccountClient } from "permissionless";
import { to7702SimpleSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { type Hex, createPublicClient, createWalletClient, custom, encodeFunctionData, formatUnits, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { hashAuthorization } from "viem/experimental";

const PYUSD_ABI = [
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
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

export interface GaslessPaymentParams {
  recipientAddress: `0x${string}`;
  amount: string; // PYUSD amount (6 decimals)
}

export async function executeGaslessPayment({ recipientAddress, amount }: GaslessPaymentParams) {
  try {
    console.log("🚀 Starting EIP-7702 gasless payment following Pimlico's exact pattern...");

    // Step 1: Get private key from environment
    const privateKey = process.env.NEXT_PUBLIC_DEMO_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("NEXT_PUBLIC_DEMO_PRIVATE_KEY not found in environment variables");
    }

    // Step 2: Create EOA account using viem (has native signAuthorization)
    const eoa7702 = privateKeyToAccount(privateKey as `0x${string}`);
    console.log("✅ EOA address:", eoa7702.address);

    // Step 3: Create public client
    const client = createPublicClient({
      chain: sepolia,
      transport: http(RPC_ENDPOINTS.SEPOLIA),
    });

    // Step 4: Check PYUSD balance
    const amountInWei = BigInt(parseFloat(amount) * 10 ** TOKENS.PYUSD.decimals);
    const pyusdBalance = (await client.readContract({
      address: CONTRACTS.PYUSD,
      abi: PYUSD_ABI,
      functionName: "balanceOf",
      args: [eoa7702.address],
    })) as bigint;

    console.log("User PYUSD balance:", formatUnits(pyusdBalance, TOKENS.PYUSD.decimals), "PYUSD");
    console.log("Transfer amount:", amount, "PYUSD");

    if (pyusdBalance < amountInWei) {
      throw new Error(
        `Insufficient PYUSD balance. Required: ${amount} PYUSD, Available: ${formatUnits(pyusdBalance, TOKENS.PYUSD.decimals)} PYUSD`,
      );
    }

    // Step 5: Create 7702 Simple Smart Account (following Pimlico docs exactly)
    const simple7702Account = await to7702SimpleSmartAccount({
      client,
      owner: eoa7702, // ✅ viem account with native signAuthorization
    });

    console.log("✅ Smart account created:", simple7702Account.address);
    console.log("   Matches EOA:", simple7702Account.address.toLowerCase() === eoa7702.address.toLowerCase());

    // Step 6: Setup Pimlico client for paymaster
    const pimlicoAPIKey = process.env.NEXT_PUBLIC_PIMLICO_API_KEY;
    if (!pimlicoAPIKey) {
      throw new Error("NEXT_PUBLIC_PIMLICO_API_KEY not found");
    }

    const pimlicoUrl = PIMLICO.SEPOLIA_RPC_URL(pimlicoAPIKey);
    const pimlicoClient = createPimlicoClient({
      chain: sepolia,
      transport: http(pimlicoUrl),
    });

    console.log("✅ Pimlico client created");

    // Step 7: Create Smart Account Client
    const smartAccountClient = createSmartAccountClient({
      client,
      chain: sepolia,
      account: simple7702Account,
      paymaster: pimlicoClient,
      bundlerTransport: http(pimlicoUrl),
    });

    console.log("✅ Smart account client created");

    // Step 8: Check if authorization is needed
    const isSmartAccountDeployed = await smartAccountClient.account.isDeployed();
    console.log("Authorization already set:", isSmartAccountDeployed);

    // Step 9: Build PYUSD transfer call data
    const transferData = encodeFunctionData({
      abi: PYUSD_ABI,
      functionName: "transfer",
      args: [recipientAddress, amountInWei],
    });

    console.log("📝 Transfer data built");

    // Step 10: Send transaction (following Pimlico's exact pattern)
    let transactionHash: Hex;

    if (!isSmartAccountDeployed) {
      // First transaction: include EIP-7702 authorization
      console.log("🔐 First transaction - signing EIP-7702 authorization...");

      const authorization = await eoa7702.signAuthorization({
        contractAddress: CONTRACTS.SIMPLE_ACCOUNT_IMPLEMENTATION,
        chainId: sepolia.id,
        nonce: await client.getTransactionCount({ address: eoa7702.address }),
      });

      console.log("✅ Authorization signed");

      transactionHash = await smartAccountClient.sendTransaction({
        to: CONTRACTS.PYUSD,
        value: 0n,
        data: transferData,
        authorization: authorization as any,
      });
    } else {
      // Subsequent transactions: authorization already set
      console.log("✅ Using existing authorization");

      transactionHash = await smartAccountClient.sendTransaction({
        to: CONTRACTS.PYUSD,
        value: 0n,
        data: transferData,
      });
    }

    console.log("✅ Gasless transaction submitted!");
    console.log("Transaction hash:", transactionHash);

    return {
      success: true,
      txHash: transactionHash,
      address: eoa7702.address,
    };
  } catch (error) {
    console.error("❌ Gasless payment failed:", error);
    throw error;
  }
}

// Wallet-based EIP-7702 flow using viem's native utilities
export async function executeGaslessPaymentWithWallet({ recipientAddress, amount }: GaslessPaymentParams) {
  console.log("🔧 executeGaslessPaymentWithWallet called with:", { recipientAddress, amount });
  try {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      throw new Error("No injected wallet found");
    }

    console.log("🚀 Starting wallet-based EIP-7702 gasless payment...");

    // Clients
    const client = createPublicClient({ chain: sepolia, transport: http(RPC_ENDPOINTS.SEPOLIA) });
    const walletClient = createWalletClient({ chain: sepolia, transport: custom((window as any).ethereum) });

    const [connectedAddress] = await walletClient.getAddresses();
    if (!connectedAddress) throw new Error("No connected wallet address");

    console.log("✅ Connected wallet address:", connectedAddress);

    // Balance check
    const amountInWei = BigInt(parseFloat(amount) * 10 ** TOKENS.PYUSD.decimals);
    const pyusdBalance = (await client.readContract({
      address: CONTRACTS.PYUSD,
      abi: PYUSD_ABI,
      functionName: "balanceOf",
      args: [connectedAddress],
    })) as bigint;

    console.log("User PYUSD balance:", formatUnits(pyusdBalance, TOKENS.PYUSD.decimals), "PYUSD");

    if (pyusdBalance < amountInWei) {
      throw new Error(
        `Insufficient PYUSD balance. Required: ${amount} PYUSD, Available: ${formatUnits(pyusdBalance, TOKENS.PYUSD.decimals)} PYUSD`,
      );
    }

    // Create a wallet account for EIP-7702 signing
    const walletAccount = {
      address: connectedAddress,
      type: "local" as const,
      source: "custom" as const,
      publicKey: "0x" as `0x${string}`,
      signMessage: async ({ message }: { message: any }) => {
        const messageString = typeof message === "string" ? message : message.raw;
        return await walletClient.signMessage({ account: connectedAddress, message: messageString });
      },
      signTypedData: async (typedData: any) => {
        return await walletClient.signTypedData({ account: connectedAddress, ...typedData });
      },
      signTransaction: async () => {
        throw new Error("signTransaction not supported");
      },
      signAuthorization: async (params: any) => {
        console.log("🔐 Signing EIP-7702 authorization with wallet...");

        // Manual EIP-7702 authorization signing for JSON-RPC accounts (MetaMask)
        const authParams = {
          contractAddress: CONTRACTS.SIMPLE_ACCOUNT_IMPLEMENTATION,
          chainId: sepolia.id,
          nonce: params.nonce,
        };

        console.log("Authorization params:", authParams);

        // Compute the EIP-7702 hash
        const hash = hashAuthorization(authParams);
        console.log("EIP-7702 hash to sign:", hash);

        // Try eth_sign first, fallback to personal_sign if blocked
        let signature: string;
        try {
          signature = await (window as any).ethereum.request({
            method: "eth_sign",
            params: [connectedAddress, hash],
          });
        } catch (ethSignError: any) {
          console.log("eth_sign blocked, trying personal_sign:", ethSignError.message);

          // Fallback: use personal_sign with the hash (adds EIP-191 prefix)
          // This won't work for EIP-7702 verification, but we'll try anyway
          signature = await (window as any).ethereum.request({
            method: "personal_sign",
            params: [hash, connectedAddress],
          });

          console.warn("⚠️ Using personal_sign - this may not work with EIP-7702 verification");
        }

        console.log("Raw signature:", signature);

        // Parse signature components
        const r = `0x${signature.slice(2, 66)}` as `0x${string}`;
        const s = `0x${signature.slice(66, 130)}` as `0x${string}`;
        const v = parseInt(signature.slice(130, 132), 16);
        const yParity = v >= 27 ? v - 27 : v;

        const authorization = {
          address: authParams.contractAddress,
          chainId: authParams.chainId,
          nonce: authParams.nonce,
          r,
          s,
          yParity,
        };

        console.log("✅ Authorization signed:", authorization);
        return authorization;
      },
    };

    // Build 7702 account for this EOA
    const simple7702Account = await to7702SimpleSmartAccount({
      client,
      owner: walletAccount,
    });

    console.log("✅ Smart account created:", simple7702Account.address);

    // Pimlico clients
    const pimlicoAPIKey = process.env.NEXT_PUBLIC_PIMLICO_API_KEY;
    if (!pimlicoAPIKey) throw new Error("NEXT_PUBLIC_PIMLICO_API_KEY not found");
    const pimlicoUrl = PIMLICO.SEPOLIA_RPC_URL(pimlicoAPIKey);
    const pimlicoClient = createPimlicoClient({ chain: sepolia, transport: http(pimlicoUrl) });

    const smartAccountClient = createSmartAccountClient({
      client,
      chain: sepolia,
      account: simple7702Account,
      paymaster: pimlicoClient,
      bundlerTransport: http(pimlicoUrl),
    });

    const isDeployed = await smartAccountClient.account.isDeployed();
    console.log("Authorization already set:", isDeployed);

    // Prepare call data
    const transferData = encodeFunctionData({
      abi: PYUSD_ABI,
      functionName: "transfer",
      args: [recipientAddress, amountInWei],
    });

    console.log("📝 Transfer data built");

    // Send transaction with conditional authorization
    let txHash: Hex;
    if (!isDeployed) {
      console.log("🔐 First transaction - signing EIP-7702 authorization...");

      const nonce = await client.getTransactionCount({ address: connectedAddress });
      const authorization = await walletAccount.signAuthorization({
        contractAddress: CONTRACTS.SIMPLE_ACCOUNT_IMPLEMENTATION,
        chainId: sepolia.id,
        nonce,
      });

      txHash = await smartAccountClient.sendTransaction({
        to: CONTRACTS.PYUSD,
        value: 0n,
        data: transferData,
        authorization: authorization as any,
      });
    } else {
      console.log("✅ Using existing authorization");

      txHash = await smartAccountClient.sendTransaction({
        to: CONTRACTS.PYUSD,
        value: 0n,
        data: transferData,
      });
    }

    console.log("✅ Gasless transaction submitted!");
    console.log("Transaction hash:", txHash);

    return { success: true, txHash, address: connectedAddress };
  } catch (error) {
    console.error("❌ Wallet gasless payment failed:", error);
    throw error;
  }
}
