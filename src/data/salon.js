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
  instagramMessageUrl: 'https://ig.me/m/a.t.naillab',
  facebookName: 'A.T Nail Lab',
  facebookUrl: 'https://www.facebook.com/profile.php?id=61584573756566',
  messengerUrl,
  
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
      ['Cắt da + dũa form', '40'],
      ['Cắt da nam', '50'],
      ['Cứng móng thường', '20'],
      ['Cứng móng tạo cầu / fill', '45–80'],
      ['Phá sơn gel', '30'],
      ['Phá móng up / đắp', '40'],
      ['Che khuyết điểm móng', '20']
    ]
  },
  {
    name: 'Sơn',
    items: [
      ['Sơn gel', '100'],
      ['Sơn thạch', '120'],
      ['Mắt mèo', '150'],
      ['Ombre / Tráng gương', '100'],
      ['French', '10–15'],
      ['Sơn mix màu', '10 / ngón']
    ]
  },
  {
    name: 'Up móng',
    items: [
      ['Up móng base', '100'],
      ['Up móng 6in1', '120'],
      ['Dual form', '240'],
      ['Đắp gel', '200'],
      ['Fill up / gel', '60–100']
    ]
  },
  {
    name: 'Design',
    items: [
      ['Vẽ', '5–30 / 1'],
      ['Ẩn nhũ', '15–40 / 1'],
      ['Đính đá', '7–35 / 1'],
      ['Charm', '10–30 / 1'],
      ['Nặn thú - hoa', '20–60 / 1']
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
