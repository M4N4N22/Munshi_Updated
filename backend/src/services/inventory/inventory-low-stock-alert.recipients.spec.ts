import {
  uniqueAlertPhones,
  resolveDepartmentManagerPhoneForLowStockAlert,
  resolveAllOwnerPhones,
  resolveAllDepartmentManagerPhones,
  resolveLowStockAlertRecipientPhones,
  lowStockRecipientInputFromPayload,
} from './inventory-low-stock-alert.recipients';
import { USER_ROLE } from 'src/services/users/users.constants';
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
        {
          Task: { findOne: jest.fn() },
          Department: { findOne: jest.fn(), findAll: jest.fn() },
          User: { findByPk: jest.fn() },
          FactoryUser: { findAll: jest.fn() },
        },
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
        findAll: jest.fn(),
      };
      const User = {
        findByPk: jest.fn().mockResolvedValue({ phone_number: '+919999999999' }),
      };

      const phone = await resolveDepartmentManagerPhoneForLowStockAlert(
        {
          Task,
          Department,
          User,
          FactoryUser: { findAll: jest.fn() },
        },
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

  describe('resolveAllOwnerPhones', () => {
    it('returns every owner phone in factory', async () => {
      const FactoryUser = {
        findAll: jest.fn().mockResolvedValue([
          { user: { phone_number: '+911111111111' } },
          { user: { phone_number: '+912222222222' } },
        ]),
      };
      const phones = await resolveAllOwnerPhones({ FactoryUser } as any, 1);
      expect(phones).toEqual(['+911111111111', '+912222222222']);
      expect(FactoryUser.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { factory_id: 1, role: USER_ROLE.OWNER },
        }),
      );
    });
  });

  describe('resolveAllDepartmentManagerPhones', () => {
    it('returns unique department manager phones', async () => {
      const Department = {
        findAll: jest.fn().mockResolvedValue([
          { manager_user_id: 10 },
          { manager_user_id: 11 },
        ]),
      };
      const User = {
        findByPk: jest
          .fn()
          .mockResolvedValueOnce({ phone_number: '+913333333333' })
          .mockResolvedValueOnce({ phone_number: '+914444444444' }),
      };
      const phones = await resolveAllDepartmentManagerPhones(
        { Department, User } as any,
        1,
      );
      expect(phones).toEqual(['+913333333333', '+914444444444']);
    });
  });

  describe('resolveLowStockAlertRecipientPhones', () => {
    it('merges owners and department managers with dedupe', async () => {
      const FactoryUser = {
        findAll: jest.fn().mockResolvedValue([
          { user: { phone_number: '+911111111111' } },
        ]),
      };
      const Department = {
        findAll: jest.fn().mockResolvedValue([{ manager_user_id: 10 }]),
        findOne: jest.fn().mockResolvedValue(null),
      };
      const User = {
        findByPk: jest.fn().mockResolvedValue({ phone_number: '+911111111111' }),
      };
      const Task = { findOne: jest.fn() };

      const phones = await resolveLowStockAlertRecipientPhones(
        { FactoryUser, Department, User, Task } as any,
        1,
      );
      expect(phones).toEqual(['+911111111111']);
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
