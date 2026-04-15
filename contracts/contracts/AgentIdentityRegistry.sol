// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import {ERC721URIStorage} from '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {EIP712} from '@openzeppelin/contracts/utils/cryptography/EIP712.sol';
import {SignatureChecker} from '@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol';

contract AgentIdentityRegistry is ERC721, ERC721URIStorage, EIP712, Ownable {
    uint256 public nextAgentId;

    mapping(uint256 => mapping(string => bytes)) public metadata;
    mapping(uint256 => address) public agentWallet;

    bytes32 private constant SET_AGENT_WALLET_TYPEHASH =
        keccak256("SetAgentWallet(uint256 agentId,address newWallet,uint256 deadline)");

    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);
    event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy);
    event MetadataSet(uint256 indexed agentId, string indexed indexedMetadataKey, string metadataKey, bytes metadataValue);
    event AgentWalletSet(uint256 indexed agentId, address indexed wallet);
    event AgentWalletUnset(uint256 indexed agentId);

    error AlreadyInitialized();
    error InvalidSignature();
    error Expired();
    error ReservedMetadataKey();

    constructor(address initialOwner)
        ERC721("AgentIdentity", "AGENT")
        EIP712("AgentIdentityRegistry", "1")
        Ownable(initialOwner)
    {
        nextAgentId = 1;
    }

    function register(string calldata agentURI) external returns (uint256 agentId) {
        agentId = nextAgentId++;
        _safeMint(msg.sender, agentId);
        _setTokenURI(agentId, agentURI);

        address owner = msg.sender;
        agentWallet[agentId] = owner;

        emit Registered(agentId, agentURI, owner);
        emit MetadataSet(agentId, "agentWallet", "agentWallet", abi.encode(owner));
    }

    function register(string calldata agentURI, MetadataEntry[] calldata extraMetadata) external returns (uint256 agentId) {
        agentId = register(agentURI);
        for (uint256 i = 0; i < extraMetadata.length; i++) {
            _setMetadata(agentId, extraMetadata[i].metadataKey, extraMetadata[i].metadataValue);
        }
    }

    struct MetadataEntry {
        string metadataKey;
        bytes metadataValue;
    }

    function setAgentURI(uint256 agentId, string calldata newURI) external {
        require(_isAuthorized(_ownerOf(agentId), msg.sender, agentId), "Not authorized");
        _setTokenURI(agentId, newURI);
        emit URIUpdated(agentId, newURI, msg.sender);
    }

    function getMetadata(uint256 agentId, string memory metadataKey) external view returns (bytes memory) {
        return metadata[agentId][metadataKey];
    }

    function setMetadata(uint256 agentId, string memory metadataKey, bytes calldata metadataValue) external {
        require(_isAuthorized(_ownerOf(agentId), msg.sender, agentId), "Not authorized");
        _setMetadata(agentId, metadataKey, metadataValue);
    }

    function _setMetadata(uint256 agentId, string memory metadataKey, bytes memory metadataValue) internal {
        if (keccak256(bytes(metadataKey)) == keccak256(bytes("agentWallet"))) {
            revert ReservedMetadataKey();
        }
        metadata[agentId][metadataKey] = metadataValue;
        emit MetadataSet(agentId, metadataKey, metadataKey, metadataValue);
    }

    function getAgentWallet(uint256 agentId) external view returns (address) {
        return agentWallet[agentId];
    }

    function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes calldata signature) external {
        require(block.timestamp <= deadline, "Expired");
        require(_ownerOf(agentId) != address(0), "Agent does not exist");

        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(SET_AGENT_WALLET_TYPEHASH, agentId, newWallet, deadline))
        );

        bool valid = SignatureChecker.isValidSignatureNow(newWallet, digest, signature);
        require(valid, "Invalid signature");

        agentWallet[agentId] = newWallet;
        emit AgentWalletSet(agentId, newWallet);
        emit MetadataSet(agentId, "agentWallet", "agentWallet", abi.encode(newWallet));
    }

    function unsetAgentWallet(uint256 agentId) external {
        require(_isAuthorized(_ownerOf(agentId), msg.sender, agentId), "Not authorized");
        delete agentWallet[agentId];
        emit AgentWalletUnset(agentId);
    }

    function transferFrom(address from, address to, uint256 tokenId) public override(ERC721, IERC721) {
        super.transferFrom(from, to, tokenId);
        delete agentWallet[tokenId];
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
