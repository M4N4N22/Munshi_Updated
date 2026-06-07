import {
  isCancelReply,
  isConfirmReply,
  parseSelectionIndex,
} from './task-inventory-nl.helper';

describe('task-inventory-nl.helper', () => {
  it('detects confirm replies', () => {
    expect(isConfirmReply('CONFIRM')).toBe(true);
    expect(isConfirmReply('yes')).toBe(true);
    expect(isConfirmReply('1')).toBe(true);
    expect(isConfirmReply('haan')).toBe(true);
    expect(isConfirmReply('ok')).toBe(true);
    expect(isConfirmReply('theek hai')).toBe(true);
  });

  it('detects cancel replies', () => {
    expect(isCancelReply('CANCEL')).toBe(true);
    expect(isCancelReply('no')).toBe(true);
    expect(isCancelReply('2')).toBe(true);
  });

  it('parses valid selection index', () => {
    expect(parseSelectionIndex('2', 3)).toBe(2);
  });

  it('rejects invalid selection index', () => {
    expect(parseSelectionIndex('4', 3)).toBeNull();
    expect(parseSelectionIndex('abc', 3)).toBeNull();
  });
});
