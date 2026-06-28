import 'dotenv/config';
import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
try {
  await client.connect();
  const tbls = ['clinics', 'patients', 'personal_histories', 'previous_medications', 'medications', 'sessions', 'session_medications', 'investigation_sheets', 'extra_investigations', 'investigations', 'appointments', 'users'];
  const out = {};
  for (const t of tbls) { const r = await client.query(`select count(*)::int n from public.${t}`); out[t] = r.rows[0].n; }
  console.log('Row counts:');
  for (const [k, v] of Object.entries(out)) console.log(`  ${k.padEnd(22)} ${v}`);
  const ap = await client.query(`
    select a.status, c.name as clinic, count(*)::int n
    from public.appointments a join public.clinics c on c.id=a.clinic_id
    group by a.status, c.name order by c.name, a.status`);
  console.log('\nAppointments by clinic/status:');
  for (const r of ap.rows) console.log(`  ${r.clinic.padEnd(10)} ${r.status.padEnd(12)} ${r.n}`);
} catch (e) { console.log('ERROR:', e.message); } finally { await client.end().catch(() => {}); }
