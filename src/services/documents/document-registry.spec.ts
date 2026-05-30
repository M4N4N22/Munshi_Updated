import { DocumentRegistry } from './document-registry';
import { DOCUMENT_TYPE } from './documents.constants';

describe('DocumentRegistry', () => {
  it('registers default document type contracts', () => {
    const registry = new DocumentRegistry();
    const types = registry.listDocumentTypes();

    expect(types.length).toBeGreaterThanOrEqual(6);
    expect(registry.isKnownType(DOCUMENT_TYPE.PURCHASE_INVOICE)).toBe(true);
    expect(registry.getContract(DOCUMENT_TYPE.INVENTORY_IMPORT)?.suggestedActions).toContain(
      'INITIAL_INVENTORY_IMPORT',
    );
  });
});
