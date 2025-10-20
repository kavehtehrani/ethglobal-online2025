// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title GaslessPaymentAccount
 * @dev EIP-7702 compatible account implementation with simple fee system
 * Allows EOAs to delegate execution to this contract via EIP-7702
 * Implements free tier: first 5 transactions are free, then every 5th transaction is free
 */
contract GaslessPaymentAccount {
    // Fee configuration
    address public immutable FEE_RECEIVER;
    uint256 public constant FREE_TIER_LIMIT = 5; // introductory offer
    uint256 public constant FREE_TIER_RATIO = 5; // 1 in 5 free after limit
    uint256 public constant SERVICE_FEE_BASIS_POINTS = 50; // 50 bps
    uint256 public constant MIN_SERVICE_FEE = 0.01e6; // $0.01 in PYUSD (6 decimals)
    uint256 public constant MAX_SERVICE_FEE = 5e6; // $5.00 in PYUSD (6 decimals)

    // PYUSD token address (set during deployment)
    address public immutable PYUSD_TOKEN;

    // User tracking
    mapping(address => uint256) public userTransactionCounts;

    // Events
    event TransactionExecuted(
        address indexed user,
        address indexed target,
        uint256 value,
        bool isFree,
        uint256 serviceFee
    );

    event ServiceFeeCollected(address indexed user, uint256 amount);

    /**
     * @dev Constructor
     * @param _pyusdToken Address of the PYUSD token contract
     * @param _feeReceiver Address to receive service fees
     */
    constructor(address _pyusdToken, address _feeReceiver) {
        require(_pyusdToken != address(0), "Invalid PYUSD token address");
        require(_feeReceiver != address(0), "Invalid fee receiver address");

        PYUSD_TOKEN = _pyusdToken;
        FEE_RECEIVER = _feeReceiver;
    }

    /**
     * @dev Execute a call on behalf of the account with fee logic
     * @param target Target contract address
     * @param value ETH value to send
     * @param data Calldata to send
     */
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external payable {
        address user = msg.sender;

        // Update user transaction count
        userTransactionCounts[user]++;

        // Check if transaction should be free
        bool isFree = _isTransactionFree(user);

        // Calculate and collect service fee if not free
        uint256 serviceFee = 0;
        if (!isFree) {
            serviceFee = _calculateServiceFee(value);
            if (serviceFee > 0) {
                _collectServiceFee(user, serviceFee);
            }
        }

        // Execute the original call
        (bool success, ) = target.call{value: value}(data);
        require(success, "GaslessPaymentAccount: execution failed");

        emit TransactionExecuted(user, target, value, isFree, serviceFee);
    }

    /**
     * @dev Execute PYUSD transfer with fee logic
     * @param recipient Recipient address
     * @param amount Amount to transfer (in PYUSD, 6 decimals)
     */
    function executePYUSDTransfer(address recipient, uint256 amount) external {
        address user = msg.sender;

        // Update user transaction count
        userTransactionCounts[user]++;

        // Check if transaction should be free
        bool isFree = _isTransactionFree(user);

        // Calculate service fee if not free
        uint256 serviceFee = 0;
        uint256 totalAmount = amount;

        if (!isFree) {
            serviceFee = _calculateServiceFee(amount);
            totalAmount = amount + serviceFee;
        }

        // Transfer PYUSD from user to this contract
        _transferFromUser(user, totalAmount);

        // Transfer amount to recipient
        if (amount > 0) {
            _transferPYUSD(recipient, amount);
        }

        // Transfer service fee to fee receiver
        if (serviceFee > 0) {
            _transferPYUSD(FEE_RECEIVER, serviceFee);
            emit ServiceFeeCollected(user, serviceFee);
        }

        emit TransactionExecuted(user, recipient, amount, isFree, serviceFee);
    }

    /**
     * @dev Get user's tier status
     * @param user User address
     * @return freeTransactionsRemaining Number of free transactions remaining
     * @return nextFreeTransaction Number of transactions until next free one
     */
    function getTierStatus(
        address user
    )
        external
        view
        returns (
            uint256 freeTransactionsRemaining,
            uint256 nextFreeTransaction
        )
    {
        uint256 totalTransactions = userTransactionCounts[user];

        // Calculate free transactions remaining
        if (totalTransactions < FREE_TIER_LIMIT) {
            freeTransactionsRemaining = FREE_TIER_LIMIT - totalTransactions;
            nextFreeTransaction = 1;
        } else {
            freeTransactionsRemaining = 0;
            uint256 transactionsAfterLimit = totalTransactions - FREE_TIER_LIMIT;
            uint256 remainder = transactionsAfterLimit % FREE_TIER_RATIO;
            nextFreeTransaction = remainder == 0
                ? 1
                : FREE_TIER_RATIO - remainder;
        }
    }

    /**
     * @dev Check if a transaction should be free for a user
     * @param user User address
     * @return isFree True if transaction should be free
     */
    function _isTransactionFree(
        address user
    ) internal view returns (bool isFree) {
        uint256 totalTransactions = userTransactionCounts[user];

        // If under free tier limit, transaction is free
        if (totalTransactions < FREE_TIER_LIMIT) {
            return true;
        }

        // After limit, check if this is a "free" transaction (1 in 5)
        uint256 transactionsAfterLimit = totalTransactions - FREE_TIER_LIMIT;
        return transactionsAfterLimit % FREE_TIER_RATIO == 0;
    }

    /**
     * @dev Calculate service fee for a transaction
     * @param amount Transaction amount
     * @return fee Service fee amount
     */
    function _calculateServiceFee(
        uint256 amount
    ) internal pure returns (uint256 fee) {
        uint256 calculatedFee = (amount * SERVICE_FEE_BASIS_POINTS) / 10000;

        // Apply min/max limits
        if (calculatedFee < MIN_SERVICE_FEE) {
            return MIN_SERVICE_FEE;
        } else if (calculatedFee > MAX_SERVICE_FEE) {
            return MAX_SERVICE_FEE;
        } else {
            return calculatedFee;
        }
    }

    /**
     * @dev Collect service fee from user
     * @param user User address
     * @param feeAmount Fee amount to collect
     */
    function _collectServiceFee(address user, uint256 feeAmount) internal {
        // Transfer PYUSD from user to this contract for the fee
        _transferFromUser(user, feeAmount);
    }

    /**
     * @dev Transfer PYUSD from user to this contract
     * @param user User address
     * @param amount Amount to transfer
     */
    function _transferFromUser(address user, uint256 amount) internal {
        // Create transferFrom call data
        bytes memory transferData = abi.encodeWithSignature(
            "transferFrom(address,address,uint256)",
            user,
            address(this),
            amount
        );

        // Execute transferFrom call
        (bool success, ) = PYUSD_TOKEN.call(transferData);
        require(success, "SimpleAccount: PYUSD transfer failed");
    }

    /**
     * @dev Transfer PYUSD from this contract to recipient
     * @param recipient Recipient address
     * @param amount Amount to transfer
     */
    function _transferPYUSD(address recipient, uint256 amount) internal {
        // Create transfer call data
        bytes memory transferData = abi.encodeWithSignature(
            "transfer(address,uint256)",
            recipient,
            amount
        );

        // Execute transfer call
        (bool success, ) = PYUSD_TOKEN.call(transferData);
        require(success, "SimpleAccount: PYUSD transfer failed");
    }

    /**
     * @dev Receive ETH
     */
    receive() external payable {}
}
