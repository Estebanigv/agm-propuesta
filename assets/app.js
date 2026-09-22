/* AGM mejorada — interacción: menú, buscador, cotizador B2B, filtros, galería */
(function(){
'use strict';
var WA='56977699321', MAIL='ventas@agm.cl', KEY='agm_cotizacion_v1';
var R = document.documentElement.getAttribute('data-root') || '';
var IR = R + (document.documentElement.getAttribute('data-img') || '../'); // prefijo de imágenes
var $=function(s,c){return (c||document).querySelector(s)}, $$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))};
window.AGM = window.AGM || {};

/* ---------- utilidades ---------- */
function clp(n){ return '$'+ (n||0).toLocaleString('es-CL'); }
function toast(msg){
  var t=$('#toast'); if(!t){ t=document.createElement('div'); t.id='toast'; t.className='toast'; document.body.appendChild(t); }
  t.textContent=msg; t.setAttribute('data-show',''); clearTimeout(t._t);
  t._t=setTimeout(function(){ t.removeAttribute('data-show'); },2600);
}
function store(v){ try{ if(v===undefined) return JSON.parse(localStorage.getItem(KEY)||'[]'); localStorage.setItem(KEY,JSON.stringify(v)); }catch(e){ return window._mem||[] } }
function save(v){ window._mem=v; try{ localStorage.setItem(KEY,JSON.stringify(v)); }catch(e){} }
function load(){ if(window._mem) return window._mem; var v=[]; try{ v=JSON.parse(localStorage.getItem(KEY)||'[]')||[]; }catch(e){} window._mem=v; return v; }
function norm(s){ return (s||'').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }
function lock(on){ document.body.toggleAttribute('data-lock', !!on); var o=$('#overlay'); if(o) o.toggleAttribute('data-open', !!on); }

/* ---------- header, menú, overlay ---------- */
var header=$('.header');
if(header){
  var onScroll=function(){
    var y=window.scrollY;
    header.classList.toggle('header--scrolled', y>6);
    document.documentElement.toggleAttribute('data-scrolled', y>90);
  };
  onScroll(); addEventListener('scroll',onScroll,{passive:true});
}
function closeAll(){ $$('[data-open]').forEach(function(el){ if(el.id!=='toast') el.removeAttribute('data-open'); }); lock(false); }
$$('[data-toggle]').forEach(function(btn){
  btn.addEventListener('click',function(e){
    e.preventDefault();
    var el=$('#'+btn.getAttribute('data-toggle')); if(!el) return;
    var open=el.hasAttribute('data-open'); closeAll();
    if(!open){ el.setAttribute('data-open',''); lock(true); var f=el.querySelector('input,button,a'); if(f && el.id==='search') setTimeout(function(){f.focus()},120); }
  });
});
var ov=$('#overlay'); if(ov) ov.addEventListener('click',closeAll);
$$('[data-close]').forEach(function(b){ b.addEventListener('click',closeAll); });
addEventListener('keydown',function(e){ if(e.key==='Escape') closeAll(); });

/* ---------- buscador ---------- */
var P = window.AGM_PRODUCTS || [];
function buscar(q,lim){
  var t=norm(q).split(/\s+/).filter(Boolean); if(!t.length) return [];
  return P.filter(function(p){ var h=norm(p.t+' '+p.k); return t.every(function(x){return h.indexOf(x)>-1}); }).slice(0,lim||8);
}
AGM.buscar=buscar;
var sInput=$('#search-input'), sRes=$('#search-results');
if(sInput){
  var render=function(){
    var q=sInput.value.trim();
    if(!q){ sRes.innerHTML='<p class="search__meta">Escribe al menos 2 letras. Ej: escritorio, banqueta, estante.</p>'; return; }
    var r=buscar(q,8);
    sRes.innerHTML = r.length ? r.map(function(p){
      return '<a class="search__item" href="'+R+'producto/'+p.h+'.html"><img src="'+IR+p.i+'" alt="" loading="lazy"><span><b>'+p.t+'</b><br><span class="search__meta">'+clp(p.p)+(p.s?' · SKU '+p.s:'')+'</span></span></a>';
    }).join('') + '<a class="btn btn--dark btn--sm" href="'+R+'catalogo.html?q='+encodeURIComponent(q)+'">Ver todos los resultados</a>'
      : '<p class="search__meta">Sin resultados para “'+q+'”. Prueba con otra palabra o <a href="'+R+'empresas.html">pide una cotización</a>.</p>';
  };
  sInput.addEventListener('input',render); render();
  var sForm=$('#search-form');
  if(sForm) sForm.addEventListener('submit',function(e){ e.preventDefault(); var q=sInput.value.trim(); if(q) location.href=R+'catalogo.html?q='+encodeURIComponent(q); });
}

