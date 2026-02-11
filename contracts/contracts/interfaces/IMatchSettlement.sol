// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMatchSettlement {
    function getOutcome(bytes32 matchId) external view returns (bool finalized, uint8 outcome);
}
