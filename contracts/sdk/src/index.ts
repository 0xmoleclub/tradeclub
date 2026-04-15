export type MarketId = string;

export type OutcomePrice = {
  outcome: number;
  price: number;
};

export type TickDepth = {
  price: number;
  size: number;
};

export function lmsrPrice(q: number[], b: number, outcome: number): number {
  const denom = q.reduce((sum, qi) => sum + Math.exp(qi / b), 0);
  return Math.exp(q[outcome] / b) / denom;
}

export function lmsrCost(q: number[], b: number): number {
  const sum = q.reduce((acc, qi) => acc + Math.exp(qi / b), 0);
  return b * Math.log(sum);
}

export function lmsrTradeCost(qBefore: number[], qAfter: number[], b: number): number {
  return lmsrCost(qAfter, b) - lmsrCost(qBefore, b);
}

export function syntheticOrderbook(q: number[], b: number, outcome: number, ticks: number[]): TickDepth[] {
  const depths: TickDepth[] = [];
  for (let i = 0; i < ticks.length - 1; i += 1) {
    const priceStart = ticks[i];
    const priceEnd = ticks[i + 1];
    const size = Math.max(0, priceEnd - priceStart);
    depths.push({ price: priceEnd, size });
  }
  return depths;
}

// ERC-8004 Agent Registry ABIs

export const AGENT_IDENTITY_REGISTRY_ABI = [
  'function register(string calldata agentURI) external returns (uint256 agentId)',
  'function register(string calldata agentURI, MetadataEntry[] calldata extraMetadata) external returns (uint256 agentId)',
  'function setAgentURI(uint256 agentId, string calldata newURI) external',
  'function getMetadata(uint256 agentId, string memory metadataKey) external view returns (bytes memory)',
  'function setMetadata(uint256 agentId, string memory metadataKey, bytes calldata metadataValue) external',
  'function getAgentWallet(uint256 agentId) external view returns (address)',
  'function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes calldata signature) external',
  'function unsetAgentWallet(uint256 agentId) external',
  'event Registered(uint256 indexed agentId, string agentURI, address indexed owner)',
  'struct MetadataEntry { string metadataKey; bytes metadataValue; }',
];

export const AGENT_REPUTATION_REGISTRY_ABI = [
  'function initialize(address identityRegistry_) external',
  'function getIdentityRegistry() external view returns (address)',
  'function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string calldata tag1, string calldata tag2, string calldata endpoint, string calldata feedbackURI, bytes32 feedbackHash) external',
  'function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external',
  'function getSummary(uint256 agentId, address[] calldata clientAddresses, string calldata tag1, string calldata tag2) external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)',
  'function readFeedback(uint256 agentId, address clientAddress, uint64 feedbackIndex) external view returns (int128 value, uint8 valueDecimals, string memory tag1, string memory tag2, bool isRevoked)',
  'function readAllFeedback(uint256 agentId, address[] calldata clientAddresses, string calldata tag1, string calldata tag2, bool includeRevoked) external view returns (address[] memory outClients, uint64[] memory feedbackIndexes, int128[] memory values, uint8[] memory valueDecimalsArr, string[] memory tag1s, string[] memory tag2s, bool[] memory revokedStatuses)',
  'function getClients(uint256 agentId) external view returns (address[] memory)',
  'function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64)',
  'event NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, int128 value, uint8 valueDecimals, string indexed indexedTag1, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)',
  'event FeedbackRevoked(uint256 indexed agentId, address indexed clientAddress, uint64 indexed feedbackIndex)',
];

export const AGENT_VALIDATION_REGISTRY_ABI = [
  'function initialize(address identityRegistry_) external',
  'function getIdentityRegistry() external view returns (address)',
  'function validationRequest(address validatorAddress, uint256 agentId, string calldata requestURI, bytes32 requestHash) external',
  'function validationResponse(bytes32 requestHash, uint8 response, string calldata responseURI, bytes32 responseHash, string calldata tag) external',
  'function getValidationStatus(bytes32 requestHash) external view returns (address validatorAddress, uint256 agentId, uint8 response, bytes32 respHash, string memory tag, uint256 lastUpdate)',
  'function getSummary(uint256 agentId, address[] calldata validatorAddresses, string calldata tag) external view returns (uint64 count, uint8 averageResponse)',
  'function getAgentValidations(uint256 agentId) external view returns (bytes32[] memory)',
  'function getValidatorRequests(address validatorAddress) external view returns (bytes32[] memory)',
  'event ValidationRequest(address indexed validatorAddress, uint256 indexed agentId, string requestURI, bytes32 indexed requestHash)',
  'event ValidationResponse(address indexed validatorAddress, uint256 indexed agentId, bytes32 indexed requestHash, uint8 response, string responseURI, bytes32 responseHash, string tag)',
];
