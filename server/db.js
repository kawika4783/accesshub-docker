import pg from 'pg';
const {Pool}=pg;
const connectionString=process.env.CLOUDRON_POSTGRESQL_URL||process.env.DATABASE_URL;
if(!connectionString) throw new Error('CLOUDRON_POSTGRESQL_URL or DATABASE_URL is required');
export const db=new Pool({connectionString,max:10,idleTimeoutMillis:30_000,connectionTimeoutMillis:5_000});
db.on('error',error=>console.error('Unexpected PostgreSQL pool error',error));
export async function transaction(work){const client=await db.connect();try{await client.query('begin');const result=await work(client);await client.query('commit');return result}catch(error){await client.query('rollback');throw error}finally{client.release()}}
