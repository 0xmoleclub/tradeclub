// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {UD60x18, ud} from "@prb/math/src/UD60x18.sol";

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
    error InvalidBScore();
    error InvalidOutcome();
    error InsufficientLiquidity();
    error NotFinalized();
    error Slippage();

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

    uint256 private constant WAD_TO_USDC = 1e12;

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
        if (config.bScore == 0) revert InvalidBScore();

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

    function price(uint8 outcome) external view returns (uint256 priceWad) {
        if (outcome >= outcomesCount) revert InvalidOutcome();
        UD60x18 b = ud(bScore);
        UD60x18 sumExp = ud(0);
        UD60x18 outcomeExp = ud(0);

        for (uint8 i = 0; i < outcomesCount; i++) {
            UD60x18 expTerm = ud(totalShares[i]).div(b).exp();
            sumExp = sumExp.add(expTerm);
            if (i == outcome) {
                outcomeExp = expTerm;
            }
        }

        if (sumExp.unwrap() == 0) return 0;
        priceWad = outcomeExp.div(sumExp).unwrap();
    }

    function quoteBuy(
        uint8 outcome,
        uint256 amountShares
    ) public view returns (uint256 costUsdc, uint256 feeUsdc) {
        if (outcome >= outcomesCount) revert InvalidOutcome();
        if (amountShares == 0) return (0, 0);

        uint256 costWad = _tradeCostWad(outcome, amountShares, true);
        costUsdc = _toUsdcUp(costWad);
        feeUsdc = (costUsdc * feeBps) / 10_000;
    }

    function quoteSell(
        uint8 outcome,
        uint256 amountShares
    ) public view returns (uint256 proceedsUsdc, uint256 feeUsdc) {
        if (outcome >= outcomesCount) revert InvalidOutcome();
        if (amountShares == 0) return (0, 0);
        if (amountShares > totalShares[outcome]) revert InsufficientLiquidity();

        uint256 proceedsWad = _tradeCostWad(outcome, amountShares, false);
        proceedsUsdc = _toUsdcDown(proceedsWad);
        feeUsdc = (proceedsUsdc * feeBps) / 10_000;
    }

    function buy(
        uint8 outcome,
        uint256 amountShares,
        uint256 maxCost
    ) external nonReentrant {
        if (outcome >= outcomesCount) revert InvalidOutcome();
        if (amountShares == 0) return;

        (uint256 costUsdc, uint256 feeUsdc) = quoteBuy(outcome, amountShares);
        if (costUsdc + feeUsdc > maxCost) revert Slippage();

        usdc.safeTransferFrom(msg.sender, address(this), costUsdc + feeUsdc);
        if (feeUsdc > 0) {
            usdc.safeTransfer(feeCollector, feeUsdc);
        }

        shares[msg.sender][outcome] += amountShares;
        totalShares[outcome] += amountShares;

        emit Trade(msg.sender, outcome, amountShares, costUsdc, feeUsdc);
    }

    function sell(
        uint8 outcome,
        uint256 amountShares,
        uint256 minProceeds
    ) external nonReentrant {
        if (outcome >= outcomesCount) revert InvalidOutcome();
        if (amountShares == 0) return;

        uint256 userShares = shares[msg.sender][outcome];
        if (userShares < amountShares) revert Slippage();
        if (amountShares > totalShares[outcome]) revert InsufficientLiquidity();

        (uint256 proceedsUsdc, uint256 feeUsdc) = quoteSell(
            outcome,
            amountShares
        );
        uint256 netProceeds = proceedsUsdc - feeUsdc;
        if (netProceeds < minProceeds) revert Slippage();

        shares[msg.sender][outcome] = userShares - amountShares;
        totalShares[outcome] -= amountShares;

        if (feeUsdc > 0) {
            usdc.safeTransfer(feeCollector, feeUsdc);
        }
        if (netProceeds > 0) {
            usdc.safeTransfer(msg.sender, netProceeds);
        }

        emit Trade(msg.sender, outcome, amountShares, proceedsUsdc, feeUsdc);
    }

    function redeem(uint8 outcome) external nonReentrant {
        if (outcome >= outcomesCount) revert InvalidOutcome();
        (bool finalized, uint8 winningOutcome) = getOutcome();
        if (!finalized) revert NotFinalized();

        uint256 userShares = shares[msg.sender][outcome];
        if (userShares == 0) return;

        shares[msg.sender][outcome] = 0;

        uint256 payout = outcome == winningOutcome
            ? _toUsdcDown(userShares)
            : 0;
        if (payout > 0) {
            usdc.safeTransfer(msg.sender, payout);
        }

        emit Redeemed(msg.sender, outcome, userShares, payout);
    }

    function _tradeCostWad(
        uint8 outcome,
        uint256 amountShares,
        bool isBuy
    ) internal view returns (uint256 costWad) {
        UD60x18 b = ud(bScore);
        UD60x18 sumBefore = ud(0);
        UD60x18 sumAfter = ud(0);

        for (uint8 i = 0; i < outcomesCount; i++) {
            uint256 qi = totalShares[i];
            uint256 qiAfter = qi;
            if (i == outcome) {
                qiAfter = isBuy ? qi + amountShares : qi - amountShares;
            }

            sumBefore = sumBefore.add(ud(qi).div(b).exp());
            sumAfter = sumAfter.add(ud(qiAfter).div(b).exp());
        }

        uint256 costBefore = b.mul(sumBefore.ln()).unwrap();
        uint256 costAfter = b.mul(sumAfter.ln()).unwrap();

        costWad = isBuy ? costAfter - costBefore : costBefore - costAfter;
    }

    function _toUsdcDown(uint256 wadAmount) internal pure returns (uint256) {
        return wadAmount / WAD_TO_USDC;
    }

    function _toUsdcUp(uint256 wadAmount) internal pure returns (uint256) {
        if (wadAmount == 0) return 0;
        return (wadAmount + WAD_TO_USDC - 1) / WAD_TO_USDC;
    }
}
