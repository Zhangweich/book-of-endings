import {languages,resolveLocale,formatMessage,sourceIndex} from './locale-core.js?v=0.5.6';
export {languages};
const version='0.5.6';
let locale='zh', base={}, translated={}, index=new Map();
const cache=new Map();
const textSources=new WeakMap(), attributeSources=new WeakMap();
let observer,queued=false;
export const getLocale=()=>locale;
export const localeTag=()=>languages.find(l=>l.code===locale).tag;
export function t(source,...args){
  if(typeof source!=='string')return String(source??'');
  const trimmed=source.trim(),id=index.get(trimmed);
  const result=id?(translated[id]??base[id]):trimmed;
  const prefix=source.slice(0,source.length-source.trimStart().length);
  const suffix=source.slice(source.trimEnd().length);
  return prefix+formatMessage(result,args)+suffix;
}
export const listNames=values=>values.map(value=>t(value)).join(locale==='zh'||locale==='ja'?'、':locale==='ar'?'، ':', ');
export function setMessage(node,source,...args){
  node.dataset.i18nMessage=source;node.dataset.i18nArgs=JSON.stringify(args);node.textContent=t(source,...args);
}
export function localizeDOM(){
  if(!document.body)return;
  observer?.disconnect();
  for(const node of document.querySelectorAll('[data-i18n-message]')){const next=t(node.dataset.i18nMessage,...JSON.parse(node.dataset.i18nArgs||'[]'));if(node.textContent!==next)node.textContent=next;}
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  let node;
  while((node=walker.nextNode())){
    if(!node.parentElement || node.parentElement.closest('[data-no-i18n],[data-i18n-message],script,style,textarea'))continue;
    const previous=textSources.get(node);
    const raw=previous&&node.nodeValue===previous.last?previous.raw:node.nodeValue;
    const next=t(raw);
    textSources.set(node,{raw,last:next});
    if(node.nodeValue!==next)node.nodeValue=next;
  }
  for(const element of document.querySelectorAll('[placeholder],[aria-label],[title],img[alt],meta[name="description"]')){
    if(element.closest('[data-no-i18n]'))continue;
    const records=attributeSources.get(element)||{};
    for(const name of ['placeholder','aria-label','title','alt','content']){
      if(!element.hasAttribute(name))continue;
      const value=element.getAttribute(name),previous=records[name];
      const raw=previous&&value===previous.last?previous.raw:value;
      const next=t(raw);records[name]={raw,last:next};
      if(value!==next)element.setAttribute(name,next);
    }
    attributeSources.set(element,records);
  }
  observer?.observe(document.body,{subtree:true,childList:true,characterData:true});
}
async function catalog(code){
  if(cache.has(code))return cache.get(code);
  const response=await fetch(new URL(`./locales/${code}.json?v=${version}`,import.meta.url),{cache:'no-store'});
  if(!response.ok)throw new Error('Language file unavailable');
  const result=await response.json();
  if(Object.keys(base).length && Object.keys(base).some(k=>typeof result[k]!=='string'||!result[k].trim()))throw new Error('Language file incomplete');
  cache.set(code,result);return result;
}
export async function setLocale(code,{persist=true}={}){
  if(!languages.some(l=>l.code===code))return false;
  const next=await catalog(code);
  translated=next;locale=code;
  const language=languages.find(l=>l.code===code);
  document.documentElement.lang=language.tag;document.documentElement.dir=language.dir;
  document.documentElement.dataset.locale=code;
  const select=document.getElementById('language-select');if(select)select.value=code;
  if(persist){try{localStorage.setItem('book-of-endings:locale',code);}catch{}}
  const url=new URL(location.href);url.searchParams.set('lang',code);history.replaceState(null,'',url);
  localizeDOM();
  window.dispatchEvent(new CustomEvent('book-language-change',{detail:{locale:code}}));
  return true;
}
export async function initI18n(){
  base=await catalog('zh');translated=base;index=sourceIndex(base);
  const select=document.getElementById('language-select');
  for(const language of languages){const option=document.createElement('option');option.value=language.code;option.textContent=language.name;option.lang=language.tag;select.append(option);}
  let saved;try{saved=localStorage.getItem('book-of-endings:locale');}catch{}
  const desired=resolveLocale(new URLSearchParams(location.search).get('lang'),saved);
  try{await setLocale(desired,{persist:false});}catch{await setLocale('zh',{persist:false});}
  select.addEventListener('change',async()=>{
    select.disabled=true;
    try{await setLocale(select.value);}
    catch{select.value=locale;const box=document.getElementById('toast');box.textContent=t('语言切换失败，已保留当前语言。');box.hidden=false;}
    finally{select.disabled=false;}
  });
  observer=new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;localizeDOM();});});
  localizeDOM();
}
