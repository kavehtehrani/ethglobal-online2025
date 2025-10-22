# Gasless PYUSD Payments

A clean Next.js application for sending PYUSD on Sepolia without paying gas fees using EIP-7702 + Pimlico + Privy with smart contract-based tiered fee system.

## Features

- ✅ **Privy Authentication**: Secure embedded wallet with email/wallet login
- ✅ **EIP-7702 Support**: Make your EOA act as a smart account
- ✅ **Gasless Transactions**: Pimlico sponsors gas fees
- ✅ **Smart Contract Tier System**: TransactionCounter.sol tracks usage and determines free/paid transactions
- ✅ **Modular UI Components**: Refactored into reusable, maintainable components
- ✅ **Admin Panel**: Contract administration with tier configuration management
- ✅ **Tier Status Display**: Real-time free/paid transaction indicators with debugging
- ✅ **Payment Link Generation**: Shareable payment links with pre-filled amounts

## Setup

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Create environment file**:
   Create `.env.local` with:

   ```env
   # Privy Configuration
   NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
   PRIVY_SECRET=your_privy_secret

   # Pimlico Configuration
   NEXT_PUBLIC_PIMLICO_API_KEY=your_pimlico_api_key_here
   NEXT_PUBLIC_SPONSORSHIP_POLICY_ID=your_sponsorship_policy_id_here

   # Optional: Custom EIP-7702 Implementation
   # NEXT_PUBLIC_7702_IMPLEMENTATION=0xYourImplementationAddress
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

## Usage

### User Interface

1. **Login with Privy**: Use email or wallet to authenticate
2. **View Tier Status**: See your current free/paid transaction status with real-time debugging
3. **Test Basic Transactions**: Verify Privy wallet works with regular ETH/PYUSD transfers
4. **Send Gasless Payments**: Use EIP-7702 + Pimlico for gasless PYUSD transfers with smart contract fee logic
5. **Generate Payment Links**: Create shareable links with pre-filled recipient and amount
6. **Monitor Balances**: View ETH and PYUSD balances with refresh functionality

### Admin Panel

1. **Access Admin Panel**: Navigate to `/admin` (contract owner only)
2. **View Contract Status**: Check contract configuration and owner information
3. **Update Tier Settings**: Modify free tier limit and ratio (e.g., 5 free, then 1 in 3 free)
4. **Monitor Usage**: View current tier configuration and transaction counts

## Architecture

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Authentication**: Privy with embedded wallets
- **Blockchain**: Viem for Ethereum interactions
- **Account Abstraction**: Permissionless for EIP-7702
- **Gas Sponsorship**: Pimlico for gasless transactions
- **Smart Contract**: TransactionCounter.sol for tiered fee logic
- **Tier System**: 5 free transactions, then 1 in 5 free with service fees

## Testing

The app includes comprehensive testing capabilities:

1. **Smart Contract Tests**: 20+ test cases covering all tier logic scenarios
2. **Wallet Connectivity**: Basic ETH/PYUSD transfer testing
3. **Gasless Payments**: EIP-7702 + Pimlico integration verification
4. **Tier System**: Real-time free/paid transaction calculations with debugging
5. **Admin Functions**: Contract configuration and tier management testing
6. **Payment Links**: URL parameter handling and sharing functionality

## Network

- **Chain**: Sepolia Testnet
- **PYUSD Contract**: [`0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9`](https://docs.paxos.com/guides/stablecoin/pyusd/testnet)
- **EIP-7702 Implementation**: [`0xe6Cae83BdE06E4c305530e199D7217f42808555B`](https://eth-sepolia.blockscout.com/address/0xe6Cae83BdE06E4c305530e199D7217f42808555B?tab=contract)
- **TransactionCounter Contract**: Deployed smart contract for tier tracking at [`https://eth-sepolia.blockscout.com/address/0xE6A149825907757801936FCdA35Ab96A13c8cB04`](https://eth-sepolia.blockscout.com/address/0xE6A149825907757801936FCdA35Ab96A13c8cB04)

## Smart Contract Integration

The `TransactionCounter.sol` contract implements a tiered fee system:

- **Free Tier**: First m transactions are free to let users try the app
- **Paid Tier**: After n transactions, every 5th transaction is free (e.g. 1 in 5)
- **Service Fees**: Paid transactions include 0.5% service fee
- **Real-time Tracking**: Contract tracks user transaction counts
- **EIP-7702 Integration**: Works seamlessly with EIP-7702 transactions
- **Admin Controls**: Contract owner can update tier configuration for the fee parameters
