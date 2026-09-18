import { useEffect, useState } from 'react';

export default function IntroLoader(){
  const [visible,setVisible]=useState(false);

  useEffect(()=>{
    const seen=sessionStorage.getItem('at-intro-seen');
    if(seen) return;
    setVisible(true);
    const timer=setTimeout(()=>{
      setVisible(false);
      sessionStorage.setItem('at-intro-seen','1');
    },1050);
    return()=>clearTimeout(timer);
  },[]);

  if(!visible) return null;

  return <div className="intro-loader" aria-hidden="true">
    <div className="intro-mark">A.T</div>
    <div className="intro-line"><span/></div>
    <p>NAIL LAB</p>
  </div>;
}
