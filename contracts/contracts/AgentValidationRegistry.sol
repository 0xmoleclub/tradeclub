// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {AgentIdentityRegistry} from './AgentIdentityRegistry.sol';

contract AgentValidationRegistry is Ownable {
    AgentIdentityRegistry public identityRegistry;

    struct Validation {
        address validatorAddress;
        uint256 agentId;
        uint8 response;
        bytes32 responseHash;
        string tag;
        uint256 lastUpdate;
    }

    mapping(bytes32 => Validation) public validations;
    mapping(uint256 => bytes32[]) public agentValidations;
    mapping(address => bytes32[]) public validatorRequests;

    event ValidationRequest(address indexed validatorAddress, uint256 indexed agentId, string requestURI, bytes32 indexed requestHash);
    event ValidationResponse(address indexed validatorAddress, uint256 indexed agentId, bytes32 indexed requestHash, uint8 response, string responseURI, bytes32 responseHash, string tag);

    error InvalidAgent();
    error NotValidator();

    constructor(address initialOwner) Ownable(initialOwner) {}

    function initialize(address identityRegistry_) external onlyOwner {
        identityRegistry = AgentIdentityRegistry(identityRegistry_);
    }

    function getIdentityRegistry() external view returns (address) {
        return address(identityRegistry);
    }

    function validationRequest(address validatorAddress, uint256 agentId, string calldata requestURI, bytes32 requestHash) external {
        if (address(identityRegistry) == address(0)) revert InvalidAgent();
        if (identityRegistry.ownerOf(agentId) == address(0)) revert InvalidAgent();
        require(
            msg.sender == identityRegistry.ownerOf(agentId) || msg.sender == identityRegistry.getApproved(agentId) || identityRegistry.isApprovedForAll(identityRegistry.ownerOf(agentId), msg.sender),
            "Not authorized"
        );

        validations[requestHash] = Validation(validatorAddress, agentId, 0, bytes32(0), "", 0);
        agentValidations[agentId].push(requestHash);
        validatorRequests[validatorAddress].push(requestHash);

        emit ValidationRequest(validatorAddress, agentId, requestURI, requestHash);
    }

    function validationResponse(bytes32 requestHash, uint8 response, string calldata responseURI, bytes32 responseHash, string calldata tag) external {
        Validation storage v = validations[requestHash];
        require(v.validatorAddress != address(0), "Request not found");
        require(msg.sender == v.validatorAddress, "Not validator");

        v.response = response;
        v.responseHash = responseHash;
        v.tag = tag;
        v.lastUpdate = block.timestamp;

        emit ValidationResponse(msg.sender, v.agentId, requestHash, response, responseURI, responseHash, tag);
    }

    function getValidationStatus(bytes32 requestHash) external view returns (address validatorAddress, uint256 agentId, uint8 response, bytes32 respHash, string memory tag, uint256 lastUpdate) {
        Validation storage v = validations[requestHash];
        return (v.validatorAddress, v.agentId, v.response, v.responseHash, v.tag, v.lastUpdate);
    }

    function getSummary(uint256 agentId, address[] calldata validatorAddresses, string calldata tag)
        external
        view
        returns (uint64 count, uint8 averageResponse)
    {
        uint256 total = 0;
        bytes32[] memory reqs = agentValidations[agentId];
        for (uint256 i = 0; i < reqs.length; i++) {
            Validation storage v = validations[reqs[i]];
            if (v.lastUpdate == 0) continue;
            if (validatorAddresses.length > 0) {
                bool found = false;
                for (uint256 j = 0; j < validatorAddresses.length; j++) {
                    if (v.validatorAddress == validatorAddresses[j]) {
                        found = true;
                        break;
                    }
                }
                if (!found) continue;
            }
            if (bytes(tag).length > 0 && keccak256(bytes(v.tag)) != keccak256(bytes(tag))) continue;
            count++;
            total += v.response;
        }
        if (count > 0) {
            averageResponse = uint8(total / count);
        }
    }

    function getAgentValidations(uint256 agentId) external view returns (bytes32[] memory) {
        return agentValidations[agentId];
    }

    function getValidatorRequests(address validatorAddress) external view returns (bytes32[] memory) {
        return validatorRequests[validatorAddress];
    }
}
