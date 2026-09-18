import { useEffect } from 'react';

export default function ScrollProgress(){
  useEffect(()=>{
    const update=()=>{
      const h=document.documentElement.scrollHeight-window.innerHeight;
      const p=h>0?window.scrollY/h:0;
      document.documentElement.style.setProperty('--scroll-progress',String(Math.min(1,Math.max(0,p))));
    };
    update();
    window.addEventListener('scroll',update,{passive:true});
    window.addEventListener('resize',update);
    return()=>{
      window.removeEventListener('scroll',update);
      window.removeEventListener('resize',update);
    };
  },[]);

  return <div className="scroll-progress" aria-hidden="true"><span/></div>;
}
