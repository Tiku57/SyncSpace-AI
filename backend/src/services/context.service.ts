import { WorkspaceItem } from '../types';

export const buildWorkspaceContext = (items: WorkspaceItem[]) => {
  const subtotal = items.reduce((sum, item) => sum + (Number.isNaN(Number(item.price)) ? 0 : Number(item.price)), 0);
  const tax = Math.round(subtotal * 0.10);
  const totalPrice = subtotal + tax;

  let prod = 10, ergo = 10, dsgn = 10;
  const monitorCount = items.filter(i => i.type === 'monitor').length;
  
  items.forEach(i => {
    // If the item carries its own dynamic impacts from Gemini, add them, otherwise fallback to defaults
    const pi = typeof i.productivityImpact === 'number' && !Number.isNaN(i.productivityImpact) ? i.productivityImpact : 0;
    const ei = typeof i.ergonomicsImpact === 'number' && !Number.isNaN(i.ergonomicsImpact) ? i.ergonomicsImpact : 0;
    const di = typeof i.designImpact === 'number' && !Number.isNaN(i.designImpact) ? i.designImpact : 0;
    
    prod += pi;
    ergo += ei;
    dsgn += di;

    if (i.type === 'monitor') { prod += 20; dsgn += 10; }
    if (i.type === 'stand') { prod += 5; ergo += 15; dsgn += 5; }
    if (i.type === 'desk') { prod += 10; ergo += 20; dsgn += 15; }
    if (i.type === 'chair') { ergo += 25; dsgn += 10; }
    if (i.type === 'keyboard') { prod += 10; dsgn += 5; }
    if (i.type === 'mouse') { prod += 5; ergo += 5; }
    if (i.type === 'laptop') { prod += 15; dsgn += 15; }
    if (i.type === 'tablet') { prod += 10; dsgn += 10; }
  });

  if (monitorCount > 1) { prod += 15; }
  dsgn += Math.min(items.length * 5, 25);

  const safeProd = Math.max(0, Math.min(100, isNaN(prod) ? 0 : prod));
  const safeErgo = Math.max(0, Math.min(100, isNaN(ergo) ? 0 : ergo));
  const safeDsgn = Math.max(0, Math.min(100, isNaN(dsgn) ? 0 : dsgn));

  return `
--- CURRENT WORKSPACE STATE ---
Total Items: ${items.length}

Items Currently In Workspace:
${items.length === 0 ? "Workspace is completely empty." : items.map(i => `- ${i.name} (Type: ${i.type}): $${i.price} (ID: ${i.id})`).join('\n')}

PRICING DETAILS:
Subtotal: $${subtotal}
Tax (10%): $${tax}
Total Cost: $${totalPrice}

ANALYTICS (Scores out of 100):
Productivity: ${safeProd}
Ergonomics: ${safeErgo}
Design: ${safeDsgn}
-------------------------------
`;
};
