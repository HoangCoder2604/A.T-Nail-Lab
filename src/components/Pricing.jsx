import { priceGroups } from '../data/salon';

export default function Pricing(){
  return <section className="section pricing" id="pricing">
    <div className="container">
      <div className="section-heading reveal">
        <div><p className="eyebrow">PRICE MENU</p><h2>Bảng giá A.T Nail Lab</h2></div>
        <p>Giá được nhập theo bảng giá bạn cung cấp. Đơn vị hiển thị: nghìn đồng.</p>
      </div>
      <div className="price-grid">
        {priceGroups.map(group=><article className="price-card reveal" key={group.name}>
          <h3>{group.name}</h3>
          <div className="price-list">
            {group.items.map(([name,price])=><div key={name}><span>{name}</span><b>{price}</b></div>)}
          </div>
        </article>)}
      </div>
      <div className="price-note reveal">* Tiệm làm theo hình thức 1:1, ưu tiên sự thoải mái và trải nghiệm của khách. Hỗ trợ chỉnh sửa các lỗi về móng trong 3 ngày, hoàn toàn không tính phí. Chỉ hỗ trợ sửa lỗi, không áp dụng làm lại bộ móng mới.</div>
    </div>
  </section>
}
