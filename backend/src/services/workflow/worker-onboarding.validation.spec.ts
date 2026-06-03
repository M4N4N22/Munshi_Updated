import { BadRequestException } from '@nestjs/common';
import {
  formatDepartmentList,
  normalizeWorkerDoj,
  normalizeWorkerName,
  normalizeWorkerPhone,
  resolveDepartmentSelection,
} from './worker-onboarding.validation';

describe('worker-onboarding.validation', () => {
  const departments = [
    { id: 1, name: 'Sales', slug: 'sales' },
    { id: 2, name: 'IT', slug: 'it' },
  ];

  it('normalizes worker name', () => {
    expect(normalizeWorkerName('  Priya   Sharma  ')).toBe('Priya Sharma');
  });

  it('rejects empty worker name', () => {
    expect(() => normalizeWorkerName('   ')).toThrow(BadRequestException);
  });

  it('normalizes worker phone', () => {
    expect(normalizeWorkerPhone('9876543210')).toBe('9876543210');
  });

  it('rejects invalid worker phone', () => {
    expect(() => normalizeWorkerPhone('123')).toThrow(BadRequestException);
  });

  it('parses DOJ or skip', () => {
    expect(normalizeWorkerDoj('SKIP')).toBeNull();
    expect(normalizeWorkerDoj('2026-05-29')?.toISOString().slice(0, 10)).toBe(
      '2026-05-29',
    );
  });

  it('rejects invalid DOJ', () => {
    expect(() => normalizeWorkerDoj('not-a-date')).toThrow(BadRequestException);
  });

  it('resolves department by id, slug, or name', () => {
    expect(resolveDepartmentSelection('2', departments).id).toBe(2);
    expect(resolveDepartmentSelection('sales', departments).id).toBe(1);
    expect(resolveDepartmentSelection('IT', departments).id).toBe(2);
  });

  it('rejects invalid department', () => {
    expect(() => resolveDepartmentSelection('HR', departments)).toThrow(
      BadRequestException,
    );
  });

  it('formats department list', () => {
    expect(formatDepartmentList(departments)).toContain('Sales');
    expect(formatDepartmentList([])).toContain('No departments');
  });
});
