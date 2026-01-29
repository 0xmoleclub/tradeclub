import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../database/database.service";
import { ContractService } from "../blockchain/contract.service";
import { DelegationService } from "../delegation/delegation.service";
import { TradingService } from "./trading.service";
import {
  MatchEventsGateway,
  CopyTradeEvent,
} from "../events/match-events.gateway";
import { ParticipantRole, TradeType } from "@prisma/client";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  type Chain,
  type Hex,
} from "viem";
import { createBundlerClient } from "viem/account-abstraction";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import {
  createExecution,
  ExecutionMode,
  Implementation,
  PREFERRED_VERSION,
  getDeleGatorEnvironment,
  type Delegation,
  type DeleGatorEnvironment,
  type MetaMaskSmartAccount,
  toMetaMaskSmartAccount,
} from "@metamask/delegation-toolkit";
import { Delegation as DelegationInDb } from "@prisma/client";
import { sepolia } from "viem/chains";
import { monadTestnet } from "../blockchain/monad-chain";

// DelegationManager contract - loaded dynamically at runtime
let DelegationManagerContract: any;

interface CopyTradeParams {
  monachadAddress: string;
  matchId: string;
  originalTrade: {
    target: string;
    value: string;
    data: string;
  };
  metadata?: {
    sizeToPortfolioBps?: string;
    supporterAddress?: string; // If provided, only execute for this specific supporter
    [key: string]: any;
  };
}

/**
 * Signed delegation from user (delegator)
 * This is what we receive from the frontend after user signs
 */
interface SignedDelegation extends Delegation {
  signature: Hex;
}

/**
 * Batch of copy trades to execute together
 */
interface BatchCopyTrade {
  delegation: SignedDelegation;
  delegationRecord: any; // DB record
  target: string;
  value: bigint;
  data: string;
}

@Injectable()
export class CopyEngineService implements OnModuleInit {
  private readonly logger = new Logger(CopyEngineService.name);
  private readonly bundlerUrl: string;
  private readonly entryPointAddress: string;
  private readonly rpcUrl: string;
  private readonly chainId: number;
  private readonly chain: Chain;
  private readonly publicClient: any;
  private readonly bundlerClient: any;
  private bundlerAccount: MetaMaskSmartAccount | null = null;
  private bundlerOwnerAccount: PrivateKeyAccount | null = null;
  private bundlerSignerKey?: string;
  private environment?: DeleGatorEnvironment;
  private bundlerWalletClient: any;
  private readonly knownExactCalldataEnforcers = new Set<Hex>([
    "0x99f2e9bf15ce5ec84685604836f71ab835dbbded" as Hex,
  ]);
  private bundlerSmartAccountChecked: boolean = false;

