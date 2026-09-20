import { ArrowDown, ArrowRight, Sparkles } from 'lucide-react';

export default function Hero(){
  return <section className="hero" id="home">
    <div className="hero-orb hero-orb-a" aria-hidden="true"/>
    <div className="hero-orb hero-orb-b" aria-hidden="true"/>

    <div className="hero-copy container">
      <div className="hero-kicker reveal"><Sparkles size={14}/> BEAUTIFUL NAILS • BRIGHTER YOU</div>
      <h1 className="hero-title reveal">Tinh tế trong<br/><em>từng thiết kế móng.</em></h1>
      <p className="hero-sub reveal">A.T Nail Lab theo đuổi những bộ nail gọn gàng, có gu và phù hợp với chính bạn — từ một lớp gel trong trẻo đến một thiết kế đính charm thật nổi bật.</p>
      <div className="hero-actions reveal">
        <a className="btn primary magnetic" href="#booking">Đặt lịch <ArrowRight size={17}/></a>
        <a className="btn ghost" href="#gallery">Xem mẫu nail</a>
      </div>
      <a className="hero-scroll reveal" href="#services"><span>SCROLL TO EXPLORE</span><ArrowDown size={15}/></a>
    </div>

    <div className="hero-media">
      <img className="hero-img" src="/images/hero-star.jpg" alt="Mẫu nail A.T Nail Lab"/>
      <div className="hero-shade"/>
      <div className="hero-script">more than nails</div>
      <div className="hero-counter">A.T / 01</div>

      <figure className="hero-float-card hero-float-one" data-tilt>
        <img src="/images/nail-french.jpg" alt="Mẫu French A.T Nail Lab"/>
        <figcaption><small>SOFT FRENCH</small><span>01</span></figcaption>
      </figure>

      <figure className="hero-float-card hero-float-two" data-tilt>
        <img src="/images/nail-silver.jpg" alt="Mẫu Chrome A.T Nail Lab"/>
        <figcaption><small>CHROME GLOW</small><span>02</span></figcaption>
      </figure>
    </div>

    <div className="hero-stat-strip">
      <div><b>01</b><span>Làm theo lịch hẹn 1:1</span></div>
      <div><b>02</b><span>Tư vấn theo form tay & phong cách</span></div>
      <div><b>03</b><span>Nhiều bảng màu và charm</span></div>
      <div><b>04</b><span>Ưu tiên trải nghiệm của khách</span></div>
    </div>
  </section>;
}
