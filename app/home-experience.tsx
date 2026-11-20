"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Compass, Menu, X } from "lucide-react";

const chapters = [
  {
    id: "places",
    number: "01",
    label: "Find their corners",
    title: "A campus, seen at cat height.",
    copy: "Catopia is being shaped as a gentle way to remember familiar campus corners. The idea is to notice where cats are comfortable, while giving them space and privacy.",
    image: "/images/cats/portrait-tabby.webp",
    alt: "Portrait study of a fluffy grey tabby cat",
    note: "PLACES, HELD WITH CARE",
    icon: Compass,
  },
  {
    id: "faces",
    number: "02",
    label: "Get to know the locals",
    title: "Every face has a story.",
    copy: "The cats who make a campus feel familiar each have their own story. In time, thoughtful portraits and the details people remember could help tell it.",
    image: "/images/cats/portrait-calico.webp",
    alt: "Portrait study of a curious calico cat",
    note: "FACES, WITH THEIR OWN STORIES",
    icon: Compass,
  },
  {
    id: "stories",
    number: "03",
    label: "Leave a little story",
    title: "Small moments belong somewhere.",
    copy: "A photo, a familiar name, a moment from the walk home. Catopia hopes to give those everyday memories a thoughtful place to live.",
    image: "/images/cats/portrait-kitten.webp",
    alt: "Portrait study of a young cream colored cat",
    note: "LITTLE MOMENTS, KEPT GENTLY",
    icon: Compass,
  },
];

