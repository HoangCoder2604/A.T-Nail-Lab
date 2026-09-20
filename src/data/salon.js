const messengerPageId = import.meta.env?.VITE_MESSENGER_PAGE || '61584573756566';
const messengerUrl = `https://m.me/${messengerPageId}`;

export const bookingHours = {
  open: '09:30',
  close: '20:30',
};

export const salon = {
  name: 'A.T NAIL LAB',
  owner: 'Do Anh Thu',
  phone: '0938354909',
  phoneDisplay: '0938 354 909',
  address: '224 Hưng Phú, Chánh Hưng, Quận 8, TP.HCM',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=224%20H%C6%B0ng%20Ph%C3%BA%2C%20Ch%C3%A1nh%20H%C6%B0ng%2C%20Qu%E1%BA%ADn%208%2C%20TPHCM',
  hours: '09:30 – 20:30',
  instagram: 'a.t.naillab',
  instagramUrl: 'https://www.instagram.com/a.t.naillab/',
  facebookName: 'A.T Nail Lab',
  facebookUrl: 'https://www.facebook.com/profile.php?id=61584573756566',
  messengerUrl,
  
  promo: 'Đặt lịch trước 1 ngày — giảm 5%',
  tagline: 'Beautiful nails. Brighter you.',
  note: 'Tiệm làm theo hình thức 1:1, ưu tiên sự thoải mái và trải nghiệm của khách.'
};

export const services = [
  { title: 'Nail Art', desc: 'Thiết kế theo phong cách riêng, từ tối giản đến nổi bật.', icon: 'Sparkles' },
  { title: 'Gel / BIAB', desc: 'Bền màu, tự nhiên, chú trọng độ khỏe và form móng.', icon: 'Gem' },
  { title: 'Up móng', desc: 'Base, 6in1, dual form và đắp gel theo nhu cầu.', icon: 'Wand2' },
  { title: 'Chăm sóc', desc: 'Cắt da, dũa form, cứng móng và chăm sóc nền móng.', icon: 'Heart' }
];

export const priceGroups = [
  {
    name: 'Cơ bản',
    items: [
      ['Cắt da + dũa form', '20'],
      ['Cứng móng', '20'],
      ['Cứng móng tạo cầu', '35'],
      ['Phá móng gel', '20'],
      ['Phá móng up/đắp', '30']
    ]
  },
  {
    name: 'Sơn',
    items: [
      ['Sơn gel', '60'],
      ['Sơn thạch', '70'],
      ['Mắt mèo', '80'],
      ['Ombre / Tráng gương', '90'],
      ['French', '10–15'],
      ['Mắt mèo / Tráng gương / Ombre + nền', '160']
    ]
  },
  {
    name: 'Up móng',
    items: [
      ['Up móng base', '60'],
      ['Up móng 6in1', '70'],
      ['Dual form', '150–180'],
      ['Đắp gel', '170–200'],
      ['Fill móng up/gel', '50–100']
    ]
  },
  {
    name: 'Trang trí',
    items: [
      ['Vẽ', '5–30'],
      ['Ẩn nhũ', '5–10'],
      ['Đính đá', '5–10'],
      ['Charm', '10–30'],
      ['Nặn thú, hoa', '15–30']
    ]
  }
];

export const gallery = [
  { src: '/images/nail-ombre.jpg', title: 'Aqua Ombre', tag: 'Ombre' },
  { src: '/images/nail-french.jpg', title: 'Soft French', tag: 'French' },
  { src: '/images/hero-star.jpg', title: 'Tiny Stars', tag: 'Detail' },
  { src: '/images/nail-silver.jpg', title: 'Silver Glow', tag: 'Chrome' },
  { src: '/images/nail-collage-01.jpg', title: 'Season Mood', tag: 'Collection' },
  { src: '/images/nail-collage-02.jpg', title: 'Playful Art', tag: 'Art' }
];
