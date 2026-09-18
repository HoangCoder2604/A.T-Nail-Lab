import { useState } from 'react';
import { X, ArrowUpRight } from 'lucide-react';
import { gallery } from '../data/salon';

export default function Gallery(){
  const [active,setActive]=useState(null);
  return <section className="gallery-section" id="gallery">
    <div className="container">
      <div className="section-heading reveal">
        <div><p className="eyebrow">NAIL COLLECTION</p><h2>Bộ sưu tập A.T</h2></div>
        <p>Một vài mẫu thật từ A.T Nail Lab. Từ màu trong, french, ombre đến chrome và nail art.</p>
      </div>
      <div className="gallery-grid">
        {gallery.map((g,i)=><button className={`gallery-card g${i+1} reveal`} key={g.src} onClick={()=>setActive(g)}>
          <img src={g.src} alt={g.title}/>
          <div className="gallery-overlay"><div><small>{g.tag}</small><strong>{g.title}</strong></div><ArrowUpRight/></div>
        </button>)}
      </div>
    </div>
    {active && <div className="lightbox" onClick={()=>setActive(null)}>
      <button aria-label="Đóng"><X/></button>
      <img src={active.src} alt={active.title} onClick={e=>e.stopPropagation()}/>
    </div>}
  </section>
}
