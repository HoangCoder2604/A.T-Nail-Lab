import { Clock3, Facebook, Instagram, MapPin, Phone } from 'lucide-react';
import { salon } from '../data/salon';
export default function Footer(){
  return <footer className="footer">
    <div className="footer-word">A.T NAIL LAB</div>
    <div className="container footer-row">
      <div className="brand footer-brand"><strong>A.T NAIL LAB</strong><small>NAIL • BEAUTY • YOU</small></div>
      <div className="footer-contact">
        <a href={salon.mapsUrl} target="_blank" rel="noreferrer"><MapPin/> {salon.address}</a>
        <span><Clock3/> Open {salon.hours}</span>
        <a href={`tel:${salon.phone}`}><Phone/> Hotline: {salon.phoneDisplay}</a>
        <a href={salon.instagramUrl} target="_blank" rel="noreferrer"><Instagram/> @{salon.instagram}</a>
        <a href={salon.facebookUrl} target="_blank" rel="noreferrer"><Facebook/> Facebook</a>
      </div>
      <div className="footer-meta"><span>© {new Date().getFullYear()} A.T Nail Lab</span><span>{salon.tagline}</span></div>
    </div>
  </footer>
}
