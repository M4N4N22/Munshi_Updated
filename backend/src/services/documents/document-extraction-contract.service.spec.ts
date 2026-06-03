import { BadRequestException } from '@nestjs/common';
import { DOCUMENT_TYPE } from './documents.constants';
import { DocumentExtractionContractService } from './document-extraction-contract.service';
import { DocumentRegistry } from './document-registry';

describe('DocumentExtractionContractService', () => {
  let service: DocumentExtractionContractService;

  beforeEach(() => {
    service = new DocumentExtractionContractService(new DocumentRegistry());
  });

  it('validates inventory import payload', () => {
    const result = service.validateExtractionPayload({
      document_type: DOCUMENT_TYPE.INVENTORY_IMPORT,
      items: [
        { name: 'Cement', quantity: 500 },
        { name: 'Steel Rod', quantity: 200 },
      ],
    });

    expect(result.items).toHaveLength(2);
    expect(result.items[0].name).toBe('Cement');
  });

  it('rejects empty items array', () => {
    expect(() =>
      service.validateExtractionPayload({ items: [] }),
    ).toThrow(BadRequestException);
  });

  it('rejects missing item name', () => {
    expect(() =>
      service.validateExtractionPayload({
        items: [{ quantity: 10 }],
      }),
    ).toThrow(BadRequestException);
  });
});
