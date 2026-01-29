import { FUNDex } from "../../generated/src/Handlers.res.js";
import { notifyBackend, getMonachadIfTraderIsVault } from "./webhook.ts";
import { encodeFunctionData } from "viem";

/**
 * FUNDex DEX Event Handlers
 * Only notifies backend for trades by Monachads (for copy-trading)
 * Sends pre-encoded calldata so backend is DEX-agnostic
 */

// FUNDex ABI for encoding function calls
const fundexAbi = [
  {
    inputs: [
      { name: "assetId", type: "uint256" },
      { name: "positionType", type: "uint8" },
      { name: "leverage", type: "uint256" },
    ],
    name: "openPosition",
    outputs: [{ name: "positionId", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { name: "positionId", type: "uint256" },
      { name: "assetId", type: "uint256" },
    ],
    name: "closePosition",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const BPS_DENOMINATOR = 10_000n;

async function getLatestVaultSnapshot(
  context: any,
  matchVaultAddress: string,
  blockNumber: bigint
) {
  const records = await context.MatchVaultBalance.getWhere.matchVaultAddress.eq(
    matchVaultAddress
  );

  if (!Array.isArray(records) || records.length === 0) {
    return null;
  }

  let latest: any = null;
  for (const record of records) {
    const recordBlock = BigInt(record.blockNumber);
    if (recordBlock > blockNumber) {
      continue;
    }

    if (
      !latest ||
      recordBlock > BigInt(latest.blockNumber) ||
      (recordBlock === BigInt(latest.blockNumber) &&
        BigInt(record.timestamp) > BigInt(latest.timestamp))
    ) {
      latest = record;
    }
  }

  return latest;
}

async function calculateSizeToPortfolioBps(
  context: any,
  matchVaultAddress: string,
  blockNumber: bigint,
  tradeValue: bigint
): Promise<bigint | null> {
  const snapshot = await getLatestVaultSnapshot(
    context,
    matchVaultAddress,
    blockNumber
  );

  if (!snapshot) {
    return null;
  }

  const preBalance = BigInt(snapshot.postBalance);
  if (preBalance == 0n) {
    return null;
  }

  let ratio = (tradeValue * BPS_DENOMINATOR) / preBalance;

  if (ratio > BPS_DENOMINATOR) {
    ratio = BPS_DENOMINATOR;
  }

  return ratio;
}

FUNDex.PositionOpened.handler(async ({ event, context }) => {
  console.log("FUNDex PositionOpened event:", event);

  const blockNumber = BigInt(event.block.number);
  const traderAddress = event.params.trader.toLowerCase();
  const vaultContext = await getMonachadIfTraderIsVault(context, traderAddress);

  let sizeToPortfolioBps: bigint | null = null;

  if (vaultContext) {
    sizeToPortfolioBps = await calculateSizeToPortfolioBps(
      context,
      vaultContext.matchVaultAddress,
      blockNumber,
      event.params.collateral
    );
  }

  const entity: any = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    positionId: event.params.positionId,
    trader: traderAddress,
    assetId: event.params.assetId,
    positionType: Number(event.params.positionType),
    collateral: event.params.collateral,
    size: event.params.size,
    leverage: event.params.leverage,
    entryPrice: event.params.entryPrice,
    timestamp: event.params.timestamp,
    blockNumber,
    transactionHash: event.transaction.hash,
  };

  if (sizeToPortfolioBps !== null) {
    entity.sizeToPortfolioBps = sizeToPortfolioBps;
  }

  // Always index the event for data completeness
  context.PositionOpened.set(entity);

  // Check if this is a supporter's smart account copying a Monachad position
  // If so, create a mapping entry
  const supporterRecords = await context.SupporterJoined.getWhere.smartAccount.eq(
    traderAddress
  );

  console.log(
    `[PositionOpened] Checking if trader ${traderAddress} is a supporter smart account... Found ${Array.isArray(supporterRecords) ? supporterRecords.length : 0} records`
  );

  if (Array.isArray(supporterRecords) && supporterRecords.length > 0) {
    // This is a supporter's smart account position
    const supporterRecord = supporterRecords[0]; // Assume one record per smart account
    const monachad = supporterRecord.monachad.toLowerCase();
    const matchId = supporterRecord.matchId;

    // Find the most recent Monachad position opened for the same asset
    // This assumes the supporter opened their position shortly after the Monachad
    const monachadVault = await context.MatchVault.getWhere.matchId.eq(matchId);
    
    if (Array.isArray(monachadVault) && monachadVault.length > 0) {
      const vaultAddr = monachadVault.find(
        (v: any) => v.monachad.toLowerCase() === monachad
      )?.matchVaultAddress;

      if (vaultAddr) {
        const monachadPositions = await context.PositionOpened.getWhere.trader.eq(
          vaultAddr.toLowerCase()
        );

        if (Array.isArray(monachadPositions)) {
          // Find the most recent Monachad position with matching asset opened BEFORE this supporter position
          let matchingMonachadPosition: any = null;
          let latestTimestamp = 0n;

          for (const pos of monachadPositions) {
            if (
              pos.assetId === event.params.assetId &&
              BigInt(pos.blockNumber) <= blockNumber &&
              BigInt(pos.timestamp) > latestTimestamp
            ) {
              matchingMonachadPosition = pos;
              latestTimestamp = BigInt(pos.timestamp);
            }
          }

          if (matchingMonachadPosition) {
            // Create position mapping
            const mappingEntity = {
              id: `${event.chainId}_${matchId}_${matchingMonachadPosition.positionId}_${supporterRecord.supporter}_${event.params.positionId}`,
              matchId,
              monachad,
              monachadPositionId: matchingMonachadPosition.positionId,
              supporter: supporterRecord.supporter.toLowerCase(),
              supporterPositionId: event.params.positionId,
              assetId: event.params.assetId,
              opened: true,
              blockNumber,
              transactionHash: event.transaction.hash,
              timestamp: event.params.timestamp,
            };

            context.SupporterPositionMapping.set(mappingEntity);
            console.log(
              `Created position mapping: Monachad ${matchingMonachadPosition.positionId} -> Supporter ${event.params.positionId}`
            );
          }
        }
      }
    }
  }

  if (vaultContext) {
    console.log("Is trader a Monachad?", true);

    const openPositionData = encodeFunctionData({
      abi: fundexAbi,
      functionName: "openPosition",
      args: [
        event.params.assetId,
        event.params.positionType,
        event.params.leverage,
      ],
    });

    await notifyBackend("trade_opened", {
      monachadAddress: vaultContext.monachad,
      trade: {
        target: event.srcAddress,
        value: event.params.collateral.toString(),
        data: openPositionData,
      },
      metadata: {
        dex: "FUNDex",
        positionId: event.params.positionId.toString(),
        assetId: event.params.assetId.toString(),
        positionType: event.params.positionType,
        positionTypeLabel: Number(event.params.positionType) === 0 ? "LONG" : "SHORT",
        collateral: event.params.collateral.toString(),
        size: event.params.size.toString(),
        leverage: event.params.leverage.toString(),
        entryPrice: event.params.entryPrice.toString(),
        transactionHash: event.transaction.hash,
        matchId: vaultContext.matchId,
        matchVaultAddress: vaultContext.matchVaultAddress,
        sizeToPortfolioBps: sizeToPortfolioBps?.toString(),
      },
    });
  } else {
    console.log("Is trader a Monachad?", false);
  }
});

FUNDex.PositionClosed.handler(async ({ event, context }) => {
  const blockNumber = BigInt(event.block.number);
  const traderAddress = event.params.trader.toLowerCase();
  const vaultContext = await getMonachadIfTraderIsVault(context, traderAddress);

  let sizeToPortfolioBps: bigint | null = null;

  if (vaultContext) {
    const openPositions = await context.PositionOpened.getWhere.positionId.eq(
      event.params.positionId
    );

    if (Array.isArray(openPositions) && openPositions.length > 0) {
      let latestOpen: any = null;

      for (const record of openPositions) {
        const recordBlock = BigInt(record.blockNumber);
        if (recordBlock > blockNumber) {
          continue;
        }

        if (!latestOpen) {
          latestOpen = record;
          continue;
        }

        const latestBlock = BigInt(latestOpen.blockNumber);
        if (
          recordBlock > latestBlock ||
          (recordBlock === latestBlock &&
            BigInt(record.timestamp) > BigInt(latestOpen.timestamp))
        ) {
          latestOpen = record;
        }
      }

      if (
        latestOpen &&
        latestOpen.sizeToPortfolioBps !== undefined &&
        latestOpen.sizeToPortfolioBps !== null
      ) {
        sizeToPortfolioBps = BigInt(latestOpen.sizeToPortfolioBps);
      }
    }
  }

  const entity: any = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    positionId: event.params.positionId,
    trader: traderAddress,
    assetId: event.params.assetId,
    exitPrice: event.params.exitPrice,
    pnl: event.params.pnl,
    timestamp: event.params.timestamp,
    blockNumber,
    transactionHash: event.transaction.hash,
  };

  if (sizeToPortfolioBps !== null) {
    entity.sizeToPortfolioBps = sizeToPortfolioBps;
  }

  context.PositionClosed.set(entity);

  if (vaultContext) {
    console.log("Is trader a Monachad?", true);

    // Query all supporter position mappings for this Monachad position
    const mappings = await context.SupporterPositionMapping.getWhere.monachadPositionId.eq(
      event.params.positionId
    );

    console.log(
      `[PositionClosed] Found ${Array.isArray(mappings) ? mappings.length : 0} supporter position mappings for Monachad position ${event.params.positionId}`
    );

    // Send individual webhook per supporter with their specific closePosition calldata
    if (Array.isArray(mappings)) {
      for (const mapping of mappings) {
        if (!mapping.opened) {
          // Skip already closed positions
          console.log(
            `[PositionClosed] Skipping already closed supporter position ${mapping.supporterPositionId}`
          );
          continue;
        }

        console.log(
          `[PositionClosed] Processing supporter ${mapping.supporter}: position ${mapping.supporterPositionId} (Monachad position ${event.params.positionId})`
        );

        // Encode close calldata with THIS supporter's position ID
        const supporterCloseCalldata = encodeFunctionData({
          abi: fundexAbi,
          functionName: "closePosition",
          args: [mapping.supporterPositionId, mapping.assetId],
        });

        // Send webhook for this specific supporter
        // The backend sees this as just another trade_closed event with pre-encoded calldata
        await notifyBackend("trade_closed", {
          monachadAddress: vaultContext.monachad,
          trade: {
            target: event.srcAddress,
            value: "0",
            data: supporterCloseCalldata, // Supporter-specific calldata
          },
          metadata: {
            dex: "FUNDex",
            monachadPositionId: event.params.positionId.toString(),
            supporterAddress: mapping.supporter, // Tag which supporter this is for
            supporterPositionId: mapping.supporterPositionId.toString(),
            assetId: mapping.assetId.toString(),
            exitPrice: event.params.exitPrice.toString(),
            pnl: event.params.pnl.toString(),
            transactionHash: event.transaction.hash,
            matchId: vaultContext.matchId,
            matchVaultAddress: vaultContext.matchVaultAddress,
            sizeToPortfolioBps: sizeToPortfolioBps?.toString(),
          },
        });

        // Mark the mapping as closed
        context.SupporterPositionMapping.set({
          ...mapping,
          opened: false,
        });

        console.log(
          `Sent close webhook for supporter ${mapping.supporter}: position ${mapping.supporterPositionId}`
        );
      }
    }
  } else {
    console.log("Is trader a Monachad?", false);
  }
});

FUNDex.PriceUpdated.handler(async ({ event, context }) => {
  const entity = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    assetId: event.params.assetId,
    symbol: event.params.symbol,
    oldPrice: event.params.oldPrice,
    newPrice: event.params.newPrice,
    timestamp: event.params.timestamp,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
  };

  context.PriceUpdated.set(entity);
});

FUNDex.Deposited.handler(async ({ event, context }) => {
  const entity = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: event.params.user.toLowerCase(),
    amount: event.params.amount,
    newBalance: event.params.newBalance,
    timestamp: BigInt(event.block.timestamp),
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
  };

  context.Deposited.set(entity);
});

FUNDex.Withdrawn.handler(async ({ event, context }) => {
  const entity = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: event.params.user.toLowerCase(),
    amount: event.params.amount,
    newBalance: event.params.newBalance,
    timestamp: BigInt(event.block.timestamp),
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
  };

  context.Withdrawn.set(entity);
});
