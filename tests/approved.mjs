import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {PGlite} from '@electric-sql/pglite';
import api from '../server/index.ts';
import {weekPeriod,parse,iso} from '../src/lib/calendar.ts';
const db=new PGlite();
await db.exec(await readFile('drizzle/0000_chemical_silver_samurai.sql','utf8'));
process.env.DATABASE_URL='test';process.env.ALLOWED_ORIGINS='https://tibtibus.github.io';delete process.env.RESEND_API_KEY;
const query=async(sql,args)=>{const r=await db.query(sql,args);return {rows:r.rows,rowCount:r.affectedRows??r.rows.length};};
pg.Pool.prototype.query=query;
pg.Pool.prototype.connect=async()=>({query,release(){}});
for(const id of ['a','b','c'])await db.query('INSERT INTO employees (id,name,email,notify) VALUES ($1,$2,$3,1)',[id,id,id+'@example.org']);
const year=new Date().getUTCFullYear()+1,{start,end}=weekPeriod(year+'-02-15'),next=iso(new Date(parse(start).getTime()+7*86400000)),blocked=weekPeriod(year+'-01-04').start;
for(const [id,employee] of [['r1','a'],['r2','b'],['r3','c']])await db.query('INSERT INTO requests (id,employee_id,start,"end",days,status,created) VALUES ($1,$2,$3,$3,$4,$5,$6)',[id,employee,start,JSON.stringify([start]),id==='r1'?'approved':'pending','test']);
async function post(body){const r=await api.fetch(new Request('https://congeo.test/api/planning',{method:'POST',headers:{Origin:'https://tibtibus.github.io','Content-Type':'application/json'},body:JSON.stringify(body)}));return {status:r.status,body:await r.json()};}
const payload={admin:true,id:'r1',originalStart:start,originalEnd:start};
assert.equal((await post({...payload,admin:false,employee:'a',action:'editApproved',start:next,end:next})).status,400);
assert.equal((await post({...payload,admin:false,employee:'a',action:'deleteApproved'})).status,400);
assert.equal((await post({...payload,id:'r2',action:'editApproved',start:next,end:next})).status,400);
assert.equal((await post({...payload,action:'editApproved',start,end,answer:'Correction'})).status,200);
let row=(await db.query("SELECT * FROM requests WHERE id='r1'")).rows[0];assert.equal(row.status,'approved');assert.equal(row.end,end);assert.equal(row.cancel_requested,0);assert.equal(row.answer,'Correction');
assert.equal((await post({...payload,action:'deleteApproved'})).status,400); // stale original dates
const current={...payload,originalEnd:end};
const snapshot=JSON.stringify(row);
assert.equal((await post({...current,action:'editApproved',start:blocked,end:blocked})).status,400); // ISO week 1
assert.equal((await post({...current,action:'editApproved',start:year+'-02-30',end:year+'-03-01'})).status,400);
assert.equal(JSON.stringify((await db.query("SELECT * FROM requests WHERE id='r1'")).rows[0]),snapshot);
await db.query("UPDATE requests SET start=$1,\"end\"=$1,days=$2,status='approved' WHERE id='r2'",[next,JSON.stringify([next])]);
assert.equal((await post({...current,action:'editApproved',start:next,end:next})).status,400);
assert.equal(JSON.stringify((await db.query("SELECT * FROM requests WHERE id='r1'")).rows[0]),snapshot); // rejected move leaves old dates
assert.equal((await post({...current,action:'editApproved',start:next,end:next,override:true})).status,200);
await db.query("UPDATE requests SET start=$1,\"end\"=$1,days=$2 WHERE id='r3'",[next,JSON.stringify([next])]);
assert.equal((await post({admin:true,id:'r3',action:'approve',override:true})).status,400); // no third person
assert.equal((await post({...payload,originalStart:next,originalEnd:next,action:'editApproved',start:next,end:next,override:false})).status,400); // cannot remove required override
assert.equal((await post({...payload,originalStart:next,originalEnd:next,action:'deleteApproved'})).status,200);
assert.equal((await db.query("SELECT * FROM requests WHERE id='r1'")).rows.length,0);
assert.equal((await db.query("SELECT * FROM requests WHERE id='r2'")).rows[0].status,'approved');
assert.equal((await db.query('SELECT * FROM employees')).rows.length,3);
assert.equal((await db.query("SELECT * FROM outbox WHERE employee_id='a'")).rows.length,3); // successful edits and deletion only
assert.equal((await post({...payload,originalStart:next,originalEnd:next,action:'deleteApproved'})).status,400);
await db.close();console.log('Approved leave edits, deletion, conflicts, override, stale dates, access checks and notifications passed.');