/* ---------- cotizador (carro B2B) ---------- */
function count(){ return load().reduce(function(a,b){ return a+b.q; },0); }
function total(){ return load().reduce(function(a,b){ return a+b.q*b.p; },0); }
function badge(){
  $$('[data-quote-count]').forEach(function(el){ var c=count(); el.textContent=c; el.hidden=!c; });
}
function add(item,qty){
  var v=load(), f=v.filter(function(x){return x.h===item.h})[0];
  if(f) f.q+=qty||1; else v.push({h:item.h,t:item.t,p:item.p,i:item.i,s:item.s||'',q:qty||1});
  save(v); badge(); paint();
  toast('Agregado a tu cotización: '+item.t);
}
AGM.add=add;
function setQty(h,q){ var v=load(); v.forEach(function(x){ if(x.h===h) x.q=Math.max(1,Math.min(9999,q)); }); save(v); badge(); paint(); }
function rm(h){ save(load().filter(function(x){return x.h!==h})); badge(); paint(); }
function clear(){ save([]); badge(); paint(); }
AGM.clear=clear;
function itemHTML(x){
  return '<div class="qitem" data-h="'+x.h+'"><img src="'+IR+x.i+'" alt="" loading="lazy">'+
    '<div><div class="qitem__t">'+x.t+'</div>'+(x.s?'<div class="qitem__sku">SKU '+x.s+'</div>':'')+
    '<div class="qty"><button type="button" data-q="-" aria-label="Restar">−</button><input type="number" min="1" value="'+x.q+'" aria-label="Cantidad"><button type="button" data-q="+" aria-label="Sumar">+</button></div>'+
    '<div class="qitem__sku">'+clp(x.p)+' c/u · '+clp(x.p*x.q)+'</div></div>'+
    '<button class="qitem__rm" type="button" data-rm aria-label="Quitar">×</button></div>';
}
function paint(){
  var v=load();
  $$('[data-quote-list]').forEach(function(list){
    list.innerHTML = v.length ? v.map(itemHTML).join('')
      : '<div class="quote-empty"><p><b>Tu cotización está vacía</b></p><p>Agrega productos desde el catálogo o búscalos aquí abajo.</p></div>';
  });
  $$('[data-quote-total]').forEach(function(el){ el.textContent=clp(total()); });
  $$('[data-quote-units]').forEach(function(el){ el.textContent=count(); });
  $$('[data-quote-lines]').forEach(function(el){ el.textContent=v.length; });
  $$('[data-quote-disabled]').forEach(function(el){ el.toggleAttribute('disabled', v.length===0); });
  $$('[data-quote-desc]').forEach(function(el){ var d=tramo(count()); el.textContent = d ? ('Volumen estimado: descuento referencial '+d+'% — se confirma en la cotización formal.') : 'Desde 10 unidades aplican precios por volumen.'; });
}
function tramo(u){ return u>=100?15:u>=50?10:u>=20?7:u>=10?4:0; }
document.addEventListener('click',function(e){
  var rmb=e.target.closest('[data-rm]'); if(rmb){ rm(rmb.closest('.qitem').getAttribute('data-h')); return; }
  var qb=e.target.closest('.qitem [data-q]');
  if(qb){ var box=qb.closest('.qitem'), inp=box.querySelector('input'); setQty(box.getAttribute('data-h'), (parseInt(inp.value,10)||1)+(qb.getAttribute('data-q')==='+'?1:-1)); return; }
  var addb=e.target.closest('[data-add]');
  if(addb){
    e.preventDefault();
    var d=JSON.parse(addb.getAttribute('data-add'));
    var qi=addb.getAttribute('data-qty-from') ? $(addb.getAttribute('data-qty-from')) : null;
    add(d, qi ? (parseInt(qi.value,10)||1) : 1);
    addb.classList.add('is-added'); var prev=addb.textContent; addb.textContent='✓ Agregado';
    setTimeout(function(){ addb.classList.remove('is-added'); addb.textContent=prev; },1800);
  }
  var cl=e.target.closest('[data-quote-clear]'); if(cl){ clear(); toast('Cotización vaciada'); }
});
document.addEventListener('change',function(e){
  var inp=e.target.closest('.qitem input'); if(inp) setQty(inp.closest('.qitem').getAttribute('data-h'), parseInt(inp.value,10)||1);
});

