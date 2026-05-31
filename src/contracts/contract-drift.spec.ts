import * as fs from 'fs';
import * as path from 'path';
import { DOCUMENT_TYPE, SUGGESTION_TYPE } from 'src/services/documents/documents.constants';
import { SUGGESTION_APPROVAL_COMMAND } from 'src/services/documents/documents.constants';
import {
  WORKFLOW_TYPE,
  WORKFLOW_START_COMMANDS,
} from 'src/services/workflow/workflow.constants';
import {
  DOCUMENT_TYPES,
  SUGGESTION_TYPES,
  WORKFLOW_TYPES,
} from '../../contracts/typescript/index';

describe('Shared contract drift detection', () => {
  const contractsRoot = path.join(process.cwd(), 'contracts');

  function readJson(relativePath: string) {
    return JSON.parse(
      fs.readFileSync(path.join(contractsRoot, relativePath), 'utf-8'),
    );
  }

  it('document types match backend constants', () => {
    Object.values(DOCUMENT_TYPE).forEach((value) => {
      expect(DOCUMENT_TYPES).toContain(value);
    });
  });

  it('suggestion types match backend constants', () => {
    Object.values(SUGGESTION_TYPE).forEach((value) => {
      expect(SUGGESTION_TYPES).toContain(value);
    });
  });

  it('workflow types match backend workflow constants', () => {
    Object.values(WORKFLOW_TYPE).forEach((value) => {
      expect(WORKFLOW_TYPES).toContain(value);
    });
  });

  it('workflow start commands remain registered', () => {
    expect(WORKFLOW_START_COMMANDS.ONBOARD_VENDOR).toBe('/onboard_vendor');
    expect(WORKFLOW_START_COMMANDS.ONBOARD_WORKER).toBe('/onboard_worker');
    expect(WORKFLOW_START_COMMANDS.INVENTORY_CREATE).toBe('/inventory_create');
    expect(WORKFLOW_START_COMMANDS.PURCHASE_REQUEST_CREATE).toBe(
      '/purchase_request_create',
    );
    expect(SUGGESTION_APPROVAL_COMMAND).toBe('/suggestion_approve');
  });

  it('intent-types.json includes workflow intents', () => {
    const intents = readJson('intent-types.json').intents as string[];
    expect(intents).toEqual(
      expect.arrayContaining([
        '/onboard_vendor',
        '/onboard_worker',
        '/inventory_create',
        '/inventory_status',
        '/purchase_request_create',
      ]),
    );
  });

  it('extraction schemas require document_type and items', () => {
    const inventory = readJson('schemas/inventory-import-extraction.json');
    const stock = readJson('schemas/stock-register-extraction.json');
    expect(inventory.required).toEqual(
      expect.arrayContaining(['document_type', 'items']),
    );
    expect(stock.required).toEqual(
      expect.arrayContaining(['document_type', 'items']),
    );
    expect(inventory.properties.document_type.const).toBe('INVENTORY_IMPORT');
    expect(stock.properties.document_type.const).toBe('STOCK_REGISTER');
  });

  it('fails when a required workflow intent is removed from contract', () => {
    const intents = readJson('intent-types.json').intents as string[];
    const required = ['/onboard_vendor', '/inventory_status'];
    required.forEach((intent) => expect(intents).toContain(intent));
  });
});
