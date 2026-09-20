import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Header from '../components/Header';
import Hero from '../components/Hero';
import BrandMarquee from '../components/BrandMarquee';
import Services from '../components/Services';
import Gallery from '../components/Gallery';
import About from '../components/About';
import Pricing from '../components/Pricing';
import Booking from '../components/Booking';
import Footer from '../components/Footer';
import IntroLoader from '../components/IntroLoader';
import SocialRail from '../components/SocialRail';
import ScrollProgress from '../components/ScrollProgress';
import { salon } from '../data/salon';

export default function HomePage() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.from('.hero-copy .reveal', {
        opacity: 0,
        y: 34,
        duration: 1,
        stagger: 0.12,
        ease: 'power3.out',
        delay: 0.15,
      });

      gsap.from('.hero-media', { opacity: 0, scale: 1.025, duration: 1.35, ease: 'power3.out' });
      gsap.from('.hero-float-card', { opacity: 0, y: 30, rotate: 4, duration: 1, stagger: 0.18, delay: 0.55, ease: 'power3.out' });

      gsap.utils.toArray('.reveal:not(.hero-copy .reveal)').forEach((el) => {
        gsap.from(el, {
          scrollTrigger: { trigger: el, start: 'top 88%' },
          opacity: 0,
          y: 40,
          duration: 0.85,
          ease: 'power3.out',
        });
      });

      gsap.utils.toArray('.reveal-stagger').forEach((group) => {
        gsap.from(group.children, {
          scrollTrigger: { trigger: group, start: 'top 86%' },
          opacity: 0,
          y: 34,
          stagger: 0.08,
          duration: 0.75,
          ease: 'power3.out',
        });
      });

      gsap.to('.hero-img', {
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
        yPercent: 8,
        scale: 1.06,
        ease: 'none',
      });

      gsap.to('.hero-orb-a', {
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
        x: 45,
        y: -30,
        ease: 'none',
      });
    });

    const onMove = (event) => {
      document.documentElement.style.setProperty('--mx', `${event.clientX}px`);
      document.documentElement.style.setProperty('--my', `${event.clientY}px`);
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    const cleanups = [];

    document.querySelectorAll('.magnetic').forEach((button) => {
      const move = (event) => {
        const rect = button.getBoundingClientRect();
        button.style.transform = `translate(${(event.clientX - rect.left - rect.width / 2) * 0.08}px,${(event.clientY - rect.top - rect.height / 2) * 0.08}px)`;
      };
      const leave = () => { button.style.transform = ''; };
      button.addEventListener('pointermove', move);
      button.addEventListener('pointerleave', leave);
      cleanups.push(() => {
        button.removeEventListener('pointermove', move);
        button.removeEventListener('pointerleave', leave);
      });
    });

    document.querySelectorAll('[data-tilt]').forEach((card) => {
      const move = (event) => {
        if (window.matchMedia('(pointer: coarse)').matches) return;
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty('--tilt-x', `${-y * 4}deg`);
        card.style.setProperty('--tilt-y', `${x * 5}deg`);
        card.style.setProperty('--shine-x', `${(x + 0.5) * 100}%`);
        card.style.setProperty('--shine-y', `${(y + 0.5) * 100}%`);
      };
      const leave = () => {
        card.style.setProperty('--tilt-x', '0deg');
        card.style.setProperty('--tilt-y', '0deg');
      };
      card.addEventListener('pointermove', move);
      card.addEventListener('pointerleave', leave);
      cleanups.push(() => {
        card.removeEventListener('pointermove', move);
        card.removeEventListener('pointerleave', leave);
      });
    });

    return () => {
      ctx.revert();
      window.removeEventListener('pointermove', onMove);
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'NailSalon',
      name: salon.name,
      telephone: `+84${salon.phone.slice(1)}`,
      url: salon.facebookUrl,
      sameAs: [salon.facebookUrl, salon.instagramUrl],
      founder: { '@type': 'Person', name: salon.owner },
    });
    document.head.appendChild(script);
    return () => script.remove();
  }, []);

  return (
    <>
      <IntroLoader />
      <ScrollProgress />
      <div className="cursor-glow" />
      <SocialRail />
      <Header />
      <main>
        <Hero />
        <BrandMarquee />
        <Services />
        <Gallery />
        <About />
        <Pricing />
        <Booking />
      </main>
      <Footer />
      <a className="mobile-sticky" href="#booking">Đặt lịch ngay</a>
    </>
  );
}
