import { DepartmentsService } from 'src/services/departments/departments.service';
import { WORKER_ONBOARDING_STEP, WorkerOnboardingStep } from './workflow.constants';
import {
  IWorkerOnboardingSessionData,
  IWorkflowSessionRecord,
} from './workflow.interfaces';
import { USER_ROLE } from 'src/services/users/users.constants';
import {
  formatWorkerPhoneDisplay,
  isInvalidStoredPhone,
  looksLikeDepartmentInput,
} from './worker-onboarding.validation';

export async function resolveDepartmentDisplayName(
  departmentsService: DepartmentsService,
  factoryId: number,
  departmentId?: number,
): Promise<string | null> {
  if (!departmentId) {
    return null;
  }
  const departments = await departmentsService.listByFactory(factoryId);
  const row = departments.find((d) => d.id === departmentId);
  if (!row?.name) {
    return null;
  }
  if (!looksLikeDepartmentInput(row.name)) {
    return null;
  }
  return row.name;
}

function roleLabel(role?: string): string | null {
  if (role === USER_ROLE.MANAGER) {
    return 'Manager';
  }
  if (role === USER_ROLE.WORKER) {
    return 'Worker';
  }
  return null;
}

/** Sanitize stale session data and derive the step the user actually needs. */
export async function prepareWorkerOnboardingSession(
  session: IWorkflowSessionRecord,
  departmentsService: DepartmentsService,
  factoryId: number,
): Promise<{
  step: WorkerOnboardingStep;
  data: IWorkerOnboardingSessionData;
  departmentName: string | null;
}> {
  const raw = session.session_data as IWorkerOnboardingSessionData;
  const data: IWorkerOnboardingSessionData = { ...raw };

  if (isInvalidStoredPhone(data.phone_number)) {
    delete data.phone_number;
  }

  let departmentName: string | null = null;
  if (data.department_id) {
    const departments = await departmentsService.listByFactory(factoryId);
    const row = departments.find((d) => d.id === data.department_id);
    if (!row) {
      departmentName = null;
    } else if (!looksLikeDepartmentInput(row.name)) {
      delete data.department_id;
      delete data.worker_role;
      departmentName = null;
    } else {
      departmentName = row.name;
    }
  }

  const step = inferResumeStep(data, session.current_step);
  return { step, data, departmentName };
}

/** Pick the step the user still needs from collected (possibly stale) session data. */
export function inferResumeStep(
  data: IWorkerOnboardingSessionData,
  currentStep: string,
): WorkerOnboardingStep {
  if (!data.name?.trim()) {
    return WORKER_ONBOARDING_STEP.WORKER_NAME;
  }
  if (!data.phone_number?.trim() || isInvalidStoredPhone(data.phone_number)) {
    return WORKER_ONBOARDING_STEP.WORKER_PHONE;
  }
  if (!data.department_id) {
    return WORKER_ONBOARDING_STEP.WORKER_DEPARTMENT;
  }
  if (!data.worker_role) {
    return WORKER_ONBOARDING_STEP.WORKER_ROLE;
  }
  return currentStep as WorkerOnboardingStep;
}

export function getNextStepPrompt(currentStep: string): string {
  switch (currentStep as WorkerOnboardingStep) {
    case WORKER_ONBOARDING_STEP.WORKER_PHONE:
      return 'Ab *WhatsApp number* bhejein (contact share ya likh kar).';
    case WORKER_ONBOARDING_STEP.WORKER_DEPARTMENT:
      return 'Ab *team / kaam* batayein (jaise sales, production).';
    case WORKER_ONBOARDING_STEP.WORKER_ROLE:
      return 'Ab *role* batayein — Worker ya Manager.';
    case WORKER_ONBOARDING_STEP.WORKER_DOJ:
      return 'Ab *joining date* bhejein (YYYY-MM-DD) ya *SKIP*.';
    default:
      return 'Neeche diya step complete karein.';
  }
}

/** Hindi summary of in-progress employee add for resumed / interrupted flows. */
export async function buildWorkerOnboardingResumeHeader(
  data: IWorkerOnboardingSessionData,
  currentStep: string,
  factoryId: number,
  departmentsService: DepartmentsService,
): Promise<string> {
  if (!data.name?.trim()) {
    return '';
  }

  const deptName = await resolveDepartmentDisplayName(
    departmentsService,
    factoryId,
    data.department_id,
  );
  const role = roleLabel(data.worker_role);
  const resumeStep = inferResumeStep(data, currentStep);
  const phoneValid =
    !!data.phone_number?.trim() && !isInvalidStoredPhone(data.phone_number);

  const lines: string[] = [
    `*${data.name}* ka add abhi *adhura* hai.`,
    '',
    'Jo details ho chuki hain:',
    `• Naam: ${data.name}`,
  ];

  if (phoneValid) {
    lines.push(`• Number: ${formatWorkerPhoneDisplay(data.phone_number!)}`);
  } else {
    lines.push('• Number: _(abhi pending)_');
  }

  if (deptName) {
    lines.push(`• Team: ${deptName}`);
  } else if (resumeStep === WORKER_ONBOARDING_STEP.WORKER_DEPARTMENT) {
    lines.push('• Team: _(abhi pending)_');
  } else if (data.department_id) {
    lines.push('• Team: _(galat save hua — dubara team naam bhejein)_');
  }

  if (role) {
    lines.push(`• Role: ${role}`);
  } else if (
    resumeStep === WORKER_ONBOARDING_STEP.WORKER_ROLE ||
    resumeStep === WORKER_ONBOARDING_STEP.WORKER_DOJ
  ) {
    lines.push('• Role: _(abhi pending)_');
  }

  lines.push('', getNextStepPrompt(resumeStep));
  lines.push('', '_*cancel* likhein agar band karna ho._');

  return lines.join('\n');
}
