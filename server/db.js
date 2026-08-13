import fs from 'node:fs';
import pg from 'pg';
const {Pool}=pg;
const connectionString=process.env.CLOUDRON_POSTGRESQL_URL||process.env.DATABASE_URL;
const passwordFile=process.env.DATABASE_PASSWORD_FILE;
const password=passwordFile?fs.readFileSync(passwordFile,'utf8').trim():undefined;
const connection=connectionString
  ?{connectionString}
  :process.env.DATABASE_HOST
    ?{host:process.env.DATABASE_HOST,port:Number(process.env.DATABASE_PORT||5432),database:process.env.DATABASE_NAME||'accesshub',user:process.env.DATABASE_USER||'accesshub',password}
    :null;
if(!connection) throw new Error('PostgreSQL connection configuration is required');
export const db=new Pool({...connection,max:10,idleTimeoutMillis:30_000,connectionTimeoutMillis:5_000});
db.on('error',error=>console.error('Unexpected PostgreSQL pool error',error));
export async function transaction(work){const client=await db.connect();try{await client.query('begin');const result=await work(client);await client.query('commit');return result}catch(error){await client.query('rollback');throw error}finally{client.release()}}
