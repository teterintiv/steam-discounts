const el = id => document.getElementById(id);
const money = (value,currency) => new Intl.NumberFormat('ru-RU',{style:'currency',currency,minimumFractionDigits:0,maximumFractionDigits:2}).format(value).replace('KZT','₸');
let data=null;
let favoritesOnly=false;
let page=1;
const pageSize=25;
let saved;
try { saved=new Set(JSON.parse(localStorage.getItem('steam-kz-favorites')||'[]')); } catch { saved=new Set(); }
try { const region=localStorage.getItem('steam-region'); if([...el('region').options].some(o=>o.value===region)) el('region').value=region; } catch {}
let requestNumber=0;
function escapeHTML(value){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
function expiry(timestamp){
 if(!timestamp) return '<span class="ends">Срок не указан</span>';
 const date=new Date(timestamp*1000);
 const hours=Math.ceil((date-Date.now())/3600000);
 if(hours<=0) return '<span class="ends">Завершена</span>';
 const remaining=hours<24?`Меньше ${hours} ч`:`${Math.ceil(hours/24)} дн.`;
 return `<span class="ends ${hours<=48?'soon':''}">${remaining}<small>до ${date.toLocaleDateString('ru-RU',{day:'numeric',month:'short'})}</small></span>`;
}
function render(){
 if(!data) return;
 const query=el('search').value.trim().toLocaleLowerCase('ru');
 const games=data.games.filter(game=>(!favoritesOnly||saved.has(game.id))&&(!el('bigDiscount').checked||game.discount>=50)&&game.name.toLocaleLowerCase('ru').includes(query));
 const order=el('sort').value;
 if(order==='discount') games.sort((a,b)=>b.discount-a.discount);
 if(order==='price') games.sort((a,b)=>a.price-b.price);
 if(order==='end') games.sort((a,b)=>(a.ends||Infinity)-(b.ends||Infinity));
 if(order==='name') games.sort((a,b)=>a.name.localeCompare(b.name));
 const pages=Math.max(1,Math.ceil(games.length/pageSize));
 page=Math.min(page,pages);
 el('savedCount').textContent=data.games.filter(game=>saved.has(game.id)).length;
 el('total').textContent=`Найдено ${games.length} из ${data.games.length}`;
 el('all').classList.toggle('active',!favoritesOnly);
 el('all').setAttribute('aria-pressed',String(!favoritesOnly));
 el('favorites').classList.toggle('active',favoritesOnly);
 el('favorites').setAttribute('aria-pressed',String(favoritesOnly));
 const region=el('region').value;
 el('storeLink').href=`https://store.steampowered.com/?cc=${region}`;
 el('allSalesLink').href=`https://store.steampowered.com/search/?specials=1&cc=${region}`;
 el('regionNote').textContent=data.currency==='USD'?`${data.country}: Steam выставляет цены в долларах США. Состав каталога зависит от страны.`:region==='ru'?'Россия: некоторые игры и способы оплаты могут быть недоступны в Steam.':'Состав каталога и цены зависят от страны аккаунта Steam.';
 el('list').innerHTML=games.slice((page-1)*pageSize,page*pageSize).map(game=>{
  const link=`https://store.steampowered.com/app/${game.id}/?cc=${region}`;
  return `<article class="game"><div class="game-info"><a href="${link}" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true"><img src="${escapeHTML(game.image)}" alt="" loading="lazy" referrerpolicy="no-referrer"></a><div><a class="game-title" href="${link}" target="_blank" rel="noopener noreferrer">${escapeHTML(game.name)}</a><div class="platforms">${[game.windows&&'Windows',game.mac&&'macOS',game.linux&&'Linux'].filter(Boolean).join(' · ')}</div></div></div><span class="discount">−${game.discount}%</span><div class="price"><span class="old-price">${money(game.original,data.currency)}</span><span class="kzt">${money(game.price,data.currency)}</span>${data.rate&&data.currency!=='RUB'?`<span class="rub">≈ ${money(game.price*data.rate,'RUB')}</span>`:''}</div>${expiry(game.ends)}<button class="save" data-id="${game.id}" aria-pressed="${saved.has(game.id)}" aria-label="${saved.has(game.id)?'Убрать из избранного':'В избранное'}: ${escapeHTML(game.name)}">${saved.has(game.id)?'★':'☆'}</button></article>`;
 }).join('');
 el('empty').hidden=games.length!==0;
 el('emptyText').textContent=favoritesOnly?'В этом регионе нет сохранённых игр. Добавь их кнопкой со звёздочкой.':'Попробуй изменить запрос или убрать фильтр.';
 el('pagination').hidden=games.length<=pageSize;
 el('pagination').innerHTML=`<button data-page="${page-1}" ${page===1?'disabled':''}>Назад</button><span>Страница ${page} из ${pages}</span><button data-page="${page+1}" ${page===pages?'disabled':''}>Далее</button>`;
}
async function load(){
 const ticket=++requestNumber;
 const region=el('region').value;
 el('refresh').disabled=true;
 el('refresh').textContent='Загружаем…';
 data=null;
 page=1;
 el('list').innerHTML='';
 el('pagination').hidden=true;
 el('empty').hidden=true;
 el('status').classList.remove('warning');
 el('status').textContent='Получаем предложения Steam…';
 el('total').textContent='Загрузка…';
 try{
  let result;
  try{
   const response=await fetch(`/api/sales?region=${region}`,{cache:'no-store',signal:AbortSignal.timeout(25000)});
   if(!response.ok) throw new Error();
   result=await response.json();
  }catch{
   const response=await fetch('snapshots.json',{cache:'no-store'});
   if(!response.ok) throw new Error();
   const snapshots=await response.json();
   if(!snapshots[region]) throw new Error();
   result={...snapshots[region],stale:true};
  }
  if(ticket!==requestNumber) return;
  if(!Array.isArray(result.games)||result.region.toLowerCase()!==region) throw new Error();
  data=result;
  const date=new Date(data.updated).toLocaleString('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});
  el('status').classList.toggle('warning',Boolean(data.stale));
  el('status').textContent=data.stale?`${data.country} · сохранённые цены от ${date}. Steam сейчас недоступен.`:`${data.country} · ${data.currency} · обновлено ${date}`;
  if(data.currency==='RUB') el('rate').textContent='В российском магазине цены уже указаны в рублях. Дополнительный пересчёт не нужен.';
  else el('rate').textContent=data.rate?`Курс ЦБ РФ на ${data.rateDate}: ${money(1,data.currency)} ≈ ${money(data.rate,'RUB')}. Сумма в рублях указана для сравнения.`:'Курс этой валюты сейчас недоступен. Показываем цену магазина без пересчёта.';
  render();
 }catch{
  if(ticket!==requestNumber) return;
  el('status').classList.add('warning');
  el('status').textContent='Не удалось получить цены. Попробуй обновить страницу позже.';
  el('total').textContent='Нет данных';
  el('empty').hidden=false;
  el('emptyText').textContent='Steam временно не отвечает.';
 }finally{
  if(ticket===requestNumber){el('refresh').disabled=false;el('refresh').textContent='Обновить';}
 }
}
function filterChanged(){page=1;render();}
el('all').addEventListener('click',()=>{favoritesOnly=false;filterChanged();});
el('favorites').addEventListener('click',()=>{favoritesOnly=true;filterChanged();});
el('search').addEventListener('input',filterChanged);
el('sort').addEventListener('change',filterChanged);
el('bigDiscount').addEventListener('change',filterChanged);
el('refresh').addEventListener('click',load);
el('region').addEventListener('change',()=>{try{localStorage.setItem('steam-region',el('region').value);}catch{}load();});
el('reset').addEventListener('click',()=>{favoritesOnly=false;el('search').value='';el('bigDiscount').checked=false;el('sort').value='default';filterChanged();});
el('pagination').addEventListener('click',event=>{const button=event.target.closest('[data-page]');if(!button||button.disabled)return;page=Number(button.dataset.page);render();document.querySelector('.toolbar').scrollIntoView({block:'start'});});
el('list').addEventListener('click',event=>{const button=event.target.closest('[data-id]');if(!button)return;const id=Number(button.dataset.id);saved.has(id)?saved.delete(id):saved.add(id);try{localStorage.setItem('steam-kz-favorites',JSON.stringify([...saved]));}catch{}render();});
load();
