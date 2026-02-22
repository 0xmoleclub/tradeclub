/** A single (contract-set, topic0) pair passed to a multi-event query. */
export interface LogFilter {
  /** One or more emitting contract addresses (OR-ed by HyperSync). */
  contractAddresses: string[];
  topic0: string;
}
