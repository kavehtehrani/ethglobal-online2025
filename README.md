<div align="center">
  <img src="/public/images/pyusd.png" alt="PyPay Logo" width="120" height="120">
  <br>
  <em>Send PYUSD without gas fees</em>
</div>

## PyPay - Gasless PYUSD Payments

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0-38B2AC?style=for-the-badge&logo=tailwind-css)
![Ethereum](https://img.shields.io/badge/Ethereum-3C3C3D?style=for-the-badge&logo=ethereum)
![EIP-7702](https://img.shields.io/badge/EIP--7702-Account_Abstraction-627EEA?style=for-the-badge)
![Privy](https://img.shields.io/badge/Privy-Wallet_Authentication-6366F1?style=for-the-badge)
![Pimlico](https://img.shields.io/badge/Pimlico-Gas_Sponsorship-FF6B6B?style=for-the-badge)
![Viem](https://img.shields.io/badge/Viem-Ethereum_Client-FF6B35?style=for-the-badge)
![PYUSD](https://img.shields.io/badge/PYUSD-Stablecoin-00D4AA?style=for-the-badge)

🛈 This is a submission for [ETHOnline 2025](https://ethglobal.com/events/ethonline2025/info/details) hackathon.

# Problem

One of the most confusing steps for a new user to crypto is the concept of "gas". In everyday life if you're using your credit card the fee to use the credit card is the same currency as you are paying in. That experience on chain breaks down into a token (usually stablecoin) and then another asset to pay to move the token in possession. It is confusing to want to send/receive some stablecoins and then realize you have to go through a bunch of hoops to obtain the necessary gas in the form of eth.

![app-screenshot](/public/images/screenshot-app.png)

# Solution

Think of this as Venmo, but for PYUSD, and it actually works without you paying gas fees. Users can send PYUSD to anyone without worrying about gas costs - we handle that part through our sponsorship. We built a smart tier system that gives users free transactions to try it out, then switches to a "1 in X" free model to keep users interested in using our app.

Note that even when we do take a fee, this fee is still in PYUSD and the user never has to worry about anything other than their use of the PYYSD stablecoin.

The app can also generate QR codes / links to request payments that are on-chain but are seamless.

## EIP-7702

That is the core of "gasless" payments that went live earlier via Pectra's upgrade that made gasless translations possible via [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702) Using this app, the users can send and request everyday payments in PYUSD without worrying about the scary part: gas fees.

The magic happens with EIP-7702 (making regular wallets act like smart accounts), Pimlico (sponsoring the gas), and Privy (making wallet creation user-friendly).

There is a [`TransactionCounter`](https://eth-sepolia.blockscout.com/address/0xE6A149825907757801936FCdA35Ab96A13c8cB04?tab=contract) contract deployed that keeps track of user's total number of transfers and enables the owner to set parameters for gas sponsorship, i.e. initial number of free transactions and the frequency of free transfers afterward.

![admin-dashboard-screenshot](/public/images/screenshot-admin-dashboard.png)

## Tech Stack

- **Frontend**: Next.js 15 with TypeScript and Tailwind
- **Authentication**: Privy for embedded wallets (email or wallet login)
- **Blockchain**: Viem for clean Ethereum interactions
- **Account Abstraction**: EIP-7702 for smart account functionality
- **Gas Sponsorship**: Pimlico handles the gas fees
- **Smart Contracts**: Custom tier system with admin controls

# Local Deployment

## Quick Start

1. **Clone and install**:

   ```bash
   git clone <repo>
   cd gasless-payments-clean
   npm install
   ```

2. **Set up environment**:
   Create `.env.local` with your keys:

   ```env
   # Privy Configuration
   NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
   PRIVY_SECRET=your_privy_secret

   # Pimlico Configuration
   NEXT_PUBLIC_PIMLICO_API_KEY=your_pimlico_api_key_here
   NEXT_PUBLIC_SPONSORSHIP_POLICY_ID=your_sponsorship_policy_id_here
   ```

3. **Run it**:
   ```bash
   npm run dev
   ```

## What You Can Do

### For Users

- Connect with email or wallet
- Send PYUSD without paying gas fees
- See your tier status and remaining free transactions
- Generate payment links to share with others
- Test basic transactions to verify everything works

### For Admins

- Access `/admin` to manage the tier system
- Update free tier limits and ratios
- Monitor contract usage and configuration
- Adjust service fees as needed

## Onchain Details

- **Chain**: Sepolia Testnet
- **PYUSD Contract**: [`0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9`](https://docs.paxos.com/guides/stablecoin/pyusd/testnet)
- **EIP-7702 Implementation**: [`0xe6Cae83BdE06E4c305530e199D7217f42808555B`](https://eth-sepolia.blockscout.com/address/0xe6Cae83BdE06E4c305530e199D7217f42808555B?tab=contract)
- **TransactionCounter**: [`0xE6A149825907757801936FCdA35Ab96A13c8cB04`](https://eth-sepolia.blockscout.com/address/0xE6A149825907757801936FCdA35Ab96A13c8cB04?tab=contract)
