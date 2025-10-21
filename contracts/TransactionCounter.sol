// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TransactionCounter
 * @dev Simple contract to track user transaction counts
 * All free tier logic is handled off-chain for efficiency
 */
contract TransactionCounter is Ownable {
    // User transaction counts
    mapping(address => uint256) public userTransactionCounts;

    // Free tier configuration (owner can change)
    uint256 public freeTierLimit = 5;
    uint256 public freeTierRatio = 5; // 1 in N transactions are free after limit

    // Events
    event TransactionCountIncremented(address indexed user, uint256 newCount);
    event FreeTierConfigUpdated(uint256 newLimit, uint256 newRatio);

    /**
     * @dev Constructor
     * @param initialOwner Owner of the contract
     */
    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @dev Increment transaction count for a user
     * @param user User address
     */
    function incrementCount(address user) external {
        userTransactionCounts[user]++;
        emit TransactionCountIncremented(user, userTransactionCounts[user]);
    }

    /**
     * @dev Get transaction count for a user
     * @param user User address
     * @return count Current transaction count
     */
    function getCount(address user) external view returns (uint256 count) {
        return userTransactionCounts[user];
    }

    /**
     * @dev Update free tier configuration (owner only)
     * @param _freeTierLimit New free tier limit
     * @param _freeTierRatio New free tier ratio
     */
    function updateFreeTierConfig(
        uint256 _freeTierLimit,
        uint256 _freeTierRatio
    ) external onlyOwner {
        require(_freeTierRatio > 0, "Free tier ratio must be > 0");
        freeTierLimit = _freeTierLimit;
        freeTierRatio = _freeTierRatio;
        emit FreeTierConfigUpdated(_freeTierLimit, _freeTierRatio);
    }

    /**
     * @dev Get current free tier configuration
     * @return limit Current free tier limit
     * @return ratio Current free tier ratio
     */
    function getFreeTierConfig()
        external
        view
        returns (uint256 limit, uint256 ratio)
    {
        return (freeTierLimit, freeTierRatio);
    }
}
