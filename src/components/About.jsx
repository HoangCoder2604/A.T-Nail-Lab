import { Heart, Palette, Sparkles, UserRound } from 'lucide-react';
import { salon } from '../data/salon';

export default function About(){
  return <section className="about" id="about">
    <div className="about-media reveal">
      <img src="/images/salon-main.jpg" alt="Không gian A.T Nail Lab"/>
      <div className="about-shade"/>
      <figure className="about-mini" data-tilt>
        <img src="/images/salon-lounge.jpg" alt="Một góc A.T Nail Lab"/>
        <figcaption>your little beauty ritual ✦</figcaption>
      </figure>
      <div className="about-badge">A space<br/>for better<br/>you ✦</div>
    </div>
    <div className="about-copy reveal">
      <p className="eyebrow">ABOUT A.T NAIL LAB</p>
      <h2>Không chỉ là làm đẹp,<br/><em>mà là một khoảng nghỉ.</em></h2>
      <p>A.T Nail Lab được xây dựng theo hướng gần gũi, chỉn chu và 1:1. Không gian sáng, nhiều bảng màu, dụng cụ được sắp xếp rõ ràng để khách dễ chọn phong cách phù hợp với mình.</p>
      <p>Chủ tiệm <strong>{salon.owner}</strong> trực tiếp phát triển phong cách của A.T Nail Lab: trẻ, sạch, tinh tế và không ngại thử những chi tiết sáng tạo.</p>
      <div className="about-icons reveal-stagger">
        <span><Heart/>Tận tâm</span><span><Palette/>Nhiều lựa chọn</span><span><Sparkles/>Có gu</span><span><UserRound/>1:1</span>
      </div>
    </div>
  </section>;
}
