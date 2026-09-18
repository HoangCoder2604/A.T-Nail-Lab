import { useState } from 'react';
import { CalendarDays, CheckCircle2, Copy, MessageCircle, Phone } from 'lucide-react';
import { salon } from '../data/salon';

export default function Booking(){
  const [status,setStatus]=useState('');
  const [loading,setLoading]=useState(false);

  const submit=async(e)=>{
    e.preventDefault();
    setLoading(true);

    const form=e.currentTarget;
    const data=Object.fromEntries(new FormData(form).entries());
    const msg=`💅 A.T NAIL LAB - YÊU CẦU ĐẶT LỊCH\n\n👤 Khách hàng: ${data.name}\n📞 SĐT: ${data.phone}\n\n💎 Dịch vụ: ${data.service}\n\n📅 Ngày: ${data.date||'Chưa chọn'}\n⏰ Giờ: ${data.time||'Chưa chọn'}\n\n📝 Ghi chú:\n${data.note||'Không có'}\n\n------------------------\nA.T NAIL LAB\nCall/Zalo: ${salon.phoneDisplay}`;

    try{
      await navigator.clipboard.writeText(msg);
      setStatus('Đã sao chép thông tin đặt lịch. Đang mở Messenger A.T Nail Lab...');
    }catch{
      setStatus('Đang mở Messenger. Bạn có thể gửi lại thông tin đặt lịch cho tiệm.');
    }

    localStorage.setItem('at-nail-last-booking',JSON.stringify({...data,createdAt:new Date().toISOString()}));

    setTimeout(()=>{
      window.open(salon.messengerUrl,'_blank','noopener,noreferrer');
      setLoading(false);
    },500);
  };

  return <section className="booking-section" id="booking">
    <div className="booking-image reveal">
      <img src="/images/salon-brand.jpg" alt="A.T Nail Lab"/>
      <div className="booking-image-shade"/>
      <div className="booking-image-caption"><span>A.T NAIL LAB</span><p>Beauty • Nail • You</p></div>
      <div className="booking-floating-chip">1:1 appointment ✦</div>
    </div>

    <div className="booking-copy reveal">
      <p className="eyebrow">BOOK YOUR APPOINTMENT</p>
      <h2>Đặt lịch trước,<br/><em>thảnh thơi hơn.</em></h2>
      <p className="promo-line"><CalendarDays/> {salon.promo}</p>

      <form onSubmit={submit} className="booking-form">
        <div className="form-grid">
          <label>Họ và tên<input required name="name" placeholder="Tên của bạn"/></label>
          <label>Số điện thoại<input required name="phone" inputMode="tel" placeholder="09xx xxx xxx"/></label>
          <label>Dịch vụ
            <select name="service" defaultValue="Sơn gel">
              <option>Sơn gel</option><option>Sơn thạch</option><option>Mắt mèo</option><option>Ombre / Tráng gương</option><option>French</option><option>Up móng</option><option>Nail Art / Trang trí</option><option>Chăm sóc / Cắt da</option>
            </select>
          </label>
          <label>Ngày<input name="date" type="date"/></label>
          <label>Giờ<input name="time" type="time"/></label>
          <label className="full">Ghi chú<textarea name="note" rows="3" placeholder="Mẫu mong muốn, màu sắc, độ dài móng..."/></label>
        </div>

        <button className="btn primary full-btn magnetic" type="submit" disabled={loading}>
          {loading?<>Đang mở Messenger... <MessageCircle size={17}/></>:<>Đặt lịch qua Facebook <MessageCircle size={17}/></>}
        </button>

        {status&&<p className="form-status"><CheckCircle2 size={16}/>{status}</p>}

        <div className="booking-helper"><Copy size={14}/><span>Thông tin đặt lịch sẽ được sao chép. Khi Messenger mở, bạn chỉ cần <strong>Paste → Gửi</strong>.</span></div>
      </form>

      <div className="booking-links">
        <a href={`tel:${salon.phone}`}><Phone size={17}/> {salon.phoneDisplay}</a>
        <a href={salon.facebookUrl} target="_blank" rel="noreferrer">Facebook</a>
        <a href={salon.instagramUrl} target="_blank" rel="noreferrer">Instagram</a>
      </div>
    </div>
  </section>;
}
