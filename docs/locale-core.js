export const languages = [
  {code:'zh', name:'简体中文', tag:'zh-CN', dir:'ltr'},
  {code:'en', name:'English', tag:'en', dir:'ltr'}
];
export function resolveLocale(query,saved){
  for(const value of [query,saved]){
    const code=typeof value==='string'?value.toLowerCase().split('-')[0]:'';
    if(languages.some(l=>l.code===code))return code;
  }
  return 'zh';
}
export function formatMessage(message,args=[]){
  return message.replace(/\{(\d+)\}/g,(match,i)=>i<args.length?String(args[i]):match);
}
export function sourceIndex(catalog){return new Map(Object.entries(catalog).map(([id,text])=>[text.trim(),id]));}
