import { Injectable } from '@nestjs/common';
import {
  INVENTORY_CREATE_STEP,
  WORKFLOW_SKIP_KEYWORDS,
  WORKFLOW_START_COMMANDS,
  WORKFLOW_TYPE,
} from '../workflow.constants';
import {
  IInventoryCreateSessionData,
  IWorkflowHandler,
  IWorkflowSessionRecord,
  WorkflowStepResult,
  WorkflowUserContext,
} from '../workflow.interfaces';
import { InventoryService } from 'src/services/inventory/inventory.service';
import { waSection } from 'src/modules/whatsapp/whatsapp.templates';
import {
  formatNamedEntityList,
  formatQuantity,
  normalizeInventoryName,
  normalizeSku,
  normalizeUnit,
  parseNonNegativeThreshold,
  resolveNamedSelection,
} from 'src/services/inventory/inventory.validation';

@Injectable()
export class InventoryCreateWorkflowHandler implements IWorkflowHandler {
  readonly workflowType = WORKFLOW_TYPE.INVENTORY_CREATE;
  readonly startCommand = WORKFLOW_START_COMMANDS.INVENTORY_CREATE;
  readonly firstStep = INVENTORY_CREATE_STEP.ITEM_NAME;

  constructor(private readonly inventoryService: InventoryService) {}

  getInitialPrompt(): string {
    return waSection('Inventory item setup', 'What is the *item name*?');
  }

  async handleStep(
    session: IWorkflowSessionRecord,
    message: string,
    context: WorkflowUserContext,
  ): Promise<WorkflowStepResult> {
    const input = message.trim();
    const data = session.session_data as IInventoryCreateSessionData;

    switch (session.current_step) {
      case INVENTORY_CREATE_STEP.ITEM_NAME:
        return this.handleNameStep(session, input, data);
      case INVENTORY_CREATE_STEP.ITEM_SKU:
        return this.handleSkuStep(session, input, data, context);
      case INVENTORY_CREATE_STEP.ITEM_CATEGORY:
        return this.handleCategoryStep(session, input, data, context);
      case INVENTORY_CREATE_STEP.ITEM_LOCATION:
        return this.handleLocationStep(session, input, data, context);
      case INVENTORY_CREATE_STEP.ITEM_UNIT:
        return this.handleUnitStep(session, input, data);
      case INVENTORY_CREATE_STEP.ITEM_REORDER_THRESHOLD:
        return this.handleThresholdStep(session, input, data, context);
      default:
        return {
          message: waSection(
            'Workflow error',
            'This workflow step is not recognized. Please send /inventory_create to start again.',
          ),
          cancelled: true,
        };
    }
  }

  private handleNameStep(
    session: IWorkflowSessionRecord,
    input: string,
    data: IInventoryCreateSessionData,
  ): WorkflowStepResult {
    try {
      const name = normalizeInventoryName(input, 'Item name');
      return {
        message: 'What is the *SKU*?',
        nextStep: INVENTORY_CREATE_STEP.ITEM_SKU,
        sessionData: { ...data, name } as Record<string, unknown>,
      };
    } catch (error: any) {
      return this.validationError('What is the *item name*?', error?.message, session, data);
    }
  }

  private async handleSkuStep(
    session: IWorkflowSessionRecord,
    input: string,
    data: IInventoryCreateSessionData,
    context: WorkflowUserContext,
  ): Promise<WorkflowStepResult> {
    try {
      const sku = normalizeSku(input);
      const categories = await this.inventoryService.listCategories(
        context.factoryId,
        true,
      );
      const list = formatNamedEntityList(
        categories.map((c) => ({ id: c.id, name: c.name })),
        'No active categories found. Create a category via API first.',
      );
      if (categories.length === 0) {
        return {
          message: waSection('No categories', list),
          cancelled: true,
        };
      }
      return {
        message: waSection(
          'Category selection',
          `What is the *category*?\n\n${list}\n\nReply with category name or ID.`,
        ),
        nextStep: INVENTORY_CREATE_STEP.ITEM_CATEGORY,
        sessionData: { ...data, sku } as Record<string, unknown>,
      };
    } catch (error: any) {
      return this.validationError('What is the *SKU*?', error?.message, session, data);
    }
  }

  private async handleCategoryStep(
    session: IWorkflowSessionRecord,
    input: string,
    data: IInventoryCreateSessionData,
    context: WorkflowUserContext,
  ): Promise<WorkflowStepResult> {
    try {
      const categories = await this.inventoryService.listCategories(
        context.factoryId,
        true,
      );
      const list = formatNamedEntityList(
        categories.map((c) => ({ id: c.id, name: c.name })),
        'No active categories found. Create a category first, then run /inventory_create again.',
      );
      if (categories.length === 0) {
        return {
          message: waSection('No categories', list),
          cancelled: true,
        };
      }

      const selected = resolveNamedSelection(
        input,
        categories.map((c) => ({ id: c.id, name: c.name })),
        'category',
      );

      return {
        message: waSection(
          'Location selection',
          `What is the *location*?\n\n${formatNamedEntityList(
            (
              await this.inventoryService.listLocations(context.factoryId, true)
            ).map((l) => ({ id: l.id, name: l.name })),
            'No active locations found.',
          )}\n\nReply with location name or ID.`,
        ),
        nextStep: INVENTORY_CREATE_STEP.ITEM_LOCATION,
        sessionData: {
          ...data,
          category_id: selected.id,
        } as Record<string, unknown>,
      };
    } catch (error: any) {
      const categories = await this.inventoryService.listCategories(
        context.factoryId,
        true,
      );
      return this.validationError(
        `Select a category:\n\n${formatNamedEntityList(
          categories.map((c) => ({ id: c.id, name: c.name })),
          'No categories.',
        )}`,
        error?.message,
        session,
        data,
      );
    }
  }

