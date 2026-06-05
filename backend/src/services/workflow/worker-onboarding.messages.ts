import { USER_ROLE } from 'src/services/users/users.constants';
import {
  DepartmentOption,
  formatDepartmentList,
  formatWorkerPhoneDisplay,
} from './worker-onboarding.validation';

export function formatValidationErrorMessage(
  prompt: string,
  errorMessage?: string,
): { title: string; body: string } {
  return {
    title: 'Sahi format nahi',
    body: `${errorMessage ?? 'Dobara try karein.'}\n\n${prompt}`,
  };
}

export function formatBusinessErrorMessage(
  title: string,
  detail: string,
  prompt?: string,
): { title: string; body: string } {
  const parts = [detail.trim()];
  if (prompt?.trim()) {
    parts.push('', prompt.trim());
  }
  return { title, body: parts.join('\n') };
}

/** Map API errors to Hindi titles + explanations for WhatsApp. */
export function translateWorkerOnboardingError(
  raw: string,
  context?: {
    typedTeam?: string;
    departmentList?: string;
    headedDeptName?: string;
  },
): { title: string; detail: string } {
  const msg = raw.trim();
  const lower = msg.toLowerCase();

  if (lower.includes('already heads another department')) {
    const head = context?.headedDeptName ?? 'ek team';
    return {
      title: 'Nayi team auto-create nahi ho sakti',
      detail:
        `Ek manager ek hi team ka *head* ho sakta hai. Aap (business owner) pehle se *${head}* ke head hain — isliye nayi team yahan se nahi banti.\n\n` +
        `Employee ko *existing team* mein jodna hai, nayi team head banana nahi.` +
        (context?.departmentList
          ? `\n\nSystem mein teams:\n${context.departmentList}`
          : ''),
    };
  }

  if (lower.includes('no department matches')) {
    return {
      title: 'Team nahi mili',
      detail: buildUnknownTeamMessage(
        context?.typedTeam ?? '—',
        context?.departmentList ?? '',
        context?.headedDeptName,
      ),
    };
  }

  if (lower.includes('already a member of this factory')) {
    return {
      title: 'Pehle se juda hua',
      detail:
        'Yeh number pehle se is business mein registered hai. Role / team badalne ke liye dashboard use karein, ya alag number se naya add karein.',
    };
  }

  if (lower.includes('phone already exists')) {
    return {
      title: 'Number pehle se hai',
      detail:
        'Is phone par pehle se account hai. Dashboard se existing user assign karein, ya sahi naya number bhejein.',
    };
  }

  if (lower.includes('only factory workers can be attached')) {
    return {
      title: 'Manager ko team member ki tarah nahi joda',
      detail:
        'Yeh user Manager hai — Worker ki tarah department mein attach nahi hota. Role *Manager* chunein ya department head flow use karein.',
    };
  }

  if (lower.includes('already attached to another department')) {
    return {
      title: 'Pehle se doosri team mein',
      detail:
        'Yeh employee pehle se kisi aur team mein hai. Pehle purani team hataein (dashboard), phir dubara add karein.',
    };
  }

  if (
    lower.includes('validation error') ||
    lower.includes('unique constraint') ||
    lower.includes('uq_departments_factory_manager')
  ) {
    return {
      title: 'Team save nahi hui',
      detail:
        'System abhi doosri team par aapko head banane nahi de raha (purana DB rule). ' +
        'Backend restart ke baad migration *009* chalni chahiye. ' +
        'Tab tak list se *General* jaisi existing team chunein.',
    };
  }

  return { title: 'Add nahi ho paya', detail: msg };
}

export function buildUnknownTeamMessage(
  typed: string,
  departmentList: string,
  headedDeptName?: string,
): string {
  const lines = [`"*${typed}*" system mein match nahi hui.`];
  if (headedDeptName) {
    lines.push(
      '',
      `Nayi team sirf *owner* bana sakte hain. Aap *${headedDeptName}* ke head hain — list se team chunein.`,
    );
  }
  if (departmentList.trim()) {
    lines.push('', 'Neeche se team *naam ya ID* likhein:', departmentList);
  } else {
    lines.push(
      '',
      'Abhi koi team list mein nahi. Pehle dashboard se team banayein, phir naam/ID bhejein.',
    );
  }
  return lines.join('\n');
}

export function buildDepartmentStepPrompt(
  employeeName: string,
  phoneNumber: string,
  selectable: DepartmentOption[],
  existingUserHint?: string,
): string {
  const lines = [
    `*${employeeName}* — kis *team* mein kaam karenge?`,
    '',
    `📞 Number save: ${formatWorkerPhoneDisplay(phoneNumber)}`,
  ];
  if (existingUserHint?.trim()) {
    lines.push('', existingUserHint.trim());
  }
  const list = formatDepartmentList(selectable);
  if (list) {
    lines.push('', 'System mein abhi yeh teams hain:', list);
    lines.push(
      '',
      'Team ka *naam ya ID* likhein (jaise *Sales* ya *3*).',
      '_Nayi team naam likhne par ban jayegi (aap interim head rahenge jab tak Manager assign na ho)._',
    );
  } else {
    lines.push(
      '',
      'Team ka naam likhein (jaise *production*, *sales*) — pehli team ban jayegi.',
    );
  }
  return lines.join('\n');
}

export function buildExistingPhoneHint(
  userName: string,
  factoryRole: string,
  headedDeptName?: string | null,
): string {
  const roleLabel =
    factoryRole === USER_ROLE.MANAGER
      ? 'Manager'
      : factoryRole === USER_ROLE.OWNER
        ? 'Owner'
        : factoryRole === USER_ROLE.WORKER
          ? 'Worker'
          : factoryRole;
  let line = `ℹ️ Is number par pehle se *${userName || 'user'}* (${roleLabel}) registered hai.`;
  if (headedDeptName) {
    line += ` Woh *${headedDeptName}* ke head hain.`;
  }
  line += ' Neeche sahi *team* chunein; role agla step hai.';
  return line;
}

export function buildDepartmentRetryPrompt(
  selectable: DepartmentOption[],
  existingUserHint?: string,
): string {
  const list = formatDepartmentList(selectable);
  const parts: string[] = [];
  if (existingUserHint?.trim()) {
    parts.push(existingUserHint.trim(), '');
  }
  if (list) {
    parts.push('Teams:', list, '', 'Team ka naam ya ID dubara bhejein.');
  } else {
    parts.push('Team ka naam dubara bhejein.');
  }
  return parts.join('\n');
}
