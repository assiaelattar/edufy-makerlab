import { useEffect, useLayoutEffect, useState } from 'react';

// Ephemeral, scoped to this browser tab and identity. Never store school records or credentials.
const views = new Map<string, unknown>();
export function useWorkspaceViewState<T>(scope:string, field:string, initial:T) {
  const key=`${scope}:${field}`;
  const [state,setState]=useState<{key:string;value:T}>(()=>({key,value:views.has(key)?views.get(key) as T:initial}));
  const value=state.key===key?state.value:views.has(key)?views.get(key) as T:initial;
  const setValue=(next:React.SetStateAction<T>)=>setState(previous=>{
    const current=previous.key===key?previous.value:views.has(key)?views.get(key) as T:initial;
    const resolved=typeof next==='function'?(next as (value:T)=>T)(current):next;
    views.set(key,resolved); return {key,value:resolved};
  });
  useEffect(()=>{ if(!views.has(key))views.set(key,initial); },[key]);
  return [value,setValue] as const;
}
export function useWorkspaceScroll(scope:string) {
  useLayoutEffect(()=>{
    const container=document.querySelector<HTMLElement>('.edu-shell-v1__content') || document.querySelector<HTMLElement>('.atlas-module-content');
    const target=container||window;
    const key=`${scope}:scroll`;
    let restoring=true;
    const save=()=>{if(!restoring)views.set(key,container?container.scrollTop:window.scrollY);};
    let second=0;
    const first=requestAnimationFrame(()=>{second=requestAnimationFrame(()=>{const top=Number(views.get(key)||0);if(container)container.scrollTop=top;else window.scrollTo(0,top);restoring=false;});});
    target.addEventListener('scroll',save,{passive:true});
    return()=>{cancelAnimationFrame(first);cancelAnimationFrame(second);target.removeEventListener('scroll',save);};
  },[scope]);
}
