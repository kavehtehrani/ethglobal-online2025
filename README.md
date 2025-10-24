# Gasless PYUSD Payments

Ever tried sending crypto and got hit with those annoying gas fees? We built something that actually solves this problem for PYUSD payments on Sepolia. No more "why is my $10 transfer costing $5 in gas" moments.

![app-screenshot](/public/images/screenshot-app.png)

## What This Actually Does

Think of this as Venmo, but for PYUSD, and it actually works without you paying gas fees. Users can send PYUSD to anyone without worrying about gas costs - we handle that part. The twist? We built a smart tier system that gives users free transactions to try it out, then switches to a "1 in X" free model to keep things sustainable.

The magic happens with EIP-7702 (making regular wallets act like smart accounts), Pimlico (sponsoring the gas), and Privy (making wallet creation dead simple). It's not just a demo - it's a working payment system that could actually be used.

![admin-dashboard-screenshot](/public/images/screenshot-admin-dashboard.png)


## Key Features

- **Zero Gas for Users**: Send PYUSD without paying gas fees (we sponsor them)
- **Smart Tier System**: Free transactions to start, then a sustainable model
- **Real Wallet Integration**: Works with any wallet through Privy's embedded system
- **Admin Controls**: Contract owners can adjust the tier system as needed
- **Payment Links**: Generate shareable links for payments (like PayPal links)
- **Live Contract Integration**: Everything runs on real Sepolia contracts

## The Technical Stack

- **Frontend**: Next.js 15 with TypeScript and Tailwind
- **Authentication**: Privy for embedded wallets (email or wallet login)
- **Blockchain**: Viem for clean Ethereum interactions
- **Account Abstraction**: EIP-7702 for smart account functionality
- **Gas Sponsorship**: Pimlico handles the gas fees
- **Smart Contracts**: Custom tier system with admin controls

## How the Tier System Works

We didn't just build a gasless payment app - we built a sustainable one. The smart contract tracks usage and implements a tier system:

1. **Free Tier**: First few transactions are completely free (let users try it)
2. **Paid Tier**: After that, every Xth transaction is free (e.g., 1 in 5)
3. **Service Fee**: Paid transactions include a small service fee to keep it running
4. **Real-time Updates**: Users see their tier status and next free transaction

This isn't just theoretical - it's deployed and working on Sepolia.

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

- Connect with email or wallet (no MetaMask required)
- Send PYUSD without paying gas fees
- See your tier status and remaining free transactions
- Generate payment links to share with others
- Test basic transactions to verify everything works

### For Admins

- Access `/admin` to manage the tier system
- Update free tier limits and ratios
- Monitor contract usage and configuration
- Adjust service fees as needed

## The Smart Contract

The `TransactionCounter.sol` contract is the brain of the operation:

- **Tracks Usage**: Every user's transaction count is stored on-chain
- **Tier Logic**: Implements the free/paid tier system
- **Admin Controls**: Contract owner can update parameters
- **EIP-7702 Ready**: Works seamlessly with account abstraction
- **Real Deployment**: Live on Sepolia at `0xE6A149825907757801936FCdA35Ab96A13c8cB04`

## Network Details

- **Chain**: Sepolia Testnet
- **PYUSD Contract**: [`0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9`](https://docs.paxos.com/guides/stablecoin/pyusd/testnet)
- **EIP-7702 Implementation**: [`0xe6Cae83BdE06E4c305530e199D7217f42808555B`](https://eth-sepolia.blockscout.com/address/0xe6Cae83BdE06E4c305530e199D7217f42808555B?tab=contract)
- **TransactionCounter**: [`0xE6A149825907757801936FCdA35Ab96A13c8cB04`](https://eth-sepolia.blockscout.com/address/0xE6A149825907757801936FCdA35Ab96A13c8cB04)

## Why This Matters

This isn't just another hackathon project. We built something that:

- Actually solves a real problem (gas fees for small payments)
- Uses PYUSD as intended (as a payment token)
- Has a sustainable business model
- Could be deployed and used by real users
- Demonstrates the power of EIP-7702 + account abstraction

The tier system ensures the service can run sustainably while giving users a great experience. It's the kind of infrastructure that could power real payment applications.
