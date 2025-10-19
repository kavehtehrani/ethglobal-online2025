// Simple notification utility - now just for console logging
export const notification = {
  success: (message: string, txHash?: string) => {
    console.log("✅ Success:", message);

    if (txHash) {
      const etherscanUrl = `https://sepolia.etherscan.io/tx/${txHash}`;
      console.log("🔗 Etherscan Link:", etherscanUrl);
    }
  },
  error: (message: string) => {
    console.error("❌ Error:", message);
  },
  info: (message: string) => {
    console.log("ℹ️ Info:", message);
  },
};
