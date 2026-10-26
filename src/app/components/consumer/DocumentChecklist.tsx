import { useState } from 'react';
const lists = {
  viewing: ['Confirm the address, contact person and appointment time', 'Ask the team whether identification is required', 'Prepare questions about condition, utilities and total costs'],
  rental: ['Ask for the application form and eligibility requirements', 'Prepare identification and contact details requested by the team', 'Ask whether income evidence or references are needed', 'Review the proposed lease, deposit and payment schedule'],
  purchase: ['Ask for the seller’s document checklist and identity details', 'Arrange independent review of ownership and title documents', 'Ask about inspections, financing and the full cost breakdown', 'Review the proposed sale agreement before signing'],
};
export function DocumentChecklist() {
  const [kind, setKind] = useState<keyof typeof lists>('viewing');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  return <section className="my-5 rounded-xl border border-surface-border bg-surface p-4" aria-label="Document checklist">
    <h2 className="text-base font-semibold">Prepare for your next step</h2>
    <label className="mt-3 block text-sm">Checklist<select className="ml-3 min-h-11 rounded-lg border border-surface-border bg-surface px-3" value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}><option value="viewing">Viewing</option><option value="rental">Rental application</option><option value="purchase">Purchase</option></select></label>
    <ul className="mt-3 space-y-2">{lists[kind].map((item, index) => { const key = `${kind}:${index}`; return <li key={key}><label className="flex min-h-11 items-start gap-3 py-2 text-sm"><input type="checkbox" checked={Boolean(checked[key])} onChange={(event) => setChecked({ ...checked, [key]: event.target.checked })} className="mt-1" />{item}</label></li>; })}</ul>
    <p className="mt-3 text-xs text-ink-secondary">A preparation guide, not a required upload list. Confirm requirements with your property team. Keep identity documents private.</p>
  </section>;
}
