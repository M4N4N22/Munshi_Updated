import { BadRequestException } from '@nestjs/common';
import {
  filterSelectableDepartments,
  formatDepartmentList,
  formatWorkerPhoneDisplay,
  looksLikeDepartmentInput,
  looksLikePhoneInput,
  normalizeWorkerDoj,
  normalizeWorkerName,
  normalizeWorkerPhone,
  parseWorkerRole,
  resolveDepartmentSelection,
} from './worker-onboarding.validation';
import { USER_ROLE } from 'src/services/users/users.constants';

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
    expect(formatDepartmentList([])).toBe('');
  });

  it('filters junk department names from selectable list', () => {
    const filtered = filterSelectableDepartments([
      { id: 1, name: 'Sales', slug: 'sales' },
      { id: 2, name: '1780546230', slug: '1780546230' },
    ]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Sales');
  });

  it('rejects metadata timestamp as phone input', () => {
    expect(looksLikePhoneInput('1780546230')).toBe(false);
    expect(() => normalizeWorkerPhone('1780545713')).toThrow(BadRequestException);
  });

  it('formats Indian phone for display', () => {
    expect(formatWorkerPhoneDisplay('917247577182')).toBe('+91 724 757 7182');
  });

  it('rejects numeric strings as department names', () => {
    expect(looksLikeDepartmentInput('1780546230')).toBe(false);
    expect(looksLikeDepartmentInput('Sales')).toBe(true);
  });

  it('parses role case-insensitively', () => {
    expect(parseWorkerRole('Manager')).toBe(USER_ROLE.MANAGER);
    expect(parseWorkerRole('worker')).toBe(USER_ROLE.WORKER);
    expect(parseWorkerRole('* MANAGER')).toBe(USER_ROLE.MANAGER);
  });
});
