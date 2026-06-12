import { randomUUID } from 'crypto';
import {
  CLASSIFICATION_OUTCOME,
  type ClassificationOutcome,
  type InboundPath,
} from './intent-observability.constants';
import { hashMessage, hashPhone, redactMessage } from './intent-observability.utils';

export interface IntentObservabilitySession {
  traceId: string;
  eventId: string;
  phone: string;
  phoneHash: string;
  message: string;
  rawHash: string;
  rawRedacted: string;
  rawLength: number;
  providerMessageId?: string;
  inboundPath: InboundPath;
  predictedIntent?: string | null;
  classificationStage?: string | null;
  llmInvoked: boolean;
  llmRawIntent?: string | null;
  postRuleApplied: string[];
  classificationLatencyMs?: number | null;
  workerSlug?: string | null;
  departSlug?: string | null;
  taskId?: number | null;
  taskDescription?: string | null;
  deadline?: string | null;
  commandExecuted?: string | null;
  outcome: ClassificationOutcome;
  outcomeDetail?: string | null;
  factoryId?: number | null;
  userId?: number | null;
  userRole?: string | null;
  roleBlock: boolean;
  workflowStarted: boolean;
  workflowId?: number | null;
  isGeneralChat: boolean;
  startedAt: Date;
}

export function createObservabilitySession(input: {
  phone: string;
  message: string;
  providerMessageId?: string;
  inboundPath: InboundPath;
}): IntentObservabilitySession {
  const msg = input.message ?? '';
  return {
    traceId: randomUUID(),
    eventId: randomUUID(),
    phone: input.phone,
    phoneHash: hashPhone(input.phone),
    message: msg,
    rawHash: hashMessage(msg),
    rawRedacted: redactMessage(msg),
    rawLength: msg.length,
    providerMessageId: input.providerMessageId,
    inboundPath: input.inboundPath,
    llmInvoked: false,
    postRuleApplied: [],
    outcome: CLASSIFICATION_OUTCOME.SUCCESS,
    roleBlock: false,
    workflowStarted: false,
    isGeneralChat: false,
    startedAt: new Date(),
  };
}
