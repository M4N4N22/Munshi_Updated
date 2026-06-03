import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MessagingService } from 'src/core/messaging/messaging.service';
import { UserService } from 'src/services/users/users.service';
import { WorkflowSessionService } from 'src/services/workflow/workflow-session.service';
import {
  SUGGESTION_APPROVAL_STEP,
  WORKFLOW_TYPE,
} from 'src/services/workflow/workflow.constants';
import { waSection } from 'src/modules/whatsapp/whatsapp.templates';
import {
  DOCUMENT_STATUS,
  SUGGESTION_STATUS,
} from './documents.constants';
import { DocumentRepository } from './documents.repository';
import { SuggestionQueueService } from './suggestion-queue.service';

@Injectable()
export class SuggestionWorkflowTriggerService {
  private readonly logger = new Logger(SuggestionWorkflowTriggerService.name);

  constructor(
    private readonly repository: DocumentRepository,
    private readonly queueService: SuggestionQueueService,
    private readonly workflowSessionService: WorkflowSessionService,
    private readonly userService: UserService,
    private readonly messagingService: MessagingService,
  ) {}

  async startQueueForDocument(documentId: number, factoryId: number) {
    const doc = await this.repository.findDocumentById(documentId, factoryId);
    if (!doc) {
      throw new NotFoundException(`Document #${documentId} not found`);
    }

    const phone = await this.resolveUploaderPhone(doc.uploaded_by);
    if (!phone) {
      this.logger.warn(
        `Document #${documentId} has no uploader phone — workflow not started`,
      );
      return { started: false, reason: 'no_uploader_phone' };
    }

    return this.startNextSuggestionWorkflow(documentId, factoryId, phone);
  }

  async onSuggestionResolved(
    documentId: number,
    factoryId: number,
    phone: string,
  ) {
    const { nextSuggestionId, completed } =
      await this.queueService.advanceQueue(documentId, factoryId);

    if (completed) {
      await this.repository.updateDocument(documentId, factoryId, {
        status: DOCUMENT_STATUS.APPROVED,
      });
      await this.messagingService.sendText(
        phone,
        waSection(
          'Document processing complete',
          'All suggestions for your document have been reviewed.',
        ),
      );
      return { completed: true };
    }

    if (nextSuggestionId != null) {
      await this.startWorkflowForSuggestion(
        documentId,
        factoryId,
        phone,
        nextSuggestionId,
      );
    }

    return { completed: false, nextSuggestionId };
  }

  private async startNextSuggestionWorkflow(
    documentId: number,
    factoryId: number,
    phone: string,
  ) {
    const suggestionId = await this.queueService.getCurrentSuggestionId(
      documentId,
      factoryId,
    );
    if (suggestionId == null) {
      return { started: false, reason: 'queue_empty' };
    }

    return this.startWorkflowForSuggestion(
      documentId,
      factoryId,
      phone,
      suggestionId,
    );
  }

  private async startWorkflowForSuggestion(
    documentId: number,
    factoryId: number,
    phone: string,
    suggestionId: number,
  ) {
    const suggestion = await this.repository.findSuggestionById(
      suggestionId,
      factoryId,
    );
    if (!suggestion || suggestion.status !== SUGGESTION_STATUS.PENDING) {
      return { started: false, reason: 'suggestion_not_pending' };
    }

    const active = await this.workflowSessionService.getActiveSession(phone);
    if (active) {
      this.logger.warn(
        `Phone ${phone} has active workflow — suggestion #${suggestionId} queued`,
      );
      return { started: false, reason: 'active_workflow_exists' };
    }

    const summary = String(
      (suggestion.payload as Record<string, unknown>).summary ??
        'Please confirm this suggestion.',
    );

    const session = await this.workflowSessionService.createSession({
      factory_id: factoryId,
      phone_number: phone,
      workflow_type: WORKFLOW_TYPE.SUGGESTION_APPROVAL,
      current_step: SUGGESTION_APPROVAL_STEP.CONFIRM,
      session_data: {
        suggestion_id: suggestion.id,
        document_id: documentId,
        summary,
      },
    });

    await this.repository.updateSuggestion(suggestionId, factoryId, {
      workflow_session_id: session.id,
    });

    await this.messagingService.sendText(phone, summary);

    return {
      started: true,
      suggestion_id: suggestionId,
      workflow_session_id: session.id,
    };
  }

  private async resolveUploaderPhone(
    uploadedBy?: number | null,
  ): Promise<string | null> {
    if (!uploadedBy) return null;
    try {
      const user = await this.userService.findOne(uploadedBy);
      return user.phone_number ?? null;
    } catch {
      return null;
    }
  }
}
