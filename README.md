# A.T Nail Lab — Premium UI V2

React + Vite landing page cho A.T Nail Lab, dùng ảnh thật của tiệm.

## Chạy project

```bash
npm install
npm run dev
```

Mặc định Vite chạy ở `http://localhost:5173`.

## Build production

```bash
npm run build
npm run preview
```

## Điểm mới của V2

- Intro loader ngắn, chỉ hiện 1 lần mỗi session
- Scroll progress ở mép trên
- Hero nhiều lớp ảnh, floating cards và parallax
- Marquee thương hiệu chuyển động
- Service card có tilt + light interaction trên desktop
- Gallery hover sâu hơn + lightbox
- About có floating mini photo và badge chuyển động
- Pricing card có micro-interaction
- Booking form lớn, dễ đọc trên mobile
- Booking mở Facebook Messenger sau khi copy nội dung
- Social rail trên desktop
- `prefers-reduced-motion` cho người không muốn animation

## Nội dung thương hiệu

Chỉnh thông tin trong:

`src/data/salon.js`

## Lưu ý booking

Booking hiện tại copy nội dung và mở Messenger; chưa lưu vào database. Nếu dùng thật lâu dài, nên nối Supabase để lưu lịch hẹn và làm trang admin.
