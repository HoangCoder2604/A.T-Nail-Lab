import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { salon } from '../data/salon';

const links = [
  ['Trang chủ', '#home'],
  ['Dịch vụ', '#services'],
  ['Bộ sưu tập', '#gallery'],
  ['Bảng giá', '#pricing'],
  ['Về A.T', '#about']
];

export default function Header(){
  const [open,setOpen] = useState(false);
  const [solid,setSolid] = useState(false);
  useEffect(()=>{
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, {passive:true});
    return ()=>window.removeEventListener('scroll',onScroll);
  },[]);

  return <header className={`header ${solid?'solid':''}`}>
    <a className="brand" href="#home" aria-label="A.T Nail Lab">
      <strong>A.T NAIL LAB</strong>
      <small>NAIL • BEAUTY • YOU</small>
    </a>
    <nav className="desktop-nav">
      {links.map(([label,href])=><a key={href} href={href}>{label}</a>)}
    </nav>
    <a className="header-cta" href="#booking">Đặt lịch ngay</a>
    <button className="menu-btn" onClick={()=>setOpen(v=>!v)} aria-label="Mở menu">{open?<X/>:<Menu/>}</button>
    <div className={`mobile-menu ${open?'open':''}`}>
      {links.map(([label,href])=><a key={href} href={href} onClick={()=>setOpen(false)}>{label}</a>)}
      <a href={salon.messengerUrl} target="_blank" rel="noreferrer">Messenger A.T Nail Lab</a>
    </div>
  </header>
}
