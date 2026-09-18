import { Sparkles, Gem, Wand2, Heart, ArrowUpRight } from 'lucide-react';
import { services } from '../data/salon';

const icons={Sparkles,Gem,Wand2,Heart};

export default function Services(){
  return <section className="section container" id="services">
    <div className="section-heading reveal">
      <div><p className="eyebrow">OUR SERVICES</p><h2>Dịch vụ của chúng tôi</h2></div>
      <p>Không chạy theo số lượng — A.T Nail Lab tập trung vào độ chỉn chu, form móng và trải nghiệm cá nhân.</p>
    </div>

    <div className="service-grid reveal-stagger">
      {services.map((s,i)=>{
        const Icon=icons[s.icon];
        return <article className="service-card" key={s.title} data-tilt>
          <div className="service-card-glow" aria-hidden="true"/>
          <div className="service-top"><span className="service-no">0{i+1}</span><span className="service-pill">A.T SIGNATURE</span></div>
          <div className="service-icon"><Icon size={28} strokeWidth={1.5}/></div>
          <h3>{s.title}</h3>
          <p>{s.desc}</p>
          <a href="#pricing">Xem bảng giá <ArrowUpRight size={16}/></a>
        </article>;
      })}
    </div>
  </section>;
}
