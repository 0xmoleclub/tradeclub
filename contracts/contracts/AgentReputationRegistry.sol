// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {AgentIdentityRegistry} from './AgentIdentityRegistry.sol';

contract AgentReputationRegistry is Ownable {
    AgentIdentityRegistry public identityRegistry;

    struct Feedback {
        int128 value;
        uint8 valueDecimals;
        string tag1;
        string tag2;
        bool isRevoked;
    }

    mapping(uint256 => mapping(address => mapping(uint64 => Feedback))) public feedback;
    mapping(uint256 => mapping(address => uint64)) public lastIndex;
    mapping(uint256 => address[]) public clients;

    event NewFeedback(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 feedbackIndex,
        int128 value,
        uint8 valueDecimals,
        string indexed indexedTag1,
        string tag1,
        string tag2,
        string endpoint,
        string feedbackURI,
        bytes32 feedbackHash
    );

    event FeedbackRevoked(uint256 indexed agentId, address indexed clientAddress, uint64 indexed feedbackIndex);

    error InvalidAgent();
    error InvalidDecimals();
    error OwnerCannotReview();

    constructor(address initialOwner) Ownable(initialOwner) {}

    function initialize(address identityRegistry_) external onlyOwner {
        identityRegistry = AgentIdentityRegistry(identityRegistry_);
    }

    function getIdentityRegistry() external view returns (address) {
        return address(identityRegistry);
    }

    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata endpoint,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external {
        if (address(identityRegistry) == address(0)) revert InvalidAgent();
        if (identityRegistry.ownerOf(agentId) == address(0)) revert InvalidAgent();
        if (valueDecimals > 18) revert InvalidDecimals();
        if (msg.sender == identityRegistry.ownerOf(agentId)) revert OwnerCannotReview();

        uint64 idx = ++lastIndex[agentId][msg.sender];
        feedback[agentId][msg.sender][idx] = Feedback(value, valueDecimals, tag1, tag2, false);

        if (clients[agentId].length == 0 || clients[agentId][clients[agentId].length - 1] != msg.sender) {
            clients[agentId].push(msg.sender);
        }

        emit NewFeedback(agentId, msg.sender, idx, value, valueDecimals, tag1, tag1, tag2, endpoint, feedbackURI, feedbackHash);
    }

    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external {
        Feedback storage f = feedback[agentId][msg.sender][feedbackIndex];
        require(f.valueDecimals <= 18, "Feedback does not exist");
        f.isRevoked = true;
        emit FeedbackRevoked(agentId, msg.sender, feedbackIndex);
    }

    function getSummary(uint256 agentId, address[] calldata clientAddresses, string calldata tag1, string calldata tag2)
        external
        view
        returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)
    {
        require(clientAddresses.length > 0, "Empty clients");
        summaryValueDecimals = 0;
        for (uint256 i = 0; i < clientAddresses.length; i++) {
            address c = clientAddresses[i];
            uint64 maxIdx = lastIndex[agentId][c];
            for (uint64 j = 1; j <= maxIdx; j++) {
                Feedback storage f = feedback[agentId][c][j];
                if (f.isRevoked) continue;
                if (bytes(tag1).length > 0 && keccak256(bytes(f.tag1)) != keccak256(bytes(tag1))) continue;
                if (bytes(tag2).length > 0 && keccak256(bytes(f.tag2)) != keccak256(bytes(tag2))) continue;
                count++;
                summaryValue += f.value;
            }
        }
    }

    function readFeedback(uint256 agentId, address clientAddress, uint64 feedbackIndex)
        external
        view
        returns (int128 value, uint8 valueDecimals, string memory tag1, string memory tag2, bool isRevoked)
    {
        Feedback storage f = feedback[agentId][clientAddress][feedbackIndex];
        return (f.value, f.valueDecimals, f.tag1, f.tag2, f.isRevoked);
    }

    function readAllFeedback(
        uint256 agentId,
        address[] calldata clientAddresses,
        string calldata tag1,
        string calldata tag2,
        bool includeRevoked
    )
        external
        view
        returns (
            address[] memory outClients,
            uint64[] memory feedbackIndexes,
            int128[] memory values,
            uint8[] memory valueDecimalsArr,
            string[] memory tag1s,
            string[] memory tag2s,
            bool[] memory revokedStatuses
        )
    {
        address[] memory cs = clientAddresses.length > 0 ? clientAddresses : clients[agentId];
        uint256 total = 0;
        for (uint256 i = 0; i < cs.length; i++) {
            uint64 maxIdx = lastIndex[agentId][cs[i]];
            for (uint64 j = 1; j <= maxIdx; j++) {
                Feedback storage f = feedback[agentId][cs[i]][j];
                if (!includeRevoked && f.isRevoked) continue;
                if (bytes(tag1).length > 0 && keccak256(bytes(f.tag1)) != keccak256(bytes(tag1))) continue;
                if (bytes(tag2).length > 0 && keccak256(bytes(f.tag2)) != keccak256(bytes(tag2))) continue;
                total++;
            }
        }

        outClients = new address[](total);
        feedbackIndexes = new uint64[](total);
        values = new int128[](total);
        valueDecimalsArr = new uint8[](total);
        tag1s = new string[](total);
        tag2s = new string[](total);
        revokedStatuses = new bool[](total);

        uint256 idx = 0;
        for (uint256 i = 0; i < cs.length; i++) {
            uint64 maxIdx = lastIndex[agentId][cs[i]];
            for (uint64 j = 1; j <= maxIdx; j++) {
                Feedback storage f = feedback[agentId][cs[i]][j];
                if (!includeRevoked && f.isRevoked) continue;
                if (bytes(tag1).length > 0 && keccak256(bytes(f.tag1)) != keccak256(bytes(tag1))) continue;
                if (bytes(tag2).length > 0 && keccak256(bytes(f.tag2)) != keccak256(bytes(tag2))) continue;
                outClients[idx] = cs[i];
                feedbackIndexes[idx] = j;
                values[idx] = f.value;
                valueDecimalsArr[idx] = f.valueDecimals;
                tag1s[idx] = f.tag1;
                tag2s[idx] = f.tag2;
                revokedStatuses[idx] = f.isRevoked;
                idx++;
            }
        }
    }

    function getClients(uint256 agentId) external view returns (address[] memory) {
        return clients[agentId];
    }

    function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64) {
        return lastIndex[agentId][clientAddress];
    }
}
