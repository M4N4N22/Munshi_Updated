import { readFileSync } from 'fs';
import { join } from 'path';
import { DocumentProcessingOrchestrator } from 'src/services/documents/document-processing.orchestrator';
import { ContractValidationService } from 'src/services/documents/contract-validation.service';
import { DOCUMENT_TYPE, DOCUMENT_STATUS } from 'src/services/documents/documents.constants';

describe('Document ingestion e2e scenarios (mocked ML)', () => {
  const scenariosPath = join(process.cwd(), 'test', 'fixtures', 'e2e-scenarios.json');

  const scenarios = JSON.parse(readFileSync(scenariosPath, 'utf-8')) as Array<{
    id: string;
    name: string;
    document_type?: string;
    fixture_id?: string;
    expected_failure_step?: string;
    steps: string[];
  }>;

  const documentScenarios = scenarios.filter((s) => s.steps.includes('parse'));

  it('loads at least 10 end-to-end scenarios', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(10);
  });

  documentScenarios.forEach((scenario) => {
    it(`${scenario.id}: ${scenario.name}`, async () => {
      const repository = {
        findDocumentById: jest.fn().mockResolvedValue({
          id: 1,
          factory_id: 1,
          storage_ref: 'local://1/file.csv',
          file_name: 'file.csv',
          mime_type: 'text/csv',
          document_type: scenario.document_type,
        }),
        createJob: jest.fn().mockResolvedValue({ id: 1 }),
        updateDocument: jest.fn(),
        updateJob: jest.fn(),
        createExtraction: jest.fn().mockResolvedValue({ id: 9 }),
      } as any;

      const parser = {
        parse: jest.fn().mockImplementation(async () => {
          if (scenario.expected_failure_step === 'parse') {
            throw new Error('parse failed');
          }
          return {
            document_type_detected: scenario.document_type,
            payload: {
              document_type: scenario.document_type,
              items: [{ name: 'Cement', quantity: 1 }],
            },
          };
        }),
      } as any;

      const contractValidation = {
        validateAndNormalize: jest.fn().mockImplementation((payload) => payload),
      } as unknown as ContractValidationService;

      const orchestrator = new DocumentProcessingOrchestrator(
        repository,
        { read: jest.fn().mockResolvedValue(Buffer.from('x')) } as any,
        parser,
        contractValidation,
        {
          generateFromExtraction: jest.fn().mockResolvedValue({ suggestions: [{ id: 1 }] }),
        } as any,
        { initializeQueue: jest.fn() } as any,
        { startQueueForDocument: jest.fn().mockResolvedValue({ started: true }) } as any,
        { contributeFromDocument: jest.fn().mockResolvedValue(undefined) } as any,
      );

      if (scenario.expected_failure_step === 'parse') {
        await expect(orchestrator.processDocument(1, 1)).rejects.toThrow();
        expect(repository.updateDocument).toHaveBeenCalledWith(
          1,
          1,
          expect.objectContaining({ status: DOCUMENT_STATUS.FAILED }),
        );
        return;
      }

      const result = await orchestrator.processDocument(1, 1);
      expect(result.extraction_id).toBe(9);
      expect(parser.parse).toHaveBeenCalled();
      expect(contractValidation.validateAndNormalize).toHaveBeenCalled();
      if (scenario.document_type === DOCUMENT_TYPE.INVENTORY_IMPORT) {
        expect(result.suggestion_ids.length).toBeGreaterThan(0);
      }
    });
  });
});
