import { BusinessDiscoveryDocumentService } from './business-discovery-document.service';
import { DISCOVERY_BUCKET } from './business-discovery.constants';
import { DOCUMENT_TYPE } from 'src/services/documents/documents.constants';

describe('BusinessDiscoveryDocumentService', () => {
  let service: BusinessDiscoveryDocumentService;
  let discoveryService: {
    bumpBucketCompletion: jest.Mock;
    markCompletedIfReady: jest.Mock;
  };

  beforeEach(() => {
    discoveryService = {
      bumpBucketCompletion: jest.fn().mockResolvedValue(undefined),
      markCompletedIfReady: jest.fn().mockResolvedValue(undefined),
    };
    service = new BusinessDiscoveryDocumentService(discoveryService as any);
  });

  it('boosts inventory bucket from inventory import documents', async () => {
    await service.contributeFromDocument(3, DOCUMENT_TYPE.INVENTORY_IMPORT, [
      'INITIAL_INVENTORY_IMPORT',
    ]);

    expect(discoveryService.bumpBucketCompletion).toHaveBeenCalledWith(
      3,
      DISCOVERY_BUCKET.INVENTORY_DISCOVERY,
      expect.any(Number),
    );
    expect(discoveryService.markCompletedIfReady).toHaveBeenCalledWith(3);
  });

  it('skips future buckets like bookkeeping', async () => {
    await service.contributeFromDocument(3, 'LEDGER_EXPORT', []);

    expect(discoveryService.bumpBucketCompletion).not.toHaveBeenCalled();
  });
});
