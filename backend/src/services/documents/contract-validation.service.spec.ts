import { BadRequestException } from '@nestjs/common';
import { ContractValidationService } from './contract-validation.service';
import { DocumentExtractionContractService } from './document-extraction-contract.service';
import { DocumentRegistry } from './document-registry';
import { ExtractionAuditService } from './extraction-audit.service';
import { DOCUMENT_TYPE } from './documents.constants';

describe('ContractValidationService', () => {
  let service: ContractValidationService;
  let audit: jest.Mocked<ExtractionAuditService>;

  beforeEach(() => {
    audit = {
      logValidationResult: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ExtractionAuditService>;

    service = new ContractValidationService(
      new DocumentExtractionContractService(new DocumentRegistry()),
      audit,
    );
  });

  it('validates inventory import payload', () => {
    const normalized = service.validateAndNormalize(
      {
        document_type: DOCUMENT_TYPE.INVENTORY_IMPORT,
        items: [{ name: 'Cement', quantity: 10 }],
      },
      DOCUMENT_TYPE.INVENTORY_IMPORT,
    );

    expect(normalized.document_type).toBe(DOCUMENT_TYPE.INVENTORY_IMPORT);
    expect(normalized.items).toHaveLength(1);
  });

  it('rejects invalid document type', () => {
    expect(() =>
      service.validateAndNormalize(
        { document_type: 'NOT_A_TYPE', items: [{ name: 'X' }] },
        'NOT_A_TYPE',
        { document_id: 1, factory_id: 1 },
      ),
    ).toThrow(BadRequestException);
  });
});
