import {
  buildDepartmentStepPrompt,
  translateWorkerOnboardingError,
} from './worker-onboarding.messages';

describe('worker-onboarding.messages', () => {
  it('translates owner-already-head department error to Hindi', () => {
    const { title, detail } = translateWorkerOnboardingError(
      'This manager already heads another department in the factory',
      {
        headedDeptName: 'General',
        departmentList: '• *1* — General',
      },
    );
    expect(title).toContain('auto-create');
    expect(detail).toContain('General');
    expect(detail).toContain('head');
  });

  it('builds department step prompt with team list', () => {
    const body = buildDepartmentStepPrompt('Mayank', '7247577182', [
      { id: 3, name: 'Sales', slug: 'sales' },
    ]);
    expect(body).toContain('Mayank');
    expect(body).toContain('+91 724 757 7182');
    expect(body).toContain('Sales');
  });
});
