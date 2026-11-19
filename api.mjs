import worker from '../../server.mjs';
export async function handler(event){
 const url=new URL(event.rawUrl||'https://example.invalid/api/sales');
 url.pathname='/api/sales';
 for(const [key,value] of Object.entries(event.queryStringParameters||{}))url.searchParams.set(key,value);
 try{
  const response=await worker.fetch(new Request(url));
  return{statusCode:response.status,headers:Object.fromEntries(response.headers),body:await response.text()};
 }catch{
  return{statusCode:502,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'Steam временно недоступен'})};
 }
}
