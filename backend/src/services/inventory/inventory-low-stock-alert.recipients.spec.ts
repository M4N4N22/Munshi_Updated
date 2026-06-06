import {
  uniqueAlertPhones,
  resolveDepartmentManagerPhoneForLowStockAlert,
  lowStockRecipientInputFromPayload,
} from './inventory-low-stock-alert.recipients';
import { TASK_INVENTORY_REFERENCE_TYPE } from 'src/services/tasks/tasks.inventory.constants';

describe('inventory-low-stock-alert.recipients', () => {
  describe('uniqueAlertPhones', () => {
    it('dedupes identical phones', () => {
      expect(uniqueAlertPhones('+911111111111', '+911111111111')).toEqual([
        '+911111111111',
      ]);
    });

    it('preserves order and skips empty', () => {
      expect(
        uniqueAlertPhones('+911', null, '+912', undefined, '+911'),
      ).toEqual(['+911', '+912']);
    });
  });

  describe('resolveDepartmentManagerPhoneForLowStockAlert', () => {
    it('returns null for non-TASK reference', async () => {
      const phone = await resolveDepartmentManagerPhoneForLowStockAlert(
        { Task: { findOne: jest.fn() }, Department: { findOne: jest.fn() }, User: { findByPk: jest.fn() } },
        { factoryId: 1, referenceType: 'CSV_IMPORT', referenceId: 5 },
      );
      expect(phone).toBeNull();
    });

    it('returns manager phone via task department', async () => {
      const Task = {
        findOne: jest.fn().mockResolvedValue({ department_id: 7 }),
      };
      const Department = {
        findOne: jest.fn().mockResolvedValue({ manager_user_id: 55 }),
      };
      const User = {
        findByPk: jest.fn().mockResolvedValue({ phone_number: '+919999999999' }),
      };

      const phone = await resolveDepartmentManagerPhoneForLowStockAlert(
        { Task, Department, User },
        {
          factoryId: 1,
          referenceType: TASK_INVENTORY_REFERENCE_TYPE,
          referenceId: 42,
        },
      );

      expect(phone).toBe('+919999999999');
      expect(User.findByPk).toHaveBeenCalledWith(
        55,
        expect.objectContaining({ attributes: ['phone_number'] }),
      );
    });
  });

  describe('lowStockRecipientInputFromPayload', () => {
    it('maps payload fields', () => {
      expect(
        lowStockRecipientInputFromPayload(3, {
          reference_type: TASK_INVENTORY_REFERENCE_TYPE,
          reference_id: 9,
        }),
      ).toEqual({
        factoryId: 3,
        referenceType: TASK_INVENTORY_REFERENCE_TYPE,
        referenceId: 9,
      });
    });
  });
});
