// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GaslessPaymentAccount
 * @dev EIP-7702 compatible account implementation with owner-controlled fee system
 * Allows EOAs to delegate execution to this contract via EIP-7702
 * Implements configurable free tier and service fees controlled by owner
 */
contract GaslessPaymentAccount is Ownable {
    // Fee configuration (owner-controlled)
    address public feeReceiver;
    uint256 public freeTierLimit = 5; // introductory offer
    uint256 public freeTierRatio = 5; // 1 in 5 free after limit
    uint256 public serviceFeeBasisPoints = 50; // 50 bps (0.5%)
    uint256 public minServiceFee = 0.01e6; // $0.01 in PYUSD (6 decimals)
    uint256 public maxServiceFee = 5e6; // $5.00 in PYUSD (6 decimals)

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
     * @param _owner Initial owner of the contract
     */
    constructor(
        address _pyusdToken,
        address _feeReceiver,
        address _owner
    ) Ownable(_owner) {
        require(_pyusdToken != address(0), "Invalid PYUSD token address");
        require(_feeReceiver != address(0), "Invalid fee receiver address");
        require(_owner != address(0), "Invalid owner address");

        PYUSD_TOKEN = _pyusdToken;
        feeReceiver = _feeReceiver;
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
            _transferPYUSD(feeReceiver, serviceFee);
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
        returns (uint256 freeTransactionsRemaining, uint256 nextFreeTransaction)
    {
        uint256 totalTransactions = userTransactionCounts[user];

        // Calculate free transactions remaining
        if (totalTransactions < freeTierLimit) {
            freeTransactionsRemaining = freeTierLimit - totalTransactions;
            nextFreeTransaction = 1;
        } else {
            freeTransactionsRemaining = 0;
            uint256 transactionsAfterLimit = totalTransactions - freeTierLimit;
            uint256 remainder = transactionsAfterLimit % freeTierRatio;
            nextFreeTransaction = remainder == 0
                ? 1
                : freeTierRatio - remainder;
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
        if (totalTransactions < freeTierLimit) {
            return true;
        }

        // After limit, check if this is a "free" transaction (1 in N)
        uint256 transactionsAfterLimit = totalTransactions - freeTierLimit;
        return transactionsAfterLimit % freeTierRatio == 0;
    }

    /**
     * @dev Calculate service fee for a transaction
     * @param amount Transaction amount
     * @return fee Service fee amount
     */
    function _calculateServiceFee(
        uint256 amount
    ) internal view returns (uint256 fee) {
        uint256 calculatedFee = (amount * serviceFeeBasisPoints) / 10000;

        // Apply min/max limits
        if (calculatedFee < minServiceFee) {
            return minServiceFee;
        } else if (calculatedFee > maxServiceFee) {
            return maxServiceFee;
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

    // Owner-only setter functions for fee configuration

    /**
     * @dev Set the fee receiver address
     * @param newFeeReceiver New fee receiver address
     */
    function setFeeReceiver(address newFeeReceiver) external onlyOwner {
        require(newFeeReceiver != address(0), "Invalid fee receiver address");
        feeReceiver = newFeeReceiver;
    }

    /**
     * @dev Set the free tier limit (initial free transactions)
     * @param newLimit New free tier limit
     */
    function setFreeTierLimit(uint256 newLimit) external onlyOwner {
        freeTierLimit = newLimit;
    }

    /**
     * @dev Set the free tier ratio (every Nth transaction is free)
     * @param newRatio New free tier ratio
     */
    function setFreeTierRatio(uint256 newRatio) external onlyOwner {
        require(newRatio > 0, "Free tier ratio must be greater than 0");
        freeTierRatio = newRatio;
    }

    /**
     * @dev Set the service fee basis points
     * @param newBasisPoints New service fee basis points (e.g., 50 = 0.5%)
     */
    function setServiceFeeBasisPoints(
        uint256 newBasisPoints
    ) external onlyOwner {
        require(
            newBasisPoints <= 10000,
            "Basis points cannot exceed 10000 (100%)"
        );
        serviceFeeBasisPoints = newBasisPoints;
    }

    /**
     * @dev Set the minimum service fee
     * @param newMinFee New minimum service fee in PYUSD (6 decimals)
     */
    function setMinServiceFee(uint256 newMinFee) external onlyOwner {
        require(newMinFee <= maxServiceFee, "Min fee cannot exceed max fee");
        minServiceFee = newMinFee;
    }

    /**
     * @dev Set the maximum service fee
     * @param newMaxFee New maximum service fee in PYUSD (6 decimals)
     */
    function setMaxServiceFee(uint256 newMaxFee) external onlyOwner {
        require(
            newMaxFee >= minServiceFee,
            "Max fee cannot be less than min fee"
        );
        maxServiceFee = newMaxFee;
    }

    /**
     * @dev Receive ETH
     */
    receive() external payable {}
}
