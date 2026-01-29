import {
  Controller,
  Post,
  Body,
  Headers,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { createHmac } from "crypto";
import { CopyEngineService } from "../trading/copy-engine.service";
import { MatchesService } from "../matches/matches.service";

/**
 * WebhooksController - Minimal DEX-Agnostic Webhook Router
 *
 * Architecture Philosophy:
 * - Indexer: Encodes DEX-specific function calls (knows about FUNDex, Uniswap, etc.)
 * - Webhook: Validates and routes (no DEX knowledge)
 * - Copy-Engine: Executes batch UserOps (DEX-agnostic)
 *
 * This design allows adding 1000 DEXes without modifying backend code.
 * Just create a new indexer handler with the DEX ABI and encoding logic.
 */

interface TradePayload {
  target: string; // DEX contract address
  value: string; // ETH to send
  data: string; // Pre-encoded function call
}

type EnvioEventType =
  | "match_created"
  | "monachad_joined"
  | "supporter_joined"
  | "match_started"
  | "match_completed"
  | "pnl_updated"
  | "trade_opened"
  | "trade_closed";

interface WebhookPayload {
  eventType: EnvioEventType | string;
  monachadAddress?: string;
  trade?: TradePayload;
  metadata?: {
    dex?: string;
    positionId?: string;
    assetId?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

@Controller("webhooks")
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly copyEngine: CopyEngineService,
    private readonly eventEmitter: EventEmitter2,
    private readonly matchesService: MatchesService
  ) {
    this.webhookSecret = process.env.ENVIO_WEBHOOK_SECRET || "";
    if (!this.webhookSecret) {
      this.logger.warn(
        "ENVIO_WEBHOOK_SECRET not set - webhook signature validation disabled"
      );
    }
  }

  @Post("envio")
  async handleEnvioWebhook(
    @Body() body: WebhookPayload,
    @Headers("x-Envio-Signature") signature?: string
  ) {
    this.logger.log(`Received webhook: ${body.eventType}`);

    // Validate webhook signature for security
    if (this.webhookSecret && signature) {
      const isValid = this.validateSignature(JSON.stringify(body), signature);
      if (!isValid) {
        this.logger.error("Invalid webhook signature");
        return {
          statusCode: HttpStatus.UNAUTHORIZED,
          message: "Invalid signature",
        };
      }
    }

    // Route to appropriate handler based on event type
    try {
      switch (body.eventType) {
        case "trade_opened":
          await this.handleTradeOpened(body);
          break;
        case "trade_closed":
          await this.handleTradeClosed(body);
          break;
        case "match_created": {
          const eventPayload = await this.matchesService.createMatch(body);
          if (eventPayload) {
            this.eventEmitter.emit("match.created", eventPayload);
          }
          break;
        }
        case "monachad_joined": {
          const eventPayload = await this.matchesService.upsertParticipant({
            ...body,
            participant: body.monachad,
            role: "MONACHAD",
          });
          if (eventPayload) {
            this.eventEmitter.emit("match.participant-joined", eventPayload);
          }
          break;
        }
        case "supporter_joined": {
          const eventPayload = await this.matchesService.upsertParticipant({
            ...body,
            participant: body.supporter,
            role: "SUPPORTER",
            followingAddress: body.monachad,
          });
          if (eventPayload) {
            this.eventEmitter.emit("match.participant-joined", eventPayload);
          }
          break;
        }
        case "match_started": {
          const eventPayload =
            await this.matchesService.applyMatchStartedUpdate(body);
          if (eventPayload) {
            this.eventEmitter.emit("match.started", eventPayload);
          }
          break;
        }
        case "match_completed": {
          const eventPayload = await this.matchesService.completeMatch(body);
          if (eventPayload) {
            this.eventEmitter.emit("match.completed", eventPayload);
          }
          break;
        }
        case "pnl_updated": {
          const eventPayload = await this.matchesService.updatePnL(body);
          if (eventPayload) {
            this.eventEmitter.emit("match.pnl-updated", eventPayload);
          }
          break;
        }
        default:
          this.logger.warn(`Unknown event type: ${body.eventType}`);
      }

      return { statusCode: HttpStatus.OK, message: "Webhook processed" };
    } catch (error) {
      this.logger.error("Error processing webhook", error);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Processing failed",
      };
    }
  }

  /**
   * Debug endpoint: emit a single Monachad trade event via the app event bus
   * Useful for local end-to-end testing without going through the external webhook provider.
   */
  @Post("debug/emit-monachad")
  async debugEmitMonachad(@Body() payload: any) {
    this.logger.log("Debug: emitting monachad.trade event", payload);

    try {
      this.eventEmitter.emit("monachad.trade", payload);
      return { statusCode: HttpStatus.OK, message: "Event emitted" };
    } catch (error) {
      this.logger.error("Failed to emit debug monachad.trade", error);
      return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: "Emit failed" };
    }
  }

  /**
   * Debug endpoint: emit a batch of Monachad trade events via the app event bus
   */
  @Post("debug/emit-monachad-batch")
  async debugEmitMonachadBatch(@Body() payload: { trades: any[] }) {
    this.logger.log("Debug: emitting monachad.batchTrades event", {
      count: payload?.trades?.length ?? 0,
    });

    try {
      const trades = payload?.trades ?? [];
      this.eventEmitter.emit("monachad.batchTrades", trades);
      return { statusCode: HttpStatus.OK, message: "Batch event emitted", count: trades.length };
    } catch (error) {
      this.logger.error("Failed to emit debug monachad.batchTrades", error);
      return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: "Emit failed" };
    }
  }

  /**
   * Handle trade opened - DEX agnostic
   * Finds active matches and delegates to copy-engine
   */
  private async handleTradeOpened(payload: WebhookPayload) {
    this.logger.log(
      `Trade opened: Monachad=${payload.monachadAddress}, DEX=${payload.metadata?.dex}`
    );

    if (!payload.monachadAddress) {
      this.logger.warn("trade_opened payload missing monachadAddress");
      return;
    }

    // Find active matches where this address is a Monachad participant
    const matches = await this.matchesService.getActiveMatchesForMonachad(
      payload.monachadAddress
    );

    if (matches.length === 0) {
      this.logger.warn(
        `No active matches found for Monachad ${payload.monachadAddress}`
      );
      return;
    }

    this.logger.log(`Found ${matches.length} active match(es) for copy-trading: ${matches.map(m=>m.matchId).join(',')}`);

    // If the webhook provides an explicit matchId in metadata, prefer it (safer)
    const preferredMatchId = payload.metadata?.matchId;
    if (preferredMatchId) {
      this.logger.log(`Webhook includes metadata.matchId=${preferredMatchId}, will emit only to that match if present`);
    }

    // Collect Monachad trade events for batch emit
    const monachadTradeEvents = matches
      .filter((match) => !preferredMatchId || String(match.matchId) === String(preferredMatchId))
      .map((match) => ({
        matchId: match.matchId,
        monachadAddress: payload.monachadAddress,
        tradeType: "OPEN",
        dex: payload.metadata?.dex || "",
        amount: payload.trade?.value || "",
        positionType: payload.metadata?.positionType,
        leverage: payload.metadata?.leverage,
        assetId: payload.metadata?.assetId,
        positionId: payload.metadata?.positionId,
        collateral: payload.metadata?.collateral,
        size: payload.metadata?.size,
        entryPrice: payload.metadata?.entryPrice,
        matchVaultAddress: payload.metadata?.matchVaultAddress,
        transactionHash: payload.metadata?.transactionHash || "",
        timestamp: Date.now(),
      }));

    if (monachadTradeEvents.length === 0) {
      this.logger.log(`No matching active matches after applying metadata.matchId filter (preferred=${preferredMatchId})`);
    }

    // Emit Monachad trade events to frontend
    try {
      this.logger.log("Emitting Monachad trade events to frontend");
      if (monachadTradeEvents.length === 1) {
        this.logger.log("Emitting single Monachad trade event (via event)");
        this.eventEmitter.emit('monachad.trade', monachadTradeEvents[0]);
      } else if (monachadTradeEvents.length > 1) {
        this.logger.log("Emitting batch Monachad trade events (via event)");
        this.eventEmitter.emit('monachad.batchTrades', monachadTradeEvents);
      }
    } catch (error) {
      this.logger.error(
        "WebhookController.handleTradeOpened: Failed to emit Monachad trade events",
        error
      );
    }

    // Execute copy-trading for each match (copy-engine handles all the heavy lifting)
    for (const match of matches) {
      try {
        await this.copyEngine.executeCopyTrades({
          monachadAddress: payload.monachadAddress.toLowerCase(),
          matchId: match.matchId,
          originalTrade: payload.trade, // Pass through pre-encoded trade data
          metadata: payload.metadata,
        });
        this.logger.log(`Copy-trade executed for match ${match.matchId}`);
      } catch (error) {
        this.logger.error(
          `Failed to execute copy-trade for match ${match.matchId}`,
          error
        );
      }
    }
  }

  /**
   * Handle trade closed - DEX agnostic
   * Supports both:
   * 1. Monachad closes (broadcasts to all supporters)
   * 2. Individual supporter close (webhook per supporter with their positionId in calldata)
   */
  private async handleTradeClosed(payload: WebhookPayload) {
    this.logger.log(
      `Trade closed: Monachad=${payload.monachadAddress}, DEX=${payload.metadata?.dex}, Supporter=${payload.metadata?.supporterAddress || 'N/A'}`
    );

    if (!payload.monachadAddress) {
      this.logger.warn("trade_closed payload missing monachadAddress");
      return;
    }

    // Check if this is a supporter-specific webhook (indexer sends one per supporter for closes)
    const supporterAddress = payload.metadata?.supporterAddress;
    const matchId = payload.metadata?.matchId;

    if (supporterAddress && matchId) {
      // This is a supporter-specific close with pre-encoded calldata containing their positionId
      this.logger.log(
        `Processing supporter-specific close: supporter=${supporterAddress}, match=${matchId}`
      );

      try {
        await this.copyEngine.executeCopyTrades({
          monachadAddress: payload.monachadAddress.toLowerCase(),
          matchId: matchId,
          originalTrade: payload.trade, // Contains closePosition(supporterPositionId, assetId)
          metadata: payload.metadata, // Includes supporterAddress for filtering
        });
        this.logger.log(
          `Supporter-specific close executed for ${supporterAddress} in match ${matchId}`
        );
      } catch (error) {
        this.logger.error(
          `Failed to execute supporter close for ${supporterAddress}`,
          error
        );
      }

      // Emit frontend event for this specific close
      try {
        this.eventEmitter.emit('monachad.trade', {
          matchId: matchId,
          monachadAddress: payload.monachadAddress,
          supporterAddress: supporterAddress,
          tradeType: "CLOSE",
          dex: payload.metadata?.dex || "",
          amount: payload.trade?.value || "",
          positionId: payload.metadata?.supporterPositionId,
          exitPrice: payload.metadata?.exitPrice,
          pnl: payload.metadata?.pnl,
          transactionHash: payload.metadata?.transactionHash || "",
          timestamp: Date.now(),
        });
      } catch (error) {
        this.logger.error("Failed to emit supporter close event", error);
      }

      return; // Done - this was a supporter-specific webhook
    }

    // Legacy path: Monachad close without supporter-specific webhooks
    // (Shouldn't happen with new indexer, but keep for backwards compatibility)
    const matches = await this.matchesService.getActiveMatchesForMonachad(
      payload.monachadAddress
    );

    if (matches.length === 0) {
      this.logger.warn(
        `No active matches found for Monachad ${payload.monachadAddress}`
      );
      return;
    }

    this.logger.log(
      `Found ${matches.length} active match(es), executing close trades`
    );

    const preferredMatchIdClose = payload.metadata?.matchId;
    if (preferredMatchIdClose) {
      this.logger.log(`Webhook includes metadata.matchId=${preferredMatchIdClose}, will emit only to that match if present`);
    }

    // Collect Monachad trade events for batch emit (close)
    const monachadTradeEvents = matches
      .filter((match) => !preferredMatchIdClose || String(match.matchId) === String(preferredMatchIdClose))
      .map((match) => ({
        matchId: match.matchId,
        monachadAddress: payload.monachadAddress,
        tradeType: "CLOSE",
        dex: payload.metadata?.dex || "",
        amount: payload.trade?.value || "",
        positionType: payload.metadata?.positionType,
        leverage: payload.metadata?.leverage,
        assetId: payload.metadata?.assetId,
        positionId: payload.metadata?.monachadPositionId,
        exitPrice: payload.metadata?.exitPrice,
        pnl: payload.metadata?.pnl,
        matchVaultAddress: payload.metadata?.matchVaultAddress,
        transactionHash: payload.metadata?.transactionHash || "",
        timestamp: Date.now(),
      }));

    if (monachadTradeEvents.length === 0) {
      this.logger.log(`No matching active matches after applying metadata.matchId filter (preferred=${preferredMatchIdClose})`);
    }

    try {
      // Emit Monachad trade events to frontend via EventEmitter
      this.logger.log("Emitting Monachad trade events to frontend");
      if (monachadTradeEvents.length === 1) {
        this.eventEmitter.emit('monachad.trade', monachadTradeEvents[0]);
      } else if (monachadTradeEvents.length > 1) {
        this.eventEmitter.emit('monachad.batchTrades', monachadTradeEvents);
      }
    } catch (error) {
      this.logger.error(
        "WebhookController.handleTradeClosed: Failed to emit Monachad trade events",
        error
      );
    }

    // Execute close trades for each match
    for (const match of matches) {
      try {
        await this.copyEngine.executeCopyTrades({
          monachadAddress: payload.monachadAddress.toLowerCase(),
          matchId: match.matchId,
          originalTrade: payload.trade, // Pass through pre-encoded close trade
          metadata: payload.metadata,
        });
        this.logger.log(`Close trade executed for match ${match.matchId}`);
      } catch (error) {
        this.logger.error(
          `Failed to execute close trade for match ${match.matchId}`,
          error
        );
      }
    }
  }

  /**
   * Validate webhook signature using HMAC-SHA256
   */
  private validateSignature(payload: string, signature: string): boolean {
    const hmac = createHmac("sha256", this.webhookSecret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");
    return signature === expectedSignature;
  }
}
