import { BadRequestException } from '@nestjs/common';
import {
  normalizeVendorGst,
  normalizeVendorName,
  normalizeVendorPhone,
} from './vendors.validation';

describe('vendors.validation', () => {
  describe('normalizeVendorName', () => {
    it('trims and collapses whitespace', () => {
      expect(normalizeVendorName('  Acme   Supplies  ')).toBe('Acme Supplies');
    });

    it('throws when name is empty', () => {
      expect(() => normalizeVendorName('   ')).toThrow(BadRequestException);
    });
  });

  describe('normalizeVendorPhone', () => {
    it('normalizes E.164 phone', () => {
      expect(normalizeVendorPhone('+91 98765-43210')).toBe('+919876543210');
    });

    it('normalizes 10-digit local phone', () => {
      expect(normalizeVendorPhone('9876543210')).toBe('9876543210');
    });

    it('throws when phone is empty', () => {
      expect(() => normalizeVendorPhone('')).toThrow(BadRequestException);
    });

    it('throws when too few digits', () => {
      expect(() => normalizeVendorPhone('12345')).toThrow(BadRequestException);
    });
  });

  describe('normalizeVendorGst', () => {
    it('accepts valid GSTIN', () => {
      expect(normalizeVendorGst('27aabCU9603r1zm')).toBe('27AABCU9603R1ZM');
    });

    it('returns null for empty gst', () => {
      expect(normalizeVendorGst('')).toBeNull();
    });

    it('throws for invalid GSTIN', () => {
      expect(() => normalizeVendorGst('INVALID')).toThrow(BadRequestException);
    });
  });
});
