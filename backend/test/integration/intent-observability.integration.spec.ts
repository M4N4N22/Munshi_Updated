/**
 * Intent observability I1–I5 — persistence + retry + KPI integration.
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from 'src/core/services/db-service/db.module';
import { DbService } from 'src/core/services/db-service/db.service';
import { IntentObservabilityModule } from 'src/services/intent-observability/intent-observability.module';
import { IntentObservabilityService } from 'src/services/intent-observability/intent-observability.service';
import {
  CLASSIFICATION_OUTCOME,
  INBOUND_PATH,
} from 'src/services/intent-observability/intent-observability.constants';
import { migrationStatusJson, probePostgres, runMigrations } from './helpers/db-env';

describe('Intent observability integration', () => {
  let dbUp = false;
  let app: INestApplication;
  let observability: IntentObservabilityService;
  let dbService: DbService;

  beforeAll(async () => {
    dbUp = await probePostgres();
    if (!dbUp) return;
    runMigrations();
    const status = migrationStatusJson();
    if (status.pending_count > 0) {
      throw new Error(`Migrations pending: ${status.pending_count}`);
    }

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DbModule,
        IntentObservabilityModule,
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    observability = module.get(IntentObservabilityService);
    dbService = module.get(DbService);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('persists classification event without raw phone', async () => {
    if (!dbUp) return;
    const phone = `9199${Date.now().toString().slice(-8)}`;
    const session = observability.createSession({
      phone,
      message: 'stock level dikhao',
      inboundPath: INBOUND_PATH.ML_FALLBACK,
    });
    session.factoryId = 3;
    session.predictedIntent = '/inventory_status';
    session.outcome = CLASSIFICATION_OUTCOME.SUCCESS;

    await (observability as any).persistSessionAsync(session);

    const row = await dbService.sqlService.IntentClassificationEvent.findOne({
      where: { event_id: session.eventId },
    });
    expect(row).toBeTruthy();
    expect(row?.predicted_intent).toBe('/inventory_status');
    expect(row?.raw_redacted).toContain('stock');
    expect(JSON.stringify(row)).not.toContain(phone);
  });

  it('detects retry_within_60s on second message', async () => {
    if (!dbUp) return;
    const phone = `9198${Date.now().toString().slice(-8)}`;

    const first = observability.createSession({
      phone,
      message: 'hello munshi',
      inboundPath: INBOUND_PATH.OWNER_HOME_TRIGGER,
    });
    first.outcome = CLASSIFICATION_OUTCOME.GENERAL_CHAT_ROUTED;
    first.isGeneralChat = true;
    await (observability as any).persistSessionAsync(first);
    await new Promise((r) => setTimeout(r, 50));

    const second = observability.createSession({
      phone,
      message: 'mere tasks dikhao',
      inboundPath: INBOUND_PATH.ML_FALLBACK,
    });
    second.outcome = CLASSIFICATION_OUTCOME.SUCCESS;
    second.predictedIntent = '/tasks';
    await (observability as any).persistSessionAsync(second);

    const row = await dbService.sqlService.IntentClassificationEvent.findOne({
      where: { event_id: second.eventId },
    });
    expect(row?.retry_within_60s).toBe(true);
    expect(row?.retry_of_event_id).toBe(first.eventId);
  });

  it('returns KPI aggregates', async () => {
    if (!dbUp) return;
    const rates = await observability.getKpiRates({ factory_id: 3 });
    expect(rates).toHaveProperty('general_chat_rate');
    expect(rates).toHaveProperty('llm_usage_rate');
    expect(rates.total_events).toBeGreaterThanOrEqual(0);
  });
});
