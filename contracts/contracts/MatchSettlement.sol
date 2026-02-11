// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MatchSettlement {
    using SafeERC20 for IERC20;

    struct Proposal {
        uint8 outcome;
        address proposer;
        address disputer;
        uint256 proposedAt;
        bool disputed;
    }

    IERC20 public immutable bondToken;
    uint256 public immutable disputeWindow;
    uint256 public immutable bondAmount;

    mapping(bytes32 => Proposal) public proposals;
    mapping(bytes32 => bool) public finalized;
    mapping(bytes32 => uint8) public finalOutcome;

    event OutcomeProposed(bytes32 indexed matchId, uint8 outcome, address indexed proposer, uint256 proposedAt);
    event OutcomeDisputed(bytes32 indexed matchId, address indexed disputer);
    event OutcomeFinalized(bytes32 indexed matchId, uint8 outcome);
    event DisputeCleared(bytes32 indexed matchId);

    constructor(address bondToken_, uint256 disputeWindow_, uint256 bondAmount_) {
        bondToken = IERC20(bondToken_);
        disputeWindow = disputeWindow_;
        bondAmount = bondAmount_;
    }

    function proposeOutcome(bytes32 matchId, uint8 outcome) external {
        Proposal storage existing = proposals[matchId];
        require(existing.proposedAt == 0 || existing.disputed, "active proposal");

        bondToken.safeTransferFrom(msg.sender, address(this), bondAmount);
        proposals[matchId] = Proposal({
            outcome: outcome,
            proposer: msg.sender,
            disputer: address(0),
            proposedAt: block.timestamp,
            disputed: false
        });

        emit OutcomeProposed(matchId, outcome, msg.sender, block.timestamp);
    }

    function disputeOutcome(bytes32 matchId) external {
        Proposal storage proposal = proposals[matchId];
        require(proposal.proposedAt != 0, "no proposal");
        require(!proposal.disputed, "already disputed");
        require(block.timestamp <= proposal.proposedAt + disputeWindow, "window passed");

        bondToken.safeTransferFrom(msg.sender, address(this), bondAmount);
        proposal.disputed = true;
        proposal.disputer = msg.sender;

        emit OutcomeDisputed(matchId, msg.sender);
    }

    function finalizeOutcome(bytes32 matchId) external {
        Proposal storage proposal = proposals[matchId];
        require(proposal.proposedAt != 0, "no proposal");
        require(!proposal.disputed, "disputed");
        require(block.timestamp > proposal.proposedAt + disputeWindow, "window open");
        require(!finalized[matchId], "finalized");

        finalized[matchId] = true;
        finalOutcome[matchId] = proposal.outcome;

        bondToken.safeTransfer(proposal.proposer, bondAmount);

        emit OutcomeFinalized(matchId, proposal.outcome);
    }

    function clearDispute(bytes32 matchId) external {
        Proposal storage proposal = proposals[matchId];
        require(proposal.disputed, "not disputed");
        require(block.timestamp > proposal.proposedAt + disputeWindow, "window open");

        // Refund both bonds (proposer + disputer). This resets the proposal state.
        bondToken.safeTransfer(proposal.proposer, bondAmount);
        bondToken.safeTransfer(proposal.disputer, bondAmount);

        delete proposals[matchId];

        emit DisputeCleared(matchId);
    }

    function getOutcome(bytes32 matchId) external view returns (bool isFinalized, uint8 outcome) {
        return (finalized[matchId], finalOutcome[matchId]);
    }
}
