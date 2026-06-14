import { Test, TestingModule } from '@nestjs/testing';
import { DbService } from 'src/core/services/db-service/db.service';
import { WorkerResolverService } from './worker-resolver.service';

describe('WorkerResolverService', () => {
  let service: WorkerResolverService;
  let findAll: jest.Mock;

  const ramKumar = { user_id: 1, name: 'Ram Kumar' };
  const ramSingh = { user_id: 2, name: 'Ram Singh' };
  const shyam = { user_id: 3, name: 'Shyam' };

  beforeEach(async () => {
    findAll = jest.fn();
    const dbService = {
      sqlService: {
        FactoryUser: { findAll },
        User: {},
      },
    } as unknown as DbService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkerResolverService,
        { provide: DbService, useValue: dbService },
      ],
    }).compile();

    service = module.get(WorkerResolverService);
  });

  function mockMembers(
    members: Array<{ user_id: number; name: string }>,
  ) {
    findAll.mockResolvedValue(
      members.map((member) => ({
        user_id: member.user_id,
        user: { id: member.user_id, name: member.name },
      })),
    );
  }

  it('resolves exact worker token', async () => {
    mockMembers([ramKumar, shyam]);
    const result = await service.resolve(1, 'Shyam');
    expect(result).toEqual({
      status: 'resolved',
      user_id: 3,
      name: 'Shyam',
      match_type: 'exact',
    });
  });

  it('returns ambiguous for partial worker hint', async () => {
    mockMembers([ramKumar, ramSingh]);
    const result = await service.resolve(1, 'Ra');
    expect(result.status).toBe('ambiguous');
    expect(result.candidates?.map((c) => c.name)).toEqual([
      'Ram Kumar',
      'Ram Singh',
    ]);
  });

  it('resolves fuzzy worker hint when uniquely closer', async () => {
    mockMembers([ramKumar, shyam]);
    const result = await service.resolve(1, 'Ramm');
    expect(result.status).toBe('resolved');
    expect(result.match_type).toBe('fuzzy');
    expect(result.user_id).toBe(1);
  });

  it('returns ambiguous when multiple Rams by first name', async () => {
    mockMembers([ramKumar, ramSingh]);
    const result = await service.resolve(1, 'Ram');
    expect(result.status).toBe('ambiguous');
    expect(result.candidates).toHaveLength(2);
  });

  it('returns not_found when no worker matches', async () => {
    mockMembers([shyam]);
    const result = await service.resolve(1, 'Amit');
    expect(result.status).toBe('not_found');
  });

  it('returns not_found when hint missing', async () => {
    mockMembers([shyam]);
    expect(await service.resolve(1, null)).toEqual({ status: 'not_found' });
  });

  it('strips @ from mention-style hints', async () => {
    mockMembers([{ user_id: 4, name: 'Vikram Shah' }]);
    const result = await service.resolve(1, '@vikram');
    expect(result.status).toBe('resolved');
    expect(result.name).toBe('Vikram Shah');
  });
});
