# BullMQ Patterns

## Files

- `backend/src/modules/prediction-market/constants/queues.constants.ts`
- `backend/src/modules/prediction-market/types/prediction-job.type.ts`
- `backend/src/modules/prediction-market/processors/prediction-contract.processor.ts`
- `backend/src/modules/indexer/constants/indexer-queue.constants.ts`
- `backend/src/modules/indexer/processor/prediction-indexer.processor.ts`

## Queue Constants

```ts
export const CONTRACT_CALL_QUEUE = 'contract-call-queue';
```

```ts
export const INDEXER_QUEUE_PREDICTION_MARKET = 'indexer:prediction-market';
```

## Job Types (Prediction Market)

```ts
export const PREDICTION_MARKET_JOBS = {
  CREATE_MARKET: 'create-market',
  PROPOSE_OUTCOME: 'propose-outcome',
} as const;

export interface CreateMarketJob {
  battleId: string;
  matchId: string;
  questionId: string;
}

export interface ProposeOutcomeJob {
  battleId: string;
  matchId: string;
  outcome: number;
  dataHash: string;
  questionId: string;
  codeCommitHash: string;
}
```

## Enqueuing Pattern

```ts
@Injectable()
export class PredictionMarketService {
  constructor(
    @InjectQueue(CONTRACT_CALL_QUEUE)
    private readonly contractCallQueue: Queue,
  ) {}

  async enqueueCreateMarket(params: CreateMarketJob): Promise<void> {
    const jobId = `prediction-market:create:${params.matchId}`;
    await this.contractCallQueue.add(
      PREDICTION_MARKET_JOBS.CREATE_MARKET,
      params,
      { jobId },
    );
  }
}
```

## Processor Pattern

```ts
@Processor(CONTRACT_CALL_QUEUE)
export class PredictionContractProcessor {
  constructor(
    private readonly predictionContractService: PredictionContractService,
  ) {}

  @Process(PREDICTION_MARKET_JOBS.CREATE_MARKET)
  async handleCreateMarket(job: Job<CreateMarketJob>) {
    // ... send onchain tx
  }
}
```

## Worker Separation

- `AppModule` registers `BullModule.forRootAsync(...)` and acts as the **producer**.
- `WorkerModule` runs `IndexerModule` and `PredictionMarketModule` processors as **consumers**.
- This prevents long-running indexing jobs from blocking API requests.
