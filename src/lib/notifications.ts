// Simple notification utility - now just for console logging
export const notification = {
  success: (message: string, txHash?: string) => {

    if (txHash) {
      const etherscanUrl = `https://sepolia.etherscan.io/tx/${txHash}`;
    }
  },
  error: (message: string) => {
    console.error("❌ Error:", message);
  },
  info: (message: string) => {
  },
};
