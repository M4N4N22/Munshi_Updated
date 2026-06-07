import {
  buildInventoryDisambiguation,
  buildWorkerDisambiguation,
  collectDisambiguationPayloads,
} from './disambiguation.util';

describe('disambiguation.util', () => {
  it('builds inventory disambiguation payload', () => {
    expect(
      buildInventoryDisambiguation([
        { item_id: 1, sku: 'A', name: 'Cement 50kg', match_type: 'partial' },
        { item_id: 2, sku: 'B', name: 'Cement Premium', match_type: 'partial' },
      ]),
    ).toEqual({
      type: 'inventory_disambiguation',
      candidates: ['Cement 50kg', 'Cement Premium'],
    });
  });

  it('builds worker disambiguation payload', () => {
    expect(
      buildWorkerDisambiguation([
        { user_id: 1, name: 'Ram Kumar', match_type: 'partial' },
        { user_id: 2, name: 'Ram Singh', match_type: 'partial' },
      ]),
    ).toEqual({
      type: 'worker_disambiguation',
      candidates: ['Ram Kumar', 'Ram Singh'],
    });
  });

  it('collects both disambiguation payloads when ambiguous', () => {
    const payloads = collectDisambiguationPayloads(
      {
        status: 'ambiguous',
        candidates: [
          { item_id: 1, sku: 'A', name: 'Cement 50kg', match_type: 'partial' },
        ],
      },
      {
        status: 'ambiguous',
        candidates: [
          { user_id: 1, name: 'Ram Kumar', match_type: 'partial' },
        ],
      },
    );
    expect(payloads).toHaveLength(2);
    expect(payloads[0].type).toBe('inventory_disambiguation');
    expect(payloads[1].type).toBe('worker_disambiguation');
  });
});
