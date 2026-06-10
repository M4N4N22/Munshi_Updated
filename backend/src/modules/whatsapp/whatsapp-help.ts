import { USER_ROLE } from 'src/services/users/users.constants';
import { WA_DIVIDER } from './whatsapp.templates';

function isManagerOrOwner(role: string | undefined): boolean {
  const r = (role || '').toUpperCase();
  return r === USER_ROLE.OWNER || r === USER_ROLE.MANAGER;
}

const HELP_FOOTER =
  'Menu: *hello* ya *namaste*\n' + 'Dobara guide: *help*';

function buildWorkerHelp(userName: string): string {
  const name = userName?.trim() || 'ji';
  return (
    `👋 Namaste *${name}*,\n\n` +
    `Main *Munshi* — attendance aur kaam yahin se. Slash likhne ki zaroorat nahi.\n\n` +
    `${WA_DIVIDER}\n` +
    `*Rozmarra*\n` +
    `• Attendance: *present* ya *absent*\n` +
    `• Apne kaam: *show my tasks*\n` +
    `• Kaam poora: *complete task 4*\n` +
    `• Issue batana: *machine band hai*\n` +
    `• Issues list: *show active issues*\n` +
    `• Team: *show team*\n\n` +
    `${WA_DIVIDER}\n` +
    HELP_FOOTER
  );
}

function buildOwnerDailyHelp(userName: string): string {
  const name = userName?.trim() || 'ji';
  return (
    `👋 Namaste *${name}*,\n\n` +
    `*Munshi* — seedha likh kar kaam karein. Neeche examples hain (slash optional).\n\n` +
    `${WA_DIVIDER}\n` +
    `*Shuru*\n` +
    `• *hello* / *namaste* — home menu (employee, maal, kaam)\n` +
    `• *help* — ye guide\n\n` +
    `*Rozmarra*\n` +
    `• Attendance: *present* / *absent*\n` +
    `• Apne kaam: *show my tasks*\n` +
    `• Kaam assign: *@ram aaj store saaf karega*\n` +
    `• Dept ko kaam: *sales ko aaj figures bhejo*\n` +
    `• Team: *show team* · *who is absent today*\n` +
    `• Issue: *machine not working* · *resolve issue 5*\n\n` +
    `*Manager ke liye* (jab owner ne task bheja ho)\n` +
    `• *I will do task 12* — khud karunga\n` +
    `• *@anil will do task 12* — worker ko\n` +
    `• Galat department: */mgrtransfer 12 purchase*\n` +
    `• Reject: */mgrreject 12 not our scope*`
  );
}

function buildOwnerInventoryHelp(): string {
  return (
    `${WA_DIVIDER}\n` +
    `*Maal aur kharidi*\n` +
    `• Stock puchho: *ink kitna hai* · *low stock dikhao*\n` +
    `• Maal jodna: *hello* → *Maal / stock jodein* (ya CSV file bhejein)\n` +
    `• Employee jodna: *hello* → *Employee jodiyein*\n` +
    `• Purchase order: *packaging tape order karo* (ya low-stock alert)\n` +
    `• Vendor / worker onboarding: *hello* se menu\n` +
    `• Chal raha workflow band: *cancel*\n\n` +
    `*Advanced (zaroorat ho to)*\n` +
    `• */report* — attendance report\n` +
    `• */inventory_import_csv* — phir CSV attach\n\n` +
    `${WA_DIVIDER}\n` +
    HELP_FOOTER
  );
}

/** One message for workers; two for owners/managers (daily + maal/kharidi). */
export function buildHelpMessages(
  userName: string,
  role: string | undefined,
): string[] {
  if (!isManagerOrOwner(role)) {
    return [buildWorkerHelp(userName)];
  }
  return [buildOwnerDailyHelp(userName), buildOwnerInventoryHelp()];
}
