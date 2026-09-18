import { Facebook, Instagram, Phone } from 'lucide-react';
import { salon } from '../data/salon';
export default function Footer(){
  return <footer className="footer">
    <div className="footer-word">A.T NAIL LAB</div>
    <div className="container footer-row">
      <div className="brand footer-brand"><strong>A.T NAIL LAB</strong><small>NAIL • BEAUTY • YOU</small></div>
      <div className="footer-contact"><a href={`tel:${salon.phone}`}><Phone/> {salon.phoneDisplay}</a><a href={salon.facebookUrl}><Facebook/> Facebook</a><a href={salon.instagramUrl}><Instagram/> @{salon.instagram}</a></div>
      <div className="footer-meta"><span>© {new Date().getFullYear()} A.T Nail Lab</span><span>{salon.tagline}</span></div>
    </div>
  </footer>
}
