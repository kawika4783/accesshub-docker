import fs from 'node:fs/promises';
import {db} from './db.js';
export async function migrate(){const client=await db.connect();try{await client.query('select pg_advisory_lock($1)',[840271]);const sql=await fs.readFile(new URL('./schema.sql',import.meta.url),'utf8');await client.query(sql)}finally{await client.query('select pg_advisory_unlock($1)',[840271]).catch(()=>{});client.release()}}
