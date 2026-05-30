import { BadRequestException } from '@nestjs/common';
import {
  normalizeSku,
  parseNonNegativeThreshold,
  parsePositiveQuantity,
  parseSignedQuantity,
  resolveNamedSelection,
} from './inventory.validation';

describe('inventory.validation', () => {
  it('normalizes SKU to uppercase', () => {
    expect(normalizeSku('cem001')).toBe('CEM001');
  });

  it('rejects invalid SKU', () => {
    expect(() => normalizeSku('  ')).toThrow(BadRequestException);
  });

  it('parses positive quantity', () => {
    expect(parsePositiveQuantity('10.5')).toBe(10.5);
  });

  it('parses signed adjustment quantity', () => {
    expect(parseSignedQuantity('-3')).toBe(-3);
  });

  it('parses reorder threshold', () => {
    expect(parseNonNegativeThreshold('50')).toBe(50);
    expect(parseNonNegativeThreshold(null)).toBeNull();
  });

  it('resolves named selection by id or name', () => {
    const options = [{ id: 1, name: 'Raw Material' }];
    expect(resolveNamedSelection('1', options, 'category').id).toBe(1);
    expect(resolveNamedSelection('Raw Material', options, 'category').id).toBe(1);
  });
});
