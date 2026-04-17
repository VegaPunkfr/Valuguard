import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const secret = readFileSync('.env.local','utf8').match(/^COMMAND_SECRET=(.+)$/m)?.[1]?.replace(/"/g,'').trim();
(async () => {
  const b = await chromium.launch({headless:true});
  const p = await b.newPage({viewport:{width:1920,height:1080}});
  await p.goto('https://ghost-tax.com/cockpit-v6.html',{waitUntil:'networkidle',timeout:30000});
  await p.fill('#auth-input', secret);
  await p.click('#auth-submit');
  await p.waitForTimeout(4000);

  // Find a DEFERRED client to reject (we deferred sprint-mcp-003 earlier)
  // Use API to find a client we can reject
  const clients = await p.evaluate(async () => {
    const key = localStorage.getItem('gt-command-key');
    const res = await fetch('/api/command/sprint', { headers: {'x-command-key': key} });
    const data = await res.json();
    return (data.accounts||[]).filter(a => a.status === 'DEFERRED').map(a => ({id:a.id, company:a.company, status:a.status}));
  });
  console.log('DEFERRED_CLIENTS:', JSON.stringify(clients));

  if (clients.length > 0) {
    const target = clients[0];
    console.log('REJECTING:', target.id, target.company);

    // PATCH reject via API
    const result = await p.evaluate(async (cid) => {
      const key = localStorage.getItem('gt-command-key');
      const res = await fetch('/api/command/sprint', {
        method: 'PATCH',
        headers: {'Content-Type':'application/json', 'x-command-key': key},
        body: JSON.stringify({id: cid, status: 'REJECTED', nextAction: 'Rejeté test Phase 1'})
      });
      return {status: res.status, body: await res.json()};
    }, target.id);
    console.log('PATCH_RESULT:', JSON.stringify(result));

    await p.waitForTimeout(2000);

    // Check outreach_events for REJECT
    const rejectEvent = await p.evaluate(async (cid) => {
      const key = localStorage.getItem('gt-command-key');
      const res = await fetch(`/api/outreach/events?client_id=${cid}&kind=REJECT&limit=1`, {
        headers: {'x-command-key': key}
      });
      return res.json();
    }, target.id);
    console.log('REJECT_EVENT:', JSON.stringify(rejectEvent).slice(0,400));

    // Restore to DEFERRED
    await p.evaluate(async (cid) => {
      const key = localStorage.getItem('gt-command-key');
      await fetch('/api/command/sprint', {
        method: 'PATCH',
        headers: {'Content-Type':'application/json', 'x-command-key': key},
        body: JSON.stringify({id: cid, status: 'DEFERRED', nextAction: 'Restauré après test'})
      });
    }, target.id);
    console.log('RESTORED_TO_DEFERRED');
  } else {
    console.log('NO_DEFERRED_CLIENT_AVAILABLE');
  }
  await b.close();
})();
