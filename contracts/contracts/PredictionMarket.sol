// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IMatchSettlement} from "./interfaces/IMatchSettlement.sol";

contract PredictionMarket is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct MarketConfig {
        bytes32 matchId;
        address usdc;
        address matchSettlement;
        address feeCollector;
        uint16 feeBps;
        uint256 bScore;
        uint8 outcomesCount;
    }

    error AlreadyInitialized();
    error InvalidOutcome();
    error NotFinalized();
    error NotImplemented();

    bool public initialized;
    bytes32 public matchId;
    IERC20 public usdc;
    IMatchSettlement public matchSettlement;
    address public feeCollector;
    uint16 public feeBps;
    uint256 public bScore;
    uint8 public outcomesCount;

    mapping(address => mapping(uint8 => uint256)) public shares;
    mapping(uint8 => uint256) public totalShares;

    event Initialized(
        bytes32 matchId,
        address usdc,
        address matchSettlement,
        address feeCollector,
        uint16 feeBps,
        uint256 bScore,
        uint8 outcomesCount
    );
    event Trade(
        address indexed trader,
        uint8 indexed outcome,
        uint256 sharesDelta,
        uint256 cost,
        uint256 fee
    );
    event Redeemed(
        address indexed trader,
        uint8 indexed outcome,
        uint256 shares,
        uint256 payout
    );

    function initialize(MarketConfig calldata config) external {
        if (initialized) revert AlreadyInitialized();
        if (config.outcomesCount < 2) revert InvalidOutcome();

        initialized = true;
        matchId = config.matchId;
        usdc = IERC20(config.usdc);
        matchSettlement = IMatchSettlement(config.matchSettlement);
        feeCollector = config.feeCollector;
        feeBps = config.feeBps;
        bScore = config.bScore;
        outcomesCount = config.outcomesCount;

        emit Initialized(
            config.matchId,
            config.usdc,
            config.matchSettlement,
            config.feeCollector,
            config.feeBps,
            config.bScore,
            config.outcomesCount
        );
    }

    function getOutcome() public view returns (bool finalized, uint8 outcome) {
        return matchSettlement.getOutcome(matchId);
    }

    function buy(
        uint8 outcome,
        uint256 amountShares,
        uint256 maxCost
    ) external nonReentrant {
        if (outcome >= outcomesCount) revert InvalidOutcome();
        if (amountShares == 0) return;

        // TODO: LMSR pricing implementation. For now revert to avoid incorrect accounting.
        // uint256 cost = quoteBuy(outcome, amountShares);
        // uint256 fee = (cost * feeBps) / 10_000;
        // require(cost + fee <= maxCost, "slippage");
        // usdc.safeTransferFrom(msg.sender, address(this), cost + fee);
        // if (fee > 0) usdc.safeTransfer(feeCollector, fee);
        // shares[msg.sender][outcome] += amountShares;
        // totalShares[outcome] += amountShares;
        // emit Trade(msg.sender, outcome, int256(amountShares), cost, fee);
        //
        // NOTE: price curve and q_i updates are pending.

        revert NotImplemented();
    }

    function sell(
        uint8 outcome,
        uint256 amountShares,
        uint256 minProceeds
    ) external nonReentrant {
        if (outcome >= outcomesCount) revert InvalidOutcome();
        if (amountShares == 0) return;

        // TODO: LMSR pricing implementation.
        revert NotImplemented();
    }

    function redeem(uint8 outcome) external nonReentrant {
        if (outcome >= outcomesCount) revert InvalidOutcome();
        (bool finalized, uint8 winningOutcome) = getOutcome();
        if (!finalized) revert NotFinalized();

        uint256 userShares = shares[msg.sender][outcome];
        if (userShares == 0) return;

        shares[msg.sender][outcome] = 0;

        uint256 payout = outcome == winningOutcome ? userShares : 0;
        if (payout > 0) {
            usdc.safeTransfer(msg.sender, payout);
        }

        emit Redeemed(msg.sender, outcome, userShares, payout);
    }
}