  private async handleLocationStep(
    session: IWorkflowSessionRecord,
    input: string,
    data: IInventoryCreateSessionData,
    context: WorkflowUserContext,
  ): Promise<WorkflowStepResult> {
    try {
      const locations = await this.inventoryService.listLocations(
        context.factoryId,
        true,
      );
      if (locations.length === 0) {
        return {
          message: waSection(
            'No locations',
            'No active locations found. Create a location first, then run /inventory_create again.',
          ),
          cancelled: true,
        };
      }

      const selected = resolveNamedSelection(
        input,
        locations.map((l) => ({ id: l.id, name: l.name })),
        'location',
      );

      return {
        message: 'What is the *unit*? (e.g. bags, kg, pieces)',
        nextStep: INVENTORY_CREATE_STEP.ITEM_UNIT,
        sessionData: {
          ...data,
          location_id: selected.id,
        } as Record<string, unknown>,
      };
    } catch (error: any) {
      const locations = await this.inventoryService.listLocations(
        context.factoryId,
        true,
      );
      return this.validationError(
        `Select a location:\n\n${formatNamedEntityList(
          locations.map((l) => ({ id: l.id, name: l.name })),
          'No locations.',
        )}`,
        error?.message,
        session,
        data,
      );
    }
  }

  private handleUnitStep(
    session: IWorkflowSessionRecord,
    input: string,
    data: IInventoryCreateSessionData,
  ): WorkflowStepResult {
    try {
      const unit = normalizeUnit(input);
      return {
        message:
          'What is the *reorder threshold*?\n\nReply with a number or *SKIP* if not applicable.',
        nextStep: INVENTORY_CREATE_STEP.ITEM_REORDER_THRESHOLD,
        sessionData: { ...data, unit } as Record<string, unknown>,
      };
    } catch (error: any) {
      return this.validationError(
        'What is the *unit*?',
        error?.message,
        session,
        data,
      );
    }
  }

  private async handleThresholdStep(
    session: IWorkflowSessionRecord,
    input: string,
    data: IInventoryCreateSessionData,
    context: WorkflowUserContext,
  ): Promise<WorkflowStepResult> {
    let reorder_threshold: string | null = null;

    if (!WORKFLOW_SKIP_KEYWORDS.includes(input.trim().toLowerCase())) {
      try {
        reorder_threshold = formatQuantity(
          parseNonNegativeThreshold(input)!,
        );
      } catch (error: any) {
        return this.validationError(
          'What is the *reorder threshold*? Reply with a number or SKIP.',
          error?.message,
          session,
          data,
        );
      }
    }

    const finalData: IInventoryCreateSessionData = {
      ...data,
      reorder_threshold,
    };

    try {
      const item = await this.inventoryService.createItem({
        factory_id: context.factoryId,
        category_id: finalData.category_id!,
        location_id: finalData.location_id!,
        sku: finalData.sku!,
        name: finalData.name!,
        unit: finalData.unit!,
        reorder_threshold: finalData.reorder_threshold ?? undefined,
      });

      return {
        message: waSection(
          'Item created successfully',
          `*${item.name}* has been added to inventory.\n\n` +
            `🆔 Item #${item.id}\n` +
            `🏷️ SKU: ${item.sku}\n` +
            `📦 Unit: ${item.unit}\n` +
            `📊 Quantity: ${item.current_quantity} (use stock-in to add stock)` +
            (item.reorder_threshold
              ? `\n⚠️ Reorder at: ${item.reorder_threshold}`
              : ''),
        ),
        completed: true,
        sessionData: finalData as Record<string, unknown>,
      };
    } catch (error: any) {
      const msg = error?.message ?? 'Could not create item';
      if (msg.toLowerCase().includes('sku')) {
        return {
          message: waSection('Could not create item', `${msg}\n\nPlease send the *SKU* again.`),
          nextStep: INVENTORY_CREATE_STEP.ITEM_SKU,
          sessionData: { ...finalData, sku: undefined } as Record<string, unknown>,
        };
      }
      if (msg.toLowerCase().includes('category')) {
        return {
          message: waSection('Could not create item', `${msg}\n\nPlease select *category* again.`),
          nextStep: INVENTORY_CREATE_STEP.ITEM_CATEGORY,
          sessionData: { ...finalData, category_id: undefined } as Record<string, unknown>,
        };
      }
      return {
        message: waSection('Could not create item', msg),
        nextStep: session.current_step,
        sessionData: finalData as Record<string, unknown>,
      };
    }
  }

  private validationError(
    prompt: string,
    errorMessage: string | undefined,
    session: IWorkflowSessionRecord,
    data: IInventoryCreateSessionData,
  ): WorkflowStepResult {
    return {
      message: waSection(
        'Invalid input',
        `${errorMessage ?? 'Please check your input.'}\n\n${prompt}`,
      ),
      nextStep: session.current_step,
      sessionData: { ...data } as Record<string, unknown>,
    };
  }
}
