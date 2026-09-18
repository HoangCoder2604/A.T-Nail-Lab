const items=['NAIL ART','GEL','FRENCH','OMBRE','CHROME','BIAB','CHARM','CARE'];

export default function BrandMarquee(){
  const loop=[...items,...items];
  return <div className="brand-marquee" aria-hidden="true">
    <div className="brand-marquee-track">
      {loop.map((item,i)=><span key={`${item}-${i}`}>{item}<b>✦</b></span>)}
    </div>
  </div>;
}