export default function HomeExperience() {
  const [activeChapter, setActiveChapter] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const chapter = chapters[activeChapter];
  const ChapterIcon = chapter.icon;
  const closeMenu = () => setMenuOpen(false);

  const moveTabFocus = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === "ArrowRight" ? (index + 1) % chapters.length
      : event.key === "ArrowLeft" ? (index + chapters.length - 1) % chapters.length
      : event.key === "Home" ? 0
      : event.key === "End" ? chapters.length - 1
      : null;
    if (next === null) return;
    event.preventDefault();
    setActiveChapter(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <main className="home-page">
      <header className="site-header">
        <a className="brand-lockup" href="#top" aria-label="Catopia home" onClick={closeMenu}>
          <Image src="/images/catopia-mark.svg" width={40} height={40} alt="" priority />
          <span>catopia</span>
          <i>FIELD NOTES FOR CAMPUS CATS</i>
        </a>
        <button className="menu-toggle" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <nav className={menuOpen ? "primary-nav is-open" : "primary-nav"} aria-label="Main navigation">
          <a href="#why" onClick={closeMenu}>Why Catopia</a>
          <a href="#features" onClick={closeMenu}>The little world</a>
          <a className="nav-cta" href="#join" onClick={closeMenu}>Come be part of it <ArrowUpRight size={15} /></a>
        </nav>
      </header>

      <section className="hero" id="top" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="overline hero-overline"><span className="overline-mark">✳</span> A neighborhood, in whiskers and footsteps</p>
          <h1 id="hero-title">
            <span className="headline-line headline-line-one">Every campus</span>
            <span className="headline-line headline-line-two">has its own</span>
            <span className="headline-line headline-line-three"><em>little legends.</em></span>
          </h1>
          <p className="hero-description">Catopia is a home for the cats who make a campus feel like home — and for the people who notice them.</p>
          <div className="hero-actions">
            <a className="button button-dark" href="#features">Take a look around <ArrowRight size={17} /></a>
            <a className="text-link" href="#why"><span className="link-icon"><ArrowDown size={15} /></span> Why we made this</a>
          </div>
          <div className="hero-footnote"><span className="tiny-rule" /> A softer kind of campus directory</div>
        </div>

        <div className="hero-art" aria-label="A portrait study of a curious black cat">
          <div className="hero-art-ring" />
          <div className="hero-photo hero-photo-main">
            <Image src="/images/cats/peek-black.webp" alt="Curious black cat peeking into view" fill priority sizes="(max-width: 760px) 90vw, 45vw" />
          </div>
          <div className="hero-photo-stamp"><span>CATOPIA</span><b>VOL. 01</b><i>the campus locals</i></div>
          <div className="hero-side-note"><span>LOOK CLOSER</span><i>the best stories<br />are already here</i></div>
          <div className="hero-art-caption"><span className="caption-dot" /> A place for familiar faces<br /><small>and the stories we share</small></div>
          <span className="hero-spark hero-spark-one" aria-hidden="true">✳</span>
          <span className="hero-spark hero-spark-two" aria-hidden="true">✳</span>
        </div>
        <a href="#why" className="scroll-cue"><span>SCROLL TO MEET THEM</span><ArrowDown size={15} /></a>
      </section>

      <div className="ticker" aria-label="A home for campus cats and their stories">
        <div className="ticker-track" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => <span key={index}>A LITTLE HOME FOR CAMPUS CATS <i>✳</i> PORTRAITS, PLACES & LITTLE STORIES <i>✳</i></span>)}
        </div>
      </div>

      <section className="why-section" id="why" aria-labelledby="why-title">
        <div className="why-index"><span>THE REASON</span><b>01 / 03</b></div>
        <div className="why-heading">
          <p className="overline">The ones who were here before the bell</p>
          <h2 id="why-title">Campus has<br />its <em>own kind</em><br />of neighbors.</h2>
        </div>
        <div className="why-note">
          <span className="scribble-star" aria-hidden="true">✳</span>
          <p>There’s the cat by the quiet stairs. The one who appears at golden hour. The familiar face everyone knows, even if nobody knows their story.</p>
          <p>Catopia gives those small, ordinary connections a place to live — so they can be remembered, shared, and cared for together.</p>
          <a href="#features" className="text-link text-link-light">A little more about the idea <ArrowRight size={15} /></a>
        </div>
        <div className="why-side-label">A NEIGHBORHOOD PORTRAIT, MADE WITH CARE.</div>
      </section>

      <section className="features-section" id="features" aria-labelledby="features-title">
        <div className="section-heading">
          <div>
            <p className="overline"><span className="overline-mark">✳</span> A small world, with room for everyone</p>
            <h2 id="features-title">Three ways to<br /><em>feel a little closer.</em></h2>
          </div>
          <p className="section-aside">Follow a familiar face.<br />See where the story goes.</p>
        </div>

        <div className="feature-experience">
          <div className="chapter-selector" role="tablist" aria-label="Explore Catopia's ideas">
            {chapters.map((item, index) => (
              <button ref={element => { tabRefs.current[index] = element; }} key={item.id} id={`tab-${item.id}`} className={index === activeChapter ? "chapter-tab is-active" : "chapter-tab"} type="button" role="tab" aria-selected={index === activeChapter} aria-controls="chapter-panel" tabIndex={index === activeChapter ? 0 : -1} onClick={() => setActiveChapter(index)} onKeyDown={event => moveTabFocus(event, index)}>
                <span className="chapter-number">{item.number}</span><span>{item.label}</span><ArrowUpRight className="chapter-arrow" size={16} />
              </button>
            ))}
          </div>
          <div className="chapter-panel" id="chapter-panel" role="tabpanel" aria-labelledby={`tab-${chapter.id}`} key={chapter.id}>
            <div className="chapter-copy">
              <p className="overline chapter-overline"><span>{chapter.number}</span> / {chapter.note}</p>
              <h3>{chapter.title}</h3>
              <p>{chapter.copy}</p>
              <a className="chapter-discover" href="#join">This is how it comes together <ArrowRight size={16} /></a>
              <span className="chapter-icon"><ChapterIcon size={19} strokeWidth={1.5} /></span>
            </div>
            <div className="chapter-visual">
              <Image src={chapter.image} alt={chapter.alt} fill sizes="(max-width: 760px) 90vw, 42vw" />
              <div className="image-edition"><span>CATOPIA FIELD NOTES</span><b>{chapter.number} — 03</b></div>
              <span className="image-corner" aria-hidden="true">✳</span>
            </div>
          </div>
          <p className="photo-note">Portrait studies from the visual reference collection. These are not real Catopia profiles; no cat community or profile feature is live yet.</p>
        </div>
      </section>

      <section className="meow-section" aria-labelledby="meow-title">
        <h2 id="meow-title" aria-label="Meow">MEOW</h2>
        <Image
          className="meow-cat"
          src="/images/cat-effect/1.png"
          alt="A cream-colored cat playing with a dark blue ball of yarn"
          width={1228}
          height={1536}
          sizes="(max-width: 760px) 86vw, 52vw"
        />
      </section>

      <section className="promise-section" aria-labelledby="promise-title">
        <div className="promise-photo promise-photo-one"><Image src="/images/cats/portrait-tuxedo.webp" alt="Black and white cat portrait study" fill sizes="(max-width: 760px) 45vw, 22vw" /></div>
        <div className="promise-copy">
          <p className="overline">Made for curiosity, guided by care</p>
          <h2 id="promise-title">A little more<br />wonder. <em>A lot</em><br />more kindness.</h2>
          <p>Catopia is for noticing, not disturbing. Public stories should keep sensitive locations private, and future contributions will be reviewed with care.</p>
          <a className="button button-outline" href="#join">Our promise to the cats <ArrowUpRight size={16} /></a>
        </div>
        <div className="promise-photo promise-photo-two"><Image src="/images/cats/portrait-calico.webp" alt="Calico cat portrait study" fill sizes="(max-width: 760px) 40vw, 18vw" /></div>
        <span className="promise-marginalia">A GOOD NEIGHBOR<br />GIVES THEM SPACE.</span>
      </section>

      <section className="invitation-section" id="join" aria-labelledby="invitation-title">
        <div className="invitation-orbit" aria-hidden="true"><span>✳</span><i /><b /></div>
        <p className="overline">The story is better together</p>
        <h2 id="invitation-title">You’ve probably<br />met <em>one already.</em></h2>
        <p>Catopia is still taking shape. We’re making a thoughtful little home for the cats who already make this place feel special.</p>
        <a className="button button-paper" href="#features">See what’s taking shape <ArrowUpRight size={17} /></a>
        <small>Catopia is not open yet. The portraits shown here are visual studies.</small>
      </section>

      <footer className="site-footer">
        <a className="footer-brand" href="#top"><Image src="/images/catopia-mark.svg" width={32} height={32} alt="" /><span>catopia</span></a>
        <span>A neighborhood made of stories.</span>
        <a href="#top" className="back-top">BACK TO THE TOP <ArrowUpRight size={14} /></a>
        <span className="footer-copyright">MADE WITH CARE · FOR THE CATS AROUND US</span>
      </footer>
    </main>
  );
}
