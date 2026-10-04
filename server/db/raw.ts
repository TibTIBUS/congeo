import {AsyncLocalStorage} from 'node:async_hooks';
import {Pool,type PoolClient} from 'pg';
import {attachDatabasePool} from '@neon/functions';
export type MutationResult={meta:{changes:number};success:boolean};
const pool=new Pool({connectionString:process.env.DATABASE_URL,max:5});
attachDatabasePool(pool);
const context=new AsyncLocalStorage<PoolClient>();
export function translateSql(sql:string){
 sql=sql.replace(/json_each\(r\.days\) d/g,'jsonb_array_elements_text(r.days::jsonb) AS d(value)');
 sql=sql.replace(/json_each\(\?\)/g,'jsonb_array_elements_text(?::jsonb) AS j(value)');
 sql=sql.replace(/\bend\b/g,'"end"');
 let i=0;return sql.replace(/\?/g,()=>'$'+(++i));
}
export function raw(){
 if(!process.env.DATABASE_URL)throw new Error('Le planning partagé n’est pas encore connecté.');
 function prepare(sql:string){let args:unknown[]=[];const statement={bind(...values:unknown[]){args=values;return statement;},async all<T extends Record<string,any>>(){const r=await (context.getStore()||pool).query(translateSql(sql),args);return {results:r.rows as T[]};},async first<T extends Record<string,any>>(){return (await statement.all<T>()).results[0]||null;},async run():Promise<MutationResult>{const r=await (context.getStore()||pool).query(translateSql(sql),args);return {meta:{changes:r.rowCount||0},success:true};}};return statement;}
 return {prepare,async batch(statements:ReturnType<typeof prepare>[]){const result=[];for(const s of statements)result.push(await s.run());return result;}};
}
export async function withTransaction(fn:()=>Promise<Response>){
 if(!process.env.DATABASE_URL)throw new Error('Le planning partagé n’est pas encore connecté.');
 const client=await pool.connect();
 try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(19451004)');return await context.run(client,async()=>{const response=await fn();await client.query(response.ok?'COMMIT':'ROLLBACK');return response;});}
 catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}finally{client.release();}
}
