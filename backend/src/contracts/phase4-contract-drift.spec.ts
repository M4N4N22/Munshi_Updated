import * as fs from 'fs';
import * as path from 'path';
import { TASK_KINDS as BACKEND_TASK_KINDS } from '../../contracts/typescript/index';
import {
  WORKFLOW_TYPE,
  WORKFLOW_START_COMMANDS,
} from 'src/services/workflow/workflow.constants';
import {
  DisambiguationPayload,
  InventoryCandidate,
  ResolvedTaskInventoryIntent,
  WorkerCandidate,
} from 'src/services/task-inventory-resolution/task-inventory-resolution.interfaces';
import {
  BACKEND_CONTRACTS_ROOT,
  ML_CONTRACTS_ROOT,
  enumValuesWithoutNull,
  extractPythonLiteralEnum,
  extractTsConstArray,
  readContractJson,
  readTextContract,
  schemaPropertyNames,
  schemaRequiredFields,
  sortedStringArray,
} from './contract-drift.helpers';

describe('Phase 4 contract drift detection', () => {
  const backendTs = readTextContract('typescript/index.ts', BACKEND_CONTRACTS_ROOT);
  const mlTs = readTextContract('typescript/index.ts', ML_CONTRACTS_ROOT);
  const backendModelsPy = readTextContract('python/models.py', BACKEND_CONTRACTS_ROOT);
  const mlModelsPy = readTextContract('python/models.py', ML_CONTRACTS_ROOT);

  describe('TaskInventoryExtraction — JSON schema parity', () => {
    const schemaPath = 'schemas/task-inventory-extraction.json';

    it('backend and ML extraction schemas are identical', () => {
      const backend = readContractJson(schemaPath, BACKEND_CONTRACTS_ROOT);
      const ml = readContractJson(schemaPath, ML_CONTRACTS_ROOT);
      expect(backend).toEqual(ml);
    });

    it('requires all four contract keys', () => {
      const schema = readContractJson(schemaPath, BACKEND_CONTRACTS_ROOT);
      expect(schemaRequiredFields(schema)).toEqual([
        'assignee_hint',
        'item_name_or_sku',
        'quantity',
        'task_kind',
      ]);
    });

    it('forbids additional properties', () => {
      const schema = readContractJson(schemaPath, BACKEND_CONTRACTS_ROOT);
      expect(schema.additionalProperties).toBe(false);
    });

    it('task_kind enum matches task-kinds catalog', () => {
      const schema = readContractJson(schemaPath, BACKEND_CONTRACTS_ROOT);
      const props = schema.properties as Record<string, Record<string, unknown>>;
      const catalog = sortedStringArray(
        readContractJson('task-kinds.json', BACKEND_CONTRACTS_ROOT).task_kinds,
      );
      expect(enumValuesWithoutNull(props.task_kind)).toEqual(catalog);
    });
  });

  describe('TaskInventoryExtraction — TypeScript parity', () => {
    it('backend and ML TASK_KINDS arrays match', () => {
      const backendKinds = extractTsConstArray(backendTs, 'TASK_KINDS');
      const mlKinds = extractTsConstArray(mlTs, 'TASK_KINDS');
      expect(backendKinds).toEqual(mlKinds);
    });

    it('TASK_KINDS matches task-kinds.json in both repos', () => {
      const catalog = sortedStringArray(
        readContractJson('task-kinds.json', BACKEND_CONTRACTS_ROOT).task_kinds,
      );
      expect([...BACKEND_TASK_KINDS].sort()).toEqual(catalog);
      expect(extractTsConstArray(backendTs, 'TASK_KINDS')).toEqual(catalog);
      expect(extractTsConstArray(mlTs, 'TASK_KINDS')).toEqual(catalog);
    });

    it('backend TASK_KINDS matches shared contract export', () => {
      expect([...BACKEND_TASK_KINDS].sort()).toEqual(
        extractTsConstArray(backendTs, 'TASK_KINDS'),
      );
    });
  });

  describe('TaskInventoryExtraction — Python parity', () => {
    it('backend and ML models.py TaskInventoryExtraction blocks match', () => {
      expect(backendModelsPy).toBe(mlModelsPy);
    });

    it('Python task_kind Literal matches task-kinds catalog', () => {
      const catalog = sortedStringArray(
        readContractJson('task-kinds.json', BACKEND_CONTRACTS_ROOT).task_kinds,
      );
      expect(extractPythonLiteralEnum(backendModelsPy, 'task_kind')).toEqual(
        catalog,
      );
      expect(extractPythonLiteralEnum(mlModelsPy, 'task_kind')).toEqual(catalog);
    });

    it('document_types.py loads TASK_KINDS from JSON in both repos', () => {
      const backendDocTypes = readTextContract(
        'python/document_types.py',
        BACKEND_CONTRACTS_ROOT,
      );
      const mlDocTypes = readTextContract(
        'python/document_types.py',
        ML_CONTRACTS_ROOT,
      );
      expect(backendDocTypes).toContain('TASK_KINDS = _task_kinds["task_kinds"]');
      expect(mlDocTypes).toContain('TASK_KINDS = _task_kinds["task_kinds"]');
    });
  });

  describe('TaskInventoryResolution — DTO and response parity', () => {
    const requestSchema = readContractJson(
      'schemas/task-inventory-resolve-request.json',
    );
    const responseSchema = readContractJson(
      'schemas/task-inventory-resolution.json',
    );
    const extractionSchema = readContractJson(
      'schemas/task-inventory-extraction.json',
    );

    it('request schema requires factory_id and extraction', () => {
      expect(schemaRequiredFields(requestSchema)).toEqual([
        'extraction',
        'factory_id',
      ]);
    });

    it('request extraction fields match TaskInventoryExtractionDto keys', () => {
      const dtoKeys = [
        'assignee_hint',
        'item_name_or_sku',
        'quantity',
        'task_kind',
      ];
      const extractionKeys = schemaPropertyNames(extractionSchema);
      expect(extractionKeys).toEqual(dtoKeys);
    });

    it('response schema required top-level fields match ResolvedTaskInventoryIntent', () => {
      const interfaceKeys: (keyof ResolvedTaskInventoryIntent)[] = [
        'task_kind',
        'quantity',
        'inventory',
        'worker',
        'disambiguation',
      ];
      expect(schemaRequiredFields(responseSchema).sort()).toEqual(
        [...interfaceKeys].sort(),
      );
    });

    it('disambiguation payload types match interface union', () => {
      const defs = responseSchema.definitions as Record<
        string,
        Record<string, unknown>
      >;
      const payload = defs.disambiguationPayload as Record<string, unknown>;
      const props = payload.properties as Record<string, Record<string, unknown>>;
      expect(props.type.enum).toEqual([
        'inventory_disambiguation',
        'worker_disambiguation',
      ]);
    });

    it('sample resolved intent satisfies response schema shape', () => {
      const sample: ResolvedTaskInventoryIntent = {
        task_kind: 'delivery',
        quantity: 20,
        inventory: {
          status: 'resolved',
          item_id: 10,
          sku: 'CEMENT_50KG',
          name: 'Cement 50kg',
          match_type: 'partial',
        },
        worker: {
          status: 'resolved',
          user_id: 1,
          name: 'Ram Kumar',
          match_type: 'partial',
        },
        disambiguation: [],
      };
      expect(Object.keys(sample).sort()).toEqual(
        schemaRequiredFields(responseSchema).sort(),
      );
    });

    it('inventory and worker candidate shapes match interfaces', () => {
      const inventoryCandidate: InventoryCandidate = {
        item_id: 1,
        sku: 'A',
        name: 'Cement',
        match_type: 'partial',
      };
      const workerCandidate: WorkerCandidate = {
        user_id: 2,
        name: 'Ram',
        match_type: 'exact',
      };
      const disambiguation: DisambiguationPayload = {
        type: 'inventory_disambiguation',
        candidates: ['Cement 50kg'],
      };
      expect(inventoryCandidate).toHaveProperty('item_id');
      expect(workerCandidate).toHaveProperty('user_id');
      expect(disambiguation.type).toMatch(/disambiguation$/);
    });
  });

  describe('Task kinds — catalog governance', () => {
    it('task-kinds.json is identical in backend and ML', () => {
      const backend = readContractJson('task-kinds.json', BACKEND_CONTRACTS_ROOT);
      const ml = readContractJson('task-kinds.json', ML_CONTRACTS_ROOT);
      expect(backend).toEqual(ml);
    });

    it('task-kinds version is v1 in both repos', () => {
      expect(readContractJson('task-kinds.json').version).toBe('v1');
      expect(readContractJson('task-kinds.json', ML_CONTRACTS_ROOT).version).toBe(
        'v1',
      );
    });

    it('orchestrator imports shared TASK_KINDS catalog', () => {
      const orchestrator = fs.readFileSync(
        path.join(
          process.cwd(),
          'src/services/task-inventory-resolution/task-inventory-nl.orchestrator.ts',
        ),
        'utf-8',
      );
      expect(orchestrator).toContain('TASK_KINDS');
    });
  });

  describe('Workflow types — JSON and registry parity', () => {
    const backendWorkflow = readContractJson(
      'workflow-types.json',
      BACKEND_CONTRACTS_ROOT,
    );
    const mlWorkflow = readContractJson('workflow-types.json', ML_CONTRACTS_ROOT);

    it('backend and ML workflow-types.json are identical', () => {
      expect(backendWorkflow).toEqual(mlWorkflow);
    });

    it('WORKFLOW_TYPE constants match workflow-types.json types', () => {
      const jsonTypes = sortedStringArray(backendWorkflow.types);
      expect(sortedStringArray(Object.values(WORKFLOW_TYPE))).toEqual(jsonTypes);
    });

    it('WORKFLOW_START_COMMANDS match workflow-types.json start_commands', () => {
      const jsonCommands = backendWorkflow.start_commands as Record<string, string>;
      Object.entries(WORKFLOW_START_COMMANDS).forEach(([key, command]) => {
        expect(jsonCommands[key]).toBe(command);
      });
    });

    it('TypeScript WORKFLOW_TYPES match workflow-types.json in both repos', () => {
      const jsonTypes = sortedStringArray(backendWorkflow.types);
      expect(extractTsConstArray(backendTs, 'WORKFLOW_TYPES')).toEqual(jsonTypes);
      expect(extractTsConstArray(mlTs, 'WORKFLOW_TYPES')).toEqual(jsonTypes);
    });

    it('every WORKFLOW_TYPE has a registered handler', () => {
      const handlersDir = path.join(
        process.cwd(),
        'src/services/workflow/handlers',
      );
      const handlerSources = fs
        .readdirSync(handlersDir)
        .filter((file) => file.endsWith('.handler.ts'))
        .map((file) =>
          fs.readFileSync(path.join(handlersDir, file), 'utf-8'),
        )
        .join('\n');
      Object.values(WORKFLOW_TYPE).forEach((type) => {
        expect(handlerSources).toContain(type);
      });
    });

    it('TASK_INVENTORY_CREATION workflow is registered with internal start command', () => {
      expect(WORKFLOW_TYPE.TASK_INVENTORY_CREATION).toBe('TASK_INVENTORY_CREATION');
      expect(WORKFLOW_START_COMMANDS.TASK_INVENTORY_CREATION).toBe(
        '/task_inventory_nl',
      );
      const jsonCommands = backendWorkflow.start_commands as Record<string, string>;
      expect(jsonCommands.TASK_INVENTORY_CREATION).toBe('/task_inventory_nl');
    });
  });

  describe('Phase 4 drift guard rails (failure simulation)', () => {
    const REQUIRED_EXTRACTION_FIELDS = [
      'item_name_or_sku',
      'quantity',
      'assignee_hint',
      'task_kind',
    ];

    it('fails when extraction required field is removed from schema', () => {
      const schema = readContractJson('schemas/task-inventory-extraction.json');
      REQUIRED_EXTRACTION_FIELDS.forEach((field) => {
        expect(schemaRequiredFields(schema)).toContain(field);
      });
    });

    it('fails when task_kind enum loses delivery/issue/inventory_count', () => {
      const schema = readContractJson('schemas/task-inventory-extraction.json');
      const props = schema.properties as Record<string, Record<string, unknown>>;
      expect(enumValuesWithoutNull(props.task_kind)).toEqual([
        'delivery',
        'inventory_count',
        'issue',
      ]);
    });

    it('fails when TASK_INVENTORY_CREATION removed from workflow-types.json', () => {
      const types = readContractJson('workflow-types.json').types as string[];
      expect(types).toContain('TASK_INVENTORY_CREATION');
    });

    it('fails when workflow start command drifts for TASK_INVENTORY_CREATION', () => {
      const commands = readContractJson('workflow-types.json')
        .start_commands as Record<string, string>;
      expect(commands.TASK_INVENTORY_CREATION).toBe('/task_inventory_nl');
    });

    it('fails when resolution response loses disambiguation array', () => {
      const schema = readContractJson('schemas/task-inventory-resolution.json');
      expect(schemaRequiredFields(schema)).toContain('disambiguation');
    });

    it('fails when backend/ML task-kinds.json diverge', () => {
      const backend = readContractJson('task-kinds.json', BACKEND_CONTRACTS_ROOT);
      const ml = readContractJson('task-kinds.json', ML_CONTRACTS_ROOT);
      expect(backend).toEqual(ml);
    });

    it('fails when ML TypeScript WORKFLOW_TYPES omits TASK_INVENTORY_CREATION', () => {
      expect(extractTsConstArray(mlTs, 'WORKFLOW_TYPES')).toContain(
        'TASK_INVENTORY_CREATION',
      );
    });
  });
});