  constructor(
    private db: DatabaseService,
    private contractService: ContractService,
    private delegationService: DelegationService,
    private tradingService: TradingService,
    private configService: ConfigService,
    private matchEventsGateway: MatchEventsGateway
  ) {
    this.rpcUrl = this.configService.get<string>(
      "RPC_URL",
      "https://testnet.monad.xyz"
    );

    this.bundlerUrl = this.configService.get<string>(
      "BUNDLER_URL",
      "https://api.pimlico.io/v1/monad-testnet/rpc"
    );

    this.entryPointAddress = this.configService.get<string>(
      "ENTRYPOINT_ADDRESS",
      "0x0000000071727De22E5E9d8BAf0edAc6f37da032"
    );

    this.chainId = Number(this.configService.get<number>("CHAIN_ID", 10143));
    this.chain = this.resolveChain(this.chainId, this.rpcUrl);

    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(this.rpcUrl),
    });

    this.bundlerClient = createBundlerClient({
      client: this.publicClient,
      transport: http(this.bundlerUrl),
    });

    this.bundlerSignerKey = this.configService
      .get<string>("BUNDLER_SIGNER_KEY")
      ?.trim();

    if (!this.bundlerSignerKey) {
      this.logger.warn(
        "BUNDLER_SIGNER_KEY is not configured; copy trades cannot be submitted"
      );
    } else {
      this.logger.log("BUNDLER_SIGNER_KEY loaded from configuration");
    }
  }

  async onModuleInit(): Promise<void> {
    await this.initializeBundlerAccount();
  }

  private resolveChain(chainId: number, rpcUrl: string): Chain {
    if (chainId === 10143) {
      return monadTestnet;
    }

    if (chainId === 11155111) {
      return sepolia;
    }

    return defineChain({
      id: chainId,
      name: `Chain-${chainId}`,
      nativeCurrency: {
        decimals: 18,
        name: "Ether",
        symbol: "ETH",
      },
      rpcUrls: {
        default: {
          http: [rpcUrl],
        },
        public: {
          http: [rpcUrl],
        },
      },
      testnet: true,
    });
  }

  private async initializeBundlerAccount(): Promise<void> {
    if (!this.bundlerSignerKey) {
      return;
    }

    try {
      const normalizedKey = this.normalizePrivateKey(this.bundlerSignerKey);
      this.bundlerOwnerAccount = privateKeyToAccount(normalizedKey);

      this.environment = this.resolveDelegationEnvironment();

      this.bundlerAccount = await toMetaMaskSmartAccount({
        client: this.publicClient,
        implementation: Implementation.Hybrid,
        deployParams: [this.bundlerOwnerAccount.address as Hex, [], [], []],
        deploySalt: "0x",
        signer: { account: this.bundlerOwnerAccount },
        environment: this.environment,
      });

      this.bundlerWalletClient = createWalletClient({
        account: this.bundlerOwnerAccount,
        chain: this.chain,
        transport: http(this.rpcUrl),
      });

      this.logger.log(
        `Bundler smart account ready: ${this.bundlerAccount.address}`
      );

      await this.ensureBundlerSmartAccountDeployed();
    } catch (error) {
      this.logger.error("Failed to initialize bundler smart account", error);
      this.bundlerAccount = null;
      this.bundlerOwnerAccount = null;
      this.bundlerWalletClient = null;
    }
  }

  private resolveDelegationEnvironment(): DeleGatorEnvironment | undefined {
    try {
      const environment = getDeleGatorEnvironment(
        this.chainId,
        PREFERRED_VERSION
      );
      this.logger.log(
        `Loaded delegation environment for chain ${this.chainId} (v${PREFERRED_VERSION})`
      );
      return environment;
    } catch (error) {
      this.logger.warn(
        `No prebuilt delegation environment found for chain ${this.chainId}: ${error instanceof Error ? error.message : error}`
      );
      return undefined;
    }
  }

  private normalizePrivateKey(key: string): Hex {
    return key.startsWith("0x") ? (key as Hex) : (`0x${key}` as Hex);
  }

  private async ensureBundlerSmartAccountDeployed(): Promise<void> {
    if (this.bundlerSmartAccountChecked) {
      return;
    }

    const address = this.bundlerAccount.address as Hex;
    if (!this.bundlerAccount || !this.bundlerOwnerAccount) {
      const deployedCode = await this.publicClient.getCode({ address });

      if (!deployedCode || deployedCode === "0x") {
        this.logger.warn(
          `Chain ${this.chainId} returned no code for ${address} despite logged deployment.`
        );
      } else {
        this.logger.log("Bundler smart account already deployed");
      }

      return;
    }
    this.logger.debug?.(
      `Ensuring bundler smart account deployed at ${address}`
    );

    const existingCode = await this.publicClient.getCode({ address });

    if (existingCode && existingCode !== "0x") {
      this.logger.log("Bundler smart account already deployed");
      return;
    }

    const { factory, factoryData } = await this.bundlerAccount.getFactoryArgs();

    if (!factory || factory === "0x" || !factoryData || factoryData === "0x") {
      throw new Error(
        "Bundler smart account missing factory deployment data; cannot deploy"
      );
    }

    if (!this.bundlerWalletClient) {
      throw new Error("Bundler wallet client is not available for deployment");
    }

    this.logger.log("Deploying bundler smart account before first use");
    this.bundlerSmartAccountChecked = true;

    const balance = await this.publicClient.getBalance({
      address: this.bundlerOwnerAccount.address as Hex,
    });

    if (balance === 0n) {
      throw new Error(
        `Bundler signer ${this.bundlerOwnerAccount.address} has zero balance on chain ${this.chainId}. Fund it before executing copy trades.`
      );
    }

    const gasEstimate = await this.publicClient.estimateGas({
      account: this.bundlerOwnerAccount,
      to: factory,
      data: factoryData as Hex,
      value: 0n,
    });

    const gasWithBuffer = (gasEstimate * 12n) / 10n; // 20% buffer

    const txHash = await this.bundlerWalletClient.sendTransaction({
      to: factory,
      data: factoryData as Hex,
      value: 0n,
      gas: gasWithBuffer,
    });

    this.logger.log(`Bundler smart account deployment tx sent: ${txHash}`);

    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    if (receipt.status !== "success") {
      throw new Error("Bundler smart account deployment transaction failed");
    }

    const deployedCode = await this.publicClient.getCode({ address });

    if (!deployedCode || deployedCode === "0x") {
      throw new Error(
        "Deployment verification failed for bundler smart account"
      );
    }

    this.logger.log("Bundler smart account deployed successfully");
  }

  private getDelegationManagerAddress(): Hex {
    const fromEnvironment = this.environment?.DelegationManager as
      | Hex
      | undefined;
    const fromConfig = this.configService.get<string>(
      "DELEGATION_MANAGER_ADDRESS"
    );

    const address = fromEnvironment ?? fromConfig;

    if (!address) {
      throw new Error("DelegationManager address is not configured");
    }

    return address.startsWith("0x")
      ? (address as Hex)
      : (`0x${address}` as Hex);
  }

  /**
   * Execute pro rata copy trades for all active supporters using BATCH PROCESSING
   * This submits multiple delegated trades in a single bundler call (like multicall)
   *
   * If metadata.supporterAddress is provided, only executes for that specific supporter
   * (used for close trades where each supporter has different calldata with their positionId)
   */
  async executeCopyTrades(params: CopyTradeParams): Promise<void> {
    const { monachadAddress, matchId, originalTrade, metadata } = params;

    this.logger.log(
      `[executeCopyTrades] START - Monachad: ${monachadAddress}, Match: ${matchId}, SupporterAddress: ${metadata?.supporterAddress || 'N/A'}`
    );

    // Build delegation query - filter by specific supporter if provided
    const delegationWhere: any = {
      monachad: monachadAddress.toLowerCase(),
      matchId,
      isActive: true,
      expiresAt: {
        gte: new Date(),
      },
    };

    // If this is a supporter-specific trade (e.g., close with custom positionId), filter to that supporter
    if (metadata?.supporterAddress) {
      delegationWhere.supporter = metadata.supporterAddress.toLowerCase();
      this.logger.log(
        `Executing supporter-specific trade for ${metadata.supporterAddress}`
      );
    }

    // Get active delegations
    const activeDelegations = await this.db.delegation.findMany({
      where: delegationWhere,
    });

    this.logger.log(
      `[executeCopyTrades] Found ${activeDelegations.length} active delegation(s)`
    );

    if (activeDelegations.length === 0) {
      this.logger.log(
        metadata?.supporterAddress
          ? `No active delegation for supporter ${metadata.supporterAddress}`
          : `No active delegations for Monachad ${monachadAddress} in match ${matchId}`
      );
      return;
    }

    this.logger.log(
      `Preparing batch of ${activeDelegations.length} copy trade(s) for Monachad ${monachadAddress}`
    );

    const sizeToPortfolioBps = metadata?.sizeToPortfolioBps
      ? BigInt(metadata.sizeToPortfolioBps)
      : null;

    // Prepare batch of trades
    const batchTrades: BatchCopyTrade[] = [];

    for (const delegation of activeDelegations) {
      try {
        // Calculate trade value
        let tradeValue: bigint;

        if (sizeToPortfolioBps !== null) {
          // Proportional sizing (for opens)
          const delegationAmount = BigInt(delegation.amount);
          tradeValue = (delegationAmount * sizeToPortfolioBps) / 10000n;
        } else {
          // Fixed value (for closes, usually 0)
          tradeValue = BigInt(originalTrade.value);
        }

        // Validate delegation is still valid on-chain
        const isValid =
          await this.delegationService.isDelegationValidAndNotExpired(
            delegation
          );

        if (!isValid) {
          this.logger.warn(
            `Delegation ${delegation.delegationHash} is no longer valid, skipping`
          );
          continue;
        }

        // Check spending limits (skip for zero-value trades like closes)
        if (tradeValue > 0n) {
          const spentAmount = BigInt(delegation.spentAmount);
          const maxSpend = BigInt(delegation.amount);

          if (spentAmount + tradeValue > maxSpend) {
            this.logger.warn(
              `Delegation ${delegation.delegationHash} would exceed spending limit, skipping`
            );
            continue;
          }
        }

        // Retrieve the signed delegation from database (stored when user created it)
        const signedDelegation = await this.getSignedDelegation(delegation);

        if (!signedDelegation) {
          this.logger.error(
            `No signed delegation found for ${delegation.delegationHash}`
          );
          continue;
        }

        if (this.hasBlockingExactCalldataCaveat(signedDelegation)) {
          this.logger.warn(
            `Delegation ${delegation.delegationHash} enforces empty calldata via ExactCalldata enforcer; supporter must re-delegate before copy trades can execute.`
          );
          continue;
        }

        batchTrades.push({
          delegation: signedDelegation,
          delegationRecord: delegation,
          target: originalTrade.target,
          value: tradeValue,
          data: originalTrade.data, // Pre-encoded by indexer (may contain supporter-specific positionId for closes)
        });
      } catch (error) {
        this.logger.error(
          `Failed to prepare delegation ${delegation.delegationHash}: ${error.message}`
        );
      }
    }

    if (batchTrades.length === 0) {
      this.logger.warn("No valid delegations to execute in batch");
      return;
    }

    // Execute batch with bundler
    await this.executeBatchCopyTrades(batchTrades, matchId);
  }

  /**
   * Execute batch of copy trades using MetaMask Delegation Toolkit
   * Submits multiple UserOps at once
   */
  private async executeBatchCopyTrades(
    batchTrades: BatchCopyTrade[],
    matchId: string
  ): Promise<void> {
    this.logger.log(`Executing batch of ${batchTrades.length} copy trades`);

    try {
      // Prepare all delegations and executions for batch submission
      const delegations: SignedDelegation[][] = [];
      const modes: ExecutionMode[] = [];
      const executions: Array<ReturnType<typeof createExecution>[]> = [];

      for (const trade of batchTrades) {
        // Each trade gets its own delegation chain (single delegation for now)
        delegations.push([trade.delegation]);

        // SingleDefault execution mode
        modes.push(ExecutionMode.SingleDefault);

        // Create execution for this trade
        executions.push([
          createExecution({
            target: trade.target as Hex,
            value: trade.value,
            callData: trade.data as Hex,
          }),
        ]);
      }

      // Build the redeemDelegations calldata using MetaMask toolkit
      // Lazy load DelegationManager if not already loaded
      if (!DelegationManagerContract) {
        try {
          // Use require() to bypass TypeScript module resolution issues
          DelegationManagerContract =
            require("@metamask/delegation-toolkit/contracts").DelegationManager;
        } catch (error) {
          this.logger.error(
            "Failed to load DelegationManager from toolkit",
            error
          );
          throw new Error("MetaMask Delegation Toolkit not available");
        }
      }

      const redeemDelegationCalldata =
        DelegationManagerContract.encode.redeemDelegations({
          delegations,
          modes,
          executions,
        });

      // Get the DeleGator address from first trade (they all redeem through same DelegationManager)
      const delegationManagerAddress = this.getDelegationManagerAddress();

      // Submit as a single bundler transaction
      // The bundler will process all redemptions atomically
      if (!this.bundlerAccount) {
        throw new Error(
          "BUNDLER_SIGNER_KEY is missing; cannot submit copy trade"
        );
      }

      // await this.ensureBundlerSmartAccountDeployed(); // drastically slow things down

      const userOpHash = await this.bundlerClient.sendUserOperation({
        account: this.bundlerAccount as any,
        calls: [
          {
            to: delegationManagerAddress,
            data: redeemDelegationCalldata,
          },
        ],
        maxFeePerGas: BigInt(2000000000), // 2 gwei
        maxPriorityFeePerGas: BigInt(1000000000), // 1 gwei
      });

      this.logger.log(`Batch UserOperation submitted: ${userOpHash}`);

      // Wait for bundler to include the batch
      const receipt = await this.bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });

      if (!receipt.success) {
        throw new Error(`Batch UserOperation failed: ${userOpHash}`);
      }

      this.logger.log(
        `Batch executed in block ${receipt.receipt.blockNumber}, txHash: ${receipt.receipt.transactionHash}`
      );

      // Update database records for all successful trades
      await this.recordBatchTrades(
        batchTrades,
        matchId,
        Number(receipt.receipt.blockNumber),
        receipt.receipt.transactionHash
      );
    } catch (error) {
      this.logger.error(`Batch execution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Record all batch trades in database
   */
  private async recordBatchTrades(
    batchTrades: BatchCopyTrade[],
    matchId: string,
    blockNumber: number,
    txHash: string
  ): Promise<void> {
    const copyTradeEvents: CopyTradeEvent[] = [];

    for (const trade of batchTrades) {
      try {
        const delegation = trade.delegationRecord;
        const supporter = delegation.supporter;

        // Find or create participant record
        let participant = await this.db.participant.findUnique({
          where: {
            matchId_address: {
              matchId,
              address: supporter.toLowerCase(),
            },
          },
        });

        if (!participant) {
          participant = await this.db.participant.create({
            data: {
              matchId,
              address: supporter.toLowerCase(),
              role: ParticipantRole.SUPPORTER,
              marginAmount: "0",
              entryFeePaid: "0",
              fundedAmount: delegation.amount,
              pnl: "0",
            },
          });
        }

        // Update delegation spent amount
        const newSpentAmount = (
          BigInt(delegation.spentAmount) + trade.value
        ).toString();
        await this.db.delegation.update({
          where: { id: delegation.id },
          data: { spentAmount: newSpentAmount },
        });

        // Record trade
        await this.tradingService.recordTrade(
          {
            matchId,
            participantId: participant.id,
            delegationId: delegation.id,
            tradeType: TradeType.SUPPORTER_COPY,
            tokenIn: "",
            tokenOut: "",
            amountIn: trade.value.toString(),
            amountOut: "0",
            targetContract: trade.target,
          },
          blockNumber,
          txHash
        );

        this.logger.log(
          `✅ Recorded copy trade for ${supporter}: ${this.contractService.formatEther(trade.value)} ETH`
        );

        // Prepare WebSocket event
        copyTradeEvents.push({
          matchId,
          monachadAddress: delegation.monachad.toLowerCase(),
          supporterAddress: supporter.toLowerCase(),
          tradeType: "OPEN", // Can be determined from trade.data if needed
          dex: trade.target,
          amount: trade.value.toString(),
          transactionHash: txHash,
          timestamp: Date.now(),
        });
      } catch (error) {
        this.logger.error(
          `Failed to record trade for ${trade.delegationRecord.supporter}: ${error.message}`
        );
      }
    }

    // Emit batch WebSocket events to all clients watching this match
    if (copyTradeEvents.length > 0) {
      this.matchEventsGateway.emitBatchCopyTrades(copyTradeEvents);
      this.logger.log(
        `📡 Emitted ${copyTradeEvents.length} copy trade events via WebSocket for match ${matchId}`
      );
    }
  }

  /**
   * Retrieve signed delegation from database
   * Users sign delegations on frontend, we store them here
   */
  private async getSignedDelegation(
    delegation: DelegationInDb
  ): Promise<SignedDelegation | null> {
    if (!delegation || !delegation.signedDelegation) {
      return null;
    }
    return JSON.parse(delegation.signedDelegation);
  }

  private hasBlockingExactCalldataCaveat(
    delegation: SignedDelegation
  ): boolean {
    if (!delegation || !Array.isArray((delegation as any).caveats)) {
      return false;
    }

    const enforcerAddresses = new Set<string>();
    for (const known of this.knownExactCalldataEnforcers) {
      enforcerAddresses.add(known.toLowerCase());
    }

    const envExactCalldata =
      this.environment?.caveatEnforcers?.ExactCalldataEnforcer;
    if (typeof envExactCalldata === "string") {
      enforcerAddresses.add(envExactCalldata.toLowerCase());
    }

    return (delegation as any).caveats.some((caveat: any) => {
      if (!caveat || typeof caveat !== "object") {
        return false;
      }

      const enforcer =
        typeof caveat.enforcer === "string"
          ? caveat.enforcer.toLowerCase()
          : "";
      if (!enforcerAddresses.has(enforcer)) {
        return false;
      }

      const terms =
        typeof caveat.terms === "string" ? caveat.terms.toLowerCase() : "";

      // Default ExactCalldata caveat enforces empty calldata, which blocks copy trades.
      return terms === "0x" || terms === "0x0";
    });
  }

  /**
   * Get copy trading statistics for a Monachad
   */
  async getCopyTradingStats(monachad: string, matchId?: string) {
    const where: any = {
      monachad: monachad.toLowerCase(),
      isActive: true,
    };

    if (matchId) {
      where.matchId = matchId;
    }

    const delegations = await this.db.delegation.findMany({ where });

    let totalSupporters = delegations.length;
    let totalDelegatedAmount = BigInt(0);
    let totalSpentAmount = BigInt(0);

    for (const delegation of delegations) {
      totalDelegatedAmount += BigInt(delegation.amount);
      totalSpentAmount += BigInt(delegation.spentAmount);
    }

    // Get copy trades count
    const copyTrades = await this.db.trade.count({
      where: {
        matchId,
        tradeType: TradeType.SUPPORTER_COPY,
      },
    });

    return {
      monachad,
      matchId: matchId || "all",
      totalSupporters,
      totalDelegatedAmount: totalDelegatedAmount.toString(),
      totalSpentAmount: totalSpentAmount.toString(),
      remainingAmount: (totalDelegatedAmount - totalSpentAmount).toString(),
      copyTradesExecuted: copyTrades,
      utilizationRate:
        totalDelegatedAmount > 0n
          ? Number((totalSpentAmount * 10000n) / totalDelegatedAmount) / 100
          : 0,
    };
  }

  /**
   * Get supporter's copy trading performance
   */
  async getCopyTradeStats(supporter: string, matchId?: string) {
    const where: any = {
      participant: {
        address: supporter.toLowerCase(),
      },
      tradeType: TradeType.SUPPORTER_COPY,
    };

    if (matchId) {
      where.matchId = matchId;
    }

    const copyTrades = await this.db.trade.findMany({
      where,
      include: {
        participant: true,
      },
    });

    let totalCopyTrades = copyTrades.length;
    let totalVolume = BigInt(0);
    let totalPnL = BigInt(0);

    for (const trade of copyTrades) {
      // Calculate volume from amountIn
      totalVolume += BigInt(trade.amountIn);
      // Get PnL from participant
      if (trade.participant) {
        totalPnL += BigInt(trade.participant.pnl);
      }
    }

    return {
      supporter,
      matchId: matchId || "all",
      totalCopyTrades,
      totalVolume: totalVolume.toString(),
      totalPnL: totalPnL.toString(),
      avgPnLPerTrade:
        totalCopyTrades > 0
          ? (totalPnL / BigInt(totalCopyTrades)).toString()
          : "0",
    };
  }
}
