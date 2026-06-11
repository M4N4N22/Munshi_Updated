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
  INTENT_TYPES,
  SUGGESTION_TYPES,
  WORKFLOW_TYPES,
} from '../../contracts/typescript/index';
import { COMMANDS } from 'src/modules/whatsapp/whatsapp.constants';

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
    expect(WORKFLOW_START_COMMANDS.TASK_INVENTORY_CREATION).toBe(
      '/task_inventory_nl',
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
        '/business_discovery',
        '/continue_discovery',
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

  it('intent-types.json is v1.1 with 30 slash intents plus general_chat', () => {
    const contract = readJson('intent-types.json') as {
      version: string;
      intents: string[];
    };
    expect(contract.version).toBe('v1.1');
    const slashIntents = contract.intents.filter((i) => i.startsWith('/'));
    expect(slashIntents).toHaveLength(30);
    expect(contract.intents).toContain('general_chat');
    expect(INTENT_TYPES).toEqual(contract.intents);
  });

  it('v1.1 gap intents are present in contract', () => {
    const intents = readJson('intent-types.json').intents as string[];
    [
      '/assign_delivery',
      '/task_inventory_nl',
      '/inventory_import_csv',
      '/suggestion_approve',
      '/cancel',
    ].forEach((intent) => expect(intents).toContain(intent));
  });

  it('COMMANDS slash strings are represented in intent contract', () => {
    const intents = new Set(readJson('intent-types.json').intents as string[]);
    Object.values(COMMANDS).forEach((command) => {
      expect(intents.has(command)).toBe(true);
    });
  });

  it('discovery_phrases do not include import inventory collision', () => {
    const phrases = readJson('intent-types.json').discovery_phrases as string[];
    expect(phrases).not.toContain('import inventory');
  });
});
