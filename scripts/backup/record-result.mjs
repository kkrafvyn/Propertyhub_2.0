import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Backup telemetry needs Supabase URL and service role configuration');
let evidence;
try { evidence = JSON.parse(fs.readFileSync('backups/latest-run.json', 'utf8')); }
catch { evidence = { status:'failed', reason:'Backup run evidence missing' }; }
const client = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const { error } = await client.from('operational_events').insert({service:'offsite-backup',event_type:'backup_result',
  severity:evidence.status==='completed'?'info':'error', message:`Offsite backup ${evidence.status}`,metadata:evidence});
if(error)throw new Error('Could not record backup result');
