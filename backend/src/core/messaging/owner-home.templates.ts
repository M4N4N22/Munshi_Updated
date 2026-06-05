const WA_DIVIDER = '━━━━━━━━━━━━━━━';

export function waOwnerWelcomeIntro(params: {
  userName: string;
  businessName: string;
  employeeCount: number;
  stockItemCount: number;
}): string {
  const name = params.userName?.trim() || 'ji';
  const teamLine = params.employeeCount
    ? `👥 *Team:* ${params.employeeCount} log jud chuke hain`
    : `👥 *Team:* abhi koi employee nahi — pehle log jodiyein`;

  const stockLine = params.stockItemCount
    ? `📦 *Maal / stock:* ${params.stockItemCount} item`
    : `📦 *Maal / stock:* abhi add nahi kiya`;

  return (
    `Namaste *${name}* 👋\n\n` +
    `Main *Munshi* — aapke business ka WhatsApp sahayak.\n` +
    `*${params.businessName}* ke liye attendance, maal aur kaam — sab yahin se.\n\n` +
    `${teamLine}\n` +
    `${stockLine}\n\n` +
    `${WA_DIVIDER}\n` +
    `Neeche se shuru karein 👇`
  );
}

export function waOwnerDemoLinks(bookDemoUrl: string | null, youtubeUrl: string | null): string {
  const lines: string[] = ['*Pehli baar?*'];
  if (bookDemoUrl) {
    lines.push(`📅 Demo book karein: ${bookDemoUrl}`);
  }
  if (youtubeUrl) {
    lines.push(`▶️ Video dekhein (kaise use karein): ${youtubeUrl}`);
  }
  if (lines.length === 1) {
    return '';
  }
  return lines.join('\n');
}

export function waAssignTaskNeedEmployees(): string {
  return (
    `*Pehle employee jodiyein*\n\n` +
    `Kaam assign karne ke liye kam se kam ek employee ya manager chahiye.\n\n` +
    `Neeche *WhatsApp par add* ya *CSV se bulk add* chuno 👇`
  );
}

export function waAssignTaskReady(): string {
  return (
    `*Kaam assign karein*\n\n` +
    `Ab aap seedha likh sakte hain, jaise:\n` +
    `• *@ram aaj store saaf karega*\n` +
    `• *aaj 4 website banegi*\n\n` +
    `Wapas options ke liye *Home par jayein* button dabayein.`
  );
}

export function waUnrecognizedChat(): string {
  return (
    `Ye message samajh nahi aaya.\n\n` +
    `Neeche *Home par jayein* dabayein — wahan se employee, maal ya kaam choose kar sakte hain.\n\n` +
    `Ya seedha kaam likhein, jaise *@ram aaj store saaf karega*.`
  );
}

export function waUnrecognizedChatWorker(): string {
  return (
    `Ye message samajh nahi aaya.\n\n` +
    `Attendance: *present* ya *absent*\n` +
    `Apne kaam: *show my tasks*`
  );
}

export function waEmployeeAddMenuIntro(): string {
  return (
    `*Employee kaise jodenge?*\n\n` +
    `• *WhatsApp par add* — ek ek karke\n` +
    `• *CSV se bulk add* — zyada log (template + file)\n\n` +
    `Neeche button chuno 👇\n\n` +
    `_Website dashboard jald aa raha hai._`
  );
}

export function waDashboardComingSoon(): string {
  return (
    `*Dashboard*\n\n` +
    `Website par team manage karna jald aa raha hai.\n\n` +
    `Abhi *WhatsApp par add* ya *CSV se bulk add* use karein.`
  );
}

export function waGoogleFormRetired(): string {
  return (
    `*Purana Google Form ab use nahi hota*\n\n` +
    `Team add karne ke liye:\n` +
    `• *Employee jodiyein* → *CSV se bulk add*\n` +
    `• Ya *WhatsApp par add* (ek ek employee)`
  );
}

export function waWorkerWelcome(userName: string): string {
  const name = userName?.trim() || 'ji';
  return (
    `Namaste *${name}* 👋\n\n` +
    `Main *Munshi* — aapke business ka WhatsApp bot.\n\n` +
    `• Attendance: *present* ya *absent* likhein\n` +
    `• Apne kaam: *show my tasks*\n` +
    `• Madad: */help*`
  );
}

export function waNotRegistered(): string {
  return (
    `Aap abhi register nahi hain.\n\n` +
    `Pehle https://munshi.app par mobile verify karein, phir yahan *START* bhejein.`
  );
}

export function waOwnerOnlyHome(): string {
  return (
    `Ye menu business malik / manager ke liye hai.\n\n` +
    `Attendance ke liye *present* ya *absent* likhein. Madad: */help*`
  );
}
