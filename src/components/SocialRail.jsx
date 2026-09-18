import { Facebook, Instagram, Phone } from 'lucide-react';
import { salon } from '../data/salon';

export default function SocialRail(){
  return <aside className="social-rail" aria-label="Liên hệ nhanh">
    <span className="social-rail-label">FOLLOW</span>
    <i/>
    <a href={salon.facebookUrl} target="_blank" rel="noreferrer" aria-label="Facebook"><Facebook size={15}/></a>
    <a href={salon.instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={15}/></a>
    <a href={`tel:${salon.phone}`} aria-label="Gọi A.T Nail Lab"><Phone size={15}/></a>
  </aside>;
}
