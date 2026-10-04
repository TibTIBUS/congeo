import {GET,POST} from './planning';
export default {
 async fetch(request:Request):Promise<Response>{
  const origin=request.headers.get('Origin');
  const allowed=(process.env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
  if(origin&&!allowed.includes(origin))return Response.json({error:'Origine non autorisée.'},{status:403});
  const headers=new Headers({'Cache-Control':'no-store','Vary':'Origin'});
  if(origin){headers.set('Access-Control-Allow-Origin',origin);headers.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');headers.set('Access-Control-Allow-Headers','Content-Type');headers.set('Access-Control-Max-Age','600');}
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  const path=new URL(request.url).pathname;
  let response:Response;
  if(path==='/health'&&request.method==='GET')response=Response.json({ok:true,application:'congeo'});
  else if(path!=='/api/planning')response=Response.json({error:'Page introuvable.'},{status:404});
  else if(request.method==='GET')response=await GET(request);
  else if(request.method==='POST')response=await POST(request);
  else response=Response.json({error:'Méthode non autorisée.'},{status:405,headers:{Allow:'GET, POST, OPTIONS'}});
  const result=new Response(response.body,response);headers.forEach((v,k)=>result.headers.set(k,v));return result;
 }
};