/* ---------- mensaje de cotización ---------- */
function resumen(){
  var v=load(); if(!v.length) return '';
  return v.map(function(x,i){ return (i+1)+') '+x.t+(x.s?' [SKU '+x.s+']':'')+' — '+x.q+' un. — '+clp(x.p*x.q); }).join('\n')
    + '\nTotal referencial: '+clp(total())+' ('+count()+' unidades)';
}
AGM.resumen=resumen;
function datosForm(form){
  var o={}; $$('input,select,textarea',form).forEach(function(el){ if(el.name && el.value) o[el.name]=el.value.trim(); }); return o;
}
function valida(form){
  var ok=true;
  $$('[required]',form).forEach(function(el){
    var bad=!el.value.trim() || (el.type==='email' && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(el.value));
    el.closest('.field').classList.toggle('field--error',bad); if(bad) ok=false;
  });
  return ok;
}
function mensaje(d){
  var L=['*Solicitud de cotización — AGM Chile*'];
  var map={empresa:'Empresa',rut:'RUT',nombre:'Contacto',email:'Email',telefono:'Teléfono',rubro:'Rubro',plazo:'Plazo',comuna:'Comuna/Región',mensaje:'Detalle'};
  Object.keys(map).forEach(function(k){ if(d[k]) L.push(map[k]+': '+d[k]); });
  var r=resumen(); if(r) L.push('','*Productos:*',r);
  if(!r && d.producto) L.push('','Producto: '+d.producto);
  return L.join('\n');
}
AGM.mensaje=mensaje;
$$('form[data-quote-form]').forEach(function(form){
  form.addEventListener('submit',function(e){
    e.preventDefault();
    if(!valida(form)){ toast('Revisa los campos marcados'); return; }
    var d=datosForm(form), txt=mensaje(d), via=(e.submitter&&e.submitter.getAttribute('data-via'))||form.getAttribute('data-via')||'wa';
    if(via==='mail'){
      location.href='mailto:'+MAIL+'?subject='+encodeURIComponent('Cotización '+(d.empresa||'empresa')+' — AGM')+'&body='+encodeURIComponent(txt);
    }else{
      window.open('https://wa.me/'+WA+'?text='+encodeURIComponent(txt),'_blank','noopener');
    }
    toast('Listo: enviamos tu solicitud al canal elegido');
  });
});
$$('[data-copy]').forEach(function(b){
  b.addEventListener('click',function(){
    var txt=mensaje(datosForm($('#form-cotizacion')||document));
    if(navigator.clipboard) navigator.clipboard.writeText(txt).then(function(){ toast('Cotización copiada al portapapeles'); });
  });
});
$$('[data-csv]').forEach(function(b){
  b.addEventListener('click',function(){
    var v=load(); if(!v.length){ toast('Agrega productos primero'); return; }
    var rows=[['SKU','Producto','Cantidad','Precio unitario','Subtotal']].concat(v.map(function(x){ return [x.s,x.t,x.q,x.p,x.p*x.q]; }));
    var csv='﻿'+rows.map(function(r){ return r.map(function(c){ return '"'+String(c).replace(/"/g,'""')+'"'; }).join(';'); }).join('\n');
    var a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='cotizacion-agm.csv'; a.click();
    toast('Descargando cotizacion-agm.csv');
  });
});

/* ---------- buscador del cotizador B2B ---------- */
var pIn=$('#picker-input'), pRes=$('#picker-results');
if(pIn){
  pIn.addEventListener('input',function(){
    var r=buscar(pIn.value,6);
    pRes.innerHTML=r.map(function(p){
      return '<button type="button" data-add=\''+JSON.stringify({h:p.h,t:p.t,p:p.p,i:p.i,s:p.s}).replace(/'/g,'&#39;')+'\'><img src="'+IR+p.i+'" alt=""><span><b>'+p.t+'</b><br><span class="search__meta">'+clp(p.p)+'</span></span></button>';
    }).join('');
    pRes.toggleAttribute('data-open', r.length>0);
  });
  document.addEventListener('click',function(e){ if(!e.target.closest('.picker__search')) pRes.removeAttribute('data-open'); });
}

/* ---------- catálogo: filtros, orden, paginación ---------- */
var grid=$('#cat-grid');
if(grid){
  var qs=new URLSearchParams(location.search);
  var state={q:qs.get('q')||'',cats:qs.get('cat')?[qs.get('cat')]:[],min:'',max:'',sort:'rel',stock:false,off:false,page:1,per:24};
  var base = grid.getAttribute('data-scope') ? P.filter(function(p){ return p.c.indexOf(grid.getAttribute('data-scope'))>-1; }) : P;
  var qInput=$('#cat-q'); if(qInput) qInput.value=state.q;
  function aplicar(){
    var t=norm(state.q).split(/\s+/).filter(Boolean);
    var out=base.filter(function(p){
      if(t.length && !t.every(function(x){ return norm(p.t+' '+p.k).indexOf(x)>-1; })) return false;
      if(state.cats.length && !state.cats.some(function(c){ return p.c.indexOf(c)>-1; })) return false;
      if(state.min && p.p<+state.min) return false;
      if(state.max && p.p>+state.max) return false;
      if(state.off && !p.o) return false;
      return true;
    });
    var s=state.sort;
    out.sort(function(a,b){
      if(s==='price-asc') return a.p-b.p;
      if(s==='price-desc') return b.p-a.p;
      if(s==='name') return a.t.localeCompare(b.t,'es');
      if(s==='off') return (b.o||0)-(a.o||0);
      return 0;
    });
    return out;
  }
  function card(p){
    var off=p.o?'<span class="badge badge--off">-'+p.o+'%</span>':'';
    return '<article class="card reveal is-in"><a class="card__media" href="'+R+'producto/'+p.h+'.html"><div class="card__badges">'+off+'</div>'+
      '<img src="'+IR+p.i+'" alt="'+p.t+'" loading="lazy" width="600" height="600"></a>'+
      '<div class="card__body"><span class="card__type">'+(p.y||'AGM Chile')+'</span>'+
      '<h3 class="card__title"><a href="'+R+'producto/'+p.h+'.html">'+p.t+'</a></h3>'+
      '<div class="card__price"><b>'+clp(p.p)+'</b>'+(p.cp?'<s>'+clp(p.cp)+'</s>':'')+'</div>'+
      '<button class="btn btn--ghost btn--sm card__add" type="button" data-add=\''+JSON.stringify({h:p.h,t:p.t,p:p.p,i:p.i,s:p.s}).replace(/'/g,'&#39;')+'\'>+ Cotizar</button>'+
      '</div></article>';
  }
  function pintar(){
    var res=aplicar(), n=res.length, hasta=state.page*state.per;
    grid.innerHTML = n ? res.slice(0,hasta).map(card).join('') : '';
    $('#cat-empty').hidden = n>0;
    $('#cat-count').textContent = n+(n===1?' producto':' productos');
    var more=$('#cat-more'); if(more) more.hidden = hasta>=n;
  }
  $$('[data-filter]').forEach(function(el){
    el.addEventListener('change',function(){
      var k=el.getAttribute('data-filter');
      if(k==='cat'){ state.cats=$$('[data-filter=cat]:checked').map(function(x){return x.value}); }
      else if(k==='off'){ state.off=el.checked; }
      else state[k]=el.value;
      state.page=1; pintar();
    });
  });
  if(qInput) qInput.addEventListener('input',function(){ state.q=qInput.value; state.page=1; pintar(); });
  var sortSel=$('#cat-sort'); if(sortSel) sortSel.addEventListener('change',function(){ state.sort=sortSel.value; pintar(); });
  var more=$('#cat-more'); if(more) more.addEventListener('click',function(){ state.page++; pintar(); });
  var ft=$('#filters-toggle'); if(ft) ft.addEventListener('click',function(){ $('#filters').toggleAttribute('data-open'); });
  pintar();
}

/* ---------- galería PDP ---------- */
var gal=$('#gallery');
if(gal){
  var main=$('#gallery-main');
  $$('#gallery-thumbs button').forEach(function(b){
    b.addEventListener('click',function(){
      main.src=b.getAttribute('data-src');
      $$('#gallery-thumbs button').forEach(function(x){ x.setAttribute('aria-current', x===b?'true':'false'); });
    });
  });
}

/* ---------- chips por rubro (B2B) ---------- */
$$('[data-chips]').forEach(function(box){
  var chips=$$('.chip',box);
  chips.forEach(function(c){
    c.addEventListener('click',function(){
      chips.forEach(function(x){ x.setAttribute('aria-selected', x===c?'true':'false'); });
      var id=c.getAttribute('data-target');
      $$('[data-rubro]').forEach(function(p){ p.hidden = p.getAttribute('data-rubro')!==id; });
    });
  });
});

/* ---------- reveal ---------- */
var io=('IntersectionObserver' in window) ? new IntersectionObserver(function(es){
  es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('is-in'); io.unobserve(e.target); } });
},{rootMargin:'0px 0px -8% 0px'}) : null;
$$('.reveal').forEach(function(el){ io ? io.observe(el) : el.classList.add('is-in'); });

badge(); paint();
})();
