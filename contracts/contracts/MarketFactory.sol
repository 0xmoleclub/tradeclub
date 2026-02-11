// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {PredictionMarket} from "./PredictionMarket.sol";

contract MarketFactory is Ownable {
    address public implementation;
    address public usdc;
    address public matchSettlement;
    address public feeCollector;

    event ImplementationUpdated(address indexed implementation);
    event FeeCollectorUpdated(address indexed feeCollector);
    event MarketCreated(
        bytes32 indexed matchId,
        address indexed market,
        uint8 outcomesCount,
        uint256 b,
        uint16 feeBps
    );

    constructor(
        address initialOwner,
        address initialImplementation,
        address initialUsdc,
        address initialMatchSettlement,
        address initialFeeCollector
    ) Ownable(initialOwner) {
        implementation = initialImplementation;
        usdc = initialUsdc;
        matchSettlement = initialMatchSettlement;
        feeCollector = initialFeeCollector;
    }

    function setImplementation(address newImplementation) external onlyOwner {
        implementation = newImplementation;
        emit ImplementationUpdated(newImplementation);
    }

    function setFeeCollector(address newFeeCollector) external onlyOwner {
        feeCollector = newFeeCollector;
        emit FeeCollectorUpdated(newFeeCollector);
    }

    function createMarket(
        bytes32 matchId,
        uint8 outcomesCount,
        uint256 bScore,
        uint16 feeBps
    ) external onlyOwner returns (address) {
        address clone = Clones.clone(implementation);

        PredictionMarket.MarketConfig memory config = PredictionMarket
            .MarketConfig({
                matchId: matchId,
                usdc: usdc,
                matchSettlement: matchSettlement,
                feeCollector: feeCollector,
                feeBps: feeBps,
                bScore: bScore,
                outcomesCount: outcomesCount
            });

        PredictionMarket(clone).initialize(config);

        emit MarketCreated(matchId, clone, outcomesCount, bScore, feeBps);
        return clone;
    }
}
