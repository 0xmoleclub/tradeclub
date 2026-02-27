/**
 * Minimal ABI slices for the PredictionMarket and ERC-20 contracts.
 * Only the functions the frontend needs for the client-signed trading flow.
 */

export const PREDICTION_MARKET_ABI = [
  {
    type: "function",
    name: "quoteBuy",
    inputs: [
      { name: "outcome", type: "uint8" },
      { name: "amountShares", type: "uint256" },
    ],
    outputs: [
      { name: "costUsdc", type: "uint256" },
      { name: "feeUsdc", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "quoteSell",
    inputs: [
      { name: "outcome", type: "uint8" },
      { name: "amountShares", type: "uint256" },
    ],
    outputs: [
      { name: "proceedsUsdc", type: "uint256" },
      { name: "feeUsdc", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "buy",
    inputs: [
      { name: "outcome", type: "uint8" },
      { name: "amountShares", type: "uint256" },
      { name: "maxCost", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "sell",
    inputs: [
      { name: "outcome", type: "uint8" },
      { name: "amountShares", type: "uint256" },
      { name: "minProceeds", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "shares",
    inputs: [
      { name: "user", type: "address" },
      { name: "outcome", type: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;
