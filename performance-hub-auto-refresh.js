const activeRefreshes=new WeakMap();
export function autoRefresh(root,refresh,{window:win=window,document:doc=document,interval=30000}={}){
  activeRefreshes.get(root)?.();
  let running=false,stopped=false,lastAttempt=0;
  const check=async()=>{
    if(!root.isConnected){stop();return;}
    if(stopped||running||root.hidden||doc.hidden||Date.now()-lastAttempt<10000)return;
    if(root.querySelector('.cal-link-form:focus-within,.cal-review[open],.cal-coach-access[open],.cal-setup[open],[data-airtable-setup][open]'))return;
    running=true;lastAttempt=Date.now();
    try{await refresh();}catch{}finally{running=false;}
  };
  const timer=win.setInterval(check,interval);
  doc.addEventListener('visibilitychange',check);win.addEventListener('focus',check);win.addEventListener('online',check);
  function stop(){stopped=true;win.clearInterval(timer);doc.removeEventListener('visibilitychange',check);win.removeEventListener('focus',check);win.removeEventListener('online',check);if(activeRefreshes.get(root)===stop)activeRefreshes.delete(root);}
  activeRefreshes.set(root,stop);return stop;
}
