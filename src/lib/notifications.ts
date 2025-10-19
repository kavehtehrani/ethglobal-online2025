// Simple notification utility
export const notification = {
  success: (message: string, txHash?: string) => {
    console.log("✅ Success:", message);

    if (txHash) {
      const etherscanUrl = `https://sepolia.etherscan.io/tx/${txHash}`;
      const messageWithLink = `${message}\n\n🔗 View on Etherscan: ${etherscanUrl}`;
      alert(`✅ ${messageWithLink}`);

      // Also log the clickable link for easy copying
      console.log("🔗 Etherscan Link:", etherscanUrl);
    } else {
      alert(`✅ ${message}`);
    }
  },
  error: (message: string) => {
    console.error("❌ Error:", message);
    // You can replace this with toast notifications later
    alert(`❌ ${message}`);
  },
  info: (message: string) => {
    console.log("ℹ️ Info:", message);
    // You can replace this with toast notifications later
    alert(`ℹ️ ${message}`);
  },
};
