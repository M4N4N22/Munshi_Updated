import { buildWorkerOnboardingResumeHeader } from './worker-onboarding-resume';
import { WORKER_ONBOARDING_STEP } from './workflow.constants';

describe('buildWorkerOnboardingResumeHeader', () => {
  const departmentsService = {
    listByFactory: jest.fn().mockResolvedValue([
      { id: 3, name: 'Sales', slug: 'sales' },
    ]),
  } as any;

  it('summarizes collected fields and next step for role', async () => {
    const header = await buildWorkerOnboardingResumeHeader(
      {
        name: 'Mayank Pawar',
        phone_number: '9876543210',
        department_id: 3,
      },
      WORKER_ONBOARDING_STEP.WORKER_ROLE,
      10,
      departmentsService,
    );

    expect(header).toContain('Mayank Pawar');
    expect(header).toContain('adhura');
    expect(header).toContain('+91 987 654 3210');
    expect(header).toContain('Sales');
    expect(header).toContain('Worker ya Manager');
  });

  it('hides junk timestamp phone and team from summary', async () => {
    const header = await buildWorkerOnboardingResumeHeader(
      {
        name: 'Mayank Pawar',
        phone_number: '1780545713',
        department_id: 99,
      },
      WORKER_ONBOARDING_STEP.WORKER_ROLE,
      10,
      {
        listByFactory: jest.fn().mockResolvedValue([
          { id: 99, name: '1780546230', slug: '1780546230' },
        ]),
      } as any,
    );

    expect(header).toContain('Number: _(abhi pending)_');
    expect(header).not.toContain('1780545713');
    expect(header).toContain('WhatsApp number');
    expect(header).toContain('galat save');
  });

  it('shows pending team when on department step', async () => {
    const header = await buildWorkerOnboardingResumeHeader(
      { name: 'Mayank Pawar', phone_number: '9876543210' },
      WORKER_ONBOARDING_STEP.WORKER_DEPARTMENT,
      10,
      departmentsService,
    );

    expect(header).toContain('Team: _(abhi pending)_');
    expect(header).toContain('team / kaam');
  });
});
