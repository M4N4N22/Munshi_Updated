import { BadRequestException } from '@nestjs/common';
import { DepartmentsService } from './departments.service';

describe('DepartmentsService owner multi-head', () => {
  const factoryModel = { findByPk: jest.fn() };
  const departmentModel = {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  };
  const factoryUserModel = { findOne: jest.fn() };
  const departmentWorkerModel = {};
  const userModel = {};
  const taskModel = { update: jest.fn() };

  let service: DepartmentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    factoryModel.findByPk.mockResolvedValue({ id: 1 });
    departmentModel.findAll.mockResolvedValue([]);
    departmentModel.create.mockImplementation(async (row: any) => ({
      id: 99,
      ...row,
    }));

    service = new DepartmentsService({
      sqlService: {
        Department: departmentModel,
        DepartmentWorker: departmentWorkerModel,
        Factory: factoryModel,
        FactoryUser: factoryUserModel,
        User: userModel,
        Task: taskModel,
      },
    } as any);
  });

  it('allows owner to head a second department on create', async () => {
    factoryUserModel.findOne.mockResolvedValue({ role: 'OWNER' });
    departmentModel.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 1, manager_user_id: 10 });

    await service.create({
      factory_id: 1,
      name: 'Sales',
      slug: 'sales',
      manager_user_id: 10,
    });

    expect(departmentModel.create).toHaveBeenCalled();
  });

  it('blocks manager from heading two departments', async () => {
    factoryUserModel.findOne.mockResolvedValue({ role: 'MANAGER' });
    departmentModel.findOne.mockResolvedValue({ id: 1, manager_user_id: 20 });

    await expect(
      service.create({
        factory_id: 1,
        name: 'Sales',
        slug: 'sales',
        manager_user_id: 20,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
