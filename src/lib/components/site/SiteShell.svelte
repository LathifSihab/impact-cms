<script lang="ts">
  /**
   * The site's chrome, transcribed from the static pages so the rendered pages
   * are the same product rather than a lookalike: utility bar, nav with
   * dropdowns, mobile menu, footer, newsletter dome.
   *
   * Only Events and Journal are served by this app. Every other destination —
   * Over, Samenwerken, Social Impact, Media, Contact, Privacy, Hosted
   * Experiences, the brochure — still lives in the static build, so those links
   * point at it through `ext()`. The nav therefore behaves complete while being
   * honest about which half serves what.
   */
  import { page } from '$app/state';
  import type { Locale } from '$lib/collections';
  import { path } from '$lib/i18n';

  let {
    locale,
    section = '',
    staticBase = '',
    children
  }: {
    locale: Locale;
    /** Marks the current top-level nav item, as the static site's data-nav does. */
    section?: 'events' | 'journal' | '';
    staticBase?: string;
    children: import('svelte').Snippet;
  } = $props();

  const p = $derived((rest: string) => path(locale, rest));

  /** A page still served by the static site. */
  const ext = $derived((file: string) => {
    const base = staticBase.replace(/\/$/, '');
    const prefix = locale === 'en' ? '/en' : '';
    return base ? `${base}${prefix}/${file}` : `${prefix}/${file}`;
  });

  const nl = $derived(page.url.pathname.replace(/^\/en(?=\/|$)/, '') || '/');
  const en = $derived(nl === '/' ? '/en' : `/en${nl}`);

  const T = $derived(
    locale === 'en'
      ? {
          skip: 'Skip to content',
          brochure: 'Brochure',
          media: 'Media',
          journal: 'Journal',
          contact: 'Contact',
          over: 'About',
          events: 'Events',
          samen: 'Partner with us',
          social: 'Social Impact',
          upcoming: 'UPCOMING EVENTS',
          menuOpen: 'Open menu',
          menuClose: 'Close menu',
          lang: 'Language',
          tagline: 'Youth development through experiences, connection and growth.',
          hosted: 'Hosted Experiences',
          privacy: 'Privacy statement',
          cookies: 'Cookie preferences',
          domeTitle: 'Stay in the loop',
          domeBody: 'New events, stories and partnerships. One mail a month.',
          domeEmail: 'your email address',
          domeCta: 'Subscribe',
          domePrivacy: 'By subscribing you agree to our'
        }
      : {
          skip: 'Naar de inhoud',
          brochure: 'Brochure',
          media: 'Media',
          journal: 'Journal',
          contact: 'Contact',
          over: 'Over',
          events: 'Events',
          samen: 'Samenwerken',
          social: 'Social Impact',
          upcoming: 'UPCOMING EVENTS',
          menuOpen: 'Menu openen',
          menuClose: 'Menu sluiten',
          lang: 'Taal',
          tagline: 'Youth development through experiences, connection and growth.',
          hosted: 'Hosted Experiences',
          privacy: 'Privacyverklaring',
          cookies: 'Cookievoorkeuren',
          domeTitle: 'Blijf op de hoogte',
          domeBody: 'Nieuwe events, verhalen en partnerships. Eén mail per maand.',
          domeEmail: 'jouw e-mailadres',
          domeCta: 'Inschrijven',
          domePrivacy: 'Door je in te schrijven ga je akkoord met onze'
        }
  );
</script>

<svelte:head>
  <link rel="stylesheet" href="/assets/css/style.css" />
</svelte:head>

<a class="skip-link" href="#main">{T.skip}</a>

<!-- utility bar -->
<div class="util">
  <div class="wrap">
    <ul>
      <li><a href={ext('assets/impact-brochure.pdf')} target="_blank" rel="noopener">{T.brochure}</a></li>
      <li><a href={ext('media.html')}>{T.media}</a></li>
      <li><a href={p('/journal')}>{T.journal}</a></li>
      <li><a href={ext('contact.html')}>{T.contact}</a></li>
    </ul>
    <div class="right">
      <a href="https://www.instagram.com/impact___collective/" target="_blank" rel="noopener">Instagram</a>
      <span class="divider"></span>
      <a href={nl} class="lang" class:is-active={locale === 'nl'} hreflang="nl">NL</a>
      <a href={en} class="lang" class:is-active={locale === 'en'} hreflang="en">EN</a>
    </div>
  </div>
</div>

<nav class="nav">
  <div class="wrap">
    <a href={ext('index.html')} class="logo" aria-label="IMPACT — home">
      <img src="/assets/brand/impact-logo.png" alt="IMPACT" width="647" height="145" />
    </a>
    <ul class="nav-main">
      <li>
        <a href={ext('over.html')} class="top">{T.over}</a>
        <div class="dropdown">
          <a href={ext('over.html#why')}>Why we exist</a>
          <a href={ext('over.html#founders')}>Founders</a>
          <a href={ext('over.html#fundamenten')}>Onze fundamenten</a>
          <a href={ext('over.html#voor-wie')}>Voor wie</a>
          <a href={ext('over.html#systeem')}>Het systeem</a>
          <a href={ext('over.html#team')}>Team &amp; experts</a>
        </div>
      </li>
      <li class:is-current={section === 'events'}>
        <a href={p('/events')} class="top">{T.events}</a>
        <div class="dropdown">
          <a href={p('/events') + '#upcoming'}>Upcoming Events</a>
          <a href={p('/events') + '#camps'}>Camps</a>
          <a href={p('/events') + '#days'}>Days</a>
          <a href={p('/events') + '#retreats'}>Retreats</a>
          <a href={ext('hosted-experiences.html')}>{T.hosted}</a>
          <a href={p('/events') + '#alle'}>Alle events</a>
        </div>
      </li>
      <li>
        <a href={ext('samenwerken.html')} class="top">{T.samen}</a>
        <div class="dropdown">
          <a href={ext('samenwerken.html#partner-worden')}>Partner worden</a>
          <a href={ext('hosted-experiences.html')}>{T.hosted}</a>
          <a href={ext('samenwerken.html#experts')}>Experts &amp; coaches</a>
          <a href={ext('samenwerken.html#bedrijven')}>Voor bedrijven</a>
          <a href={ext('samenwerken.html#partners')}>Onze partners</a>
        </div>
      </li>
      <li>
        <a href={ext('social-impact.html')} class="top">{T.social}</a>
        <div class="dropdown">
          <a href={ext('social-impact.html')}>IMPACT FOR ALL</a>
          <a href={ext('social-impact.html#aanpak')}>Onze aanpak</a>
          <a href={ext('social-impact.html#impact')}>Onze impact</a>
          <a href={ext('social-impact.html#draag-bij')}>Steun onze missie</a>
        </div>
      </li>
    </ul>
    <a href={p('/events') + '#upcoming'} class="pill pill--primary pill--sm">{T.upcoming}</a>
    <button class="burger" aria-label={T.menuOpen}><span></span></button>
  </div>
</nav>

<div class="mobile-menu" id="mobile-menu">
  <div class="mm-top">
    <a href={ext('index.html')} class="logo logo--invert">
      <img src="/assets/brand/impact-logo.png" alt="IMPACT" width="647" height="145" />
    </a>
    <button class="close" aria-label={T.menuClose}>&times;</button>
  </div>
  <a class="mm-item" href={ext('over.html')}>{T.over}</a>
  <div class="mm-sub">
    <a href={ext('over.html#why')}>Why we exist</a><a href={ext('over.html#founders')}>Founders</a>
    <a href={ext('over.html#fundamenten')}>Onze fundamenten</a><a href={ext('over.html#voor-wie')}>Voor wie</a>
    <a href={ext('over.html#systeem')}>Het systeem</a><a href={ext('over.html#team')}>Team &amp; experts</a>
  </div>
  <a class="mm-item" href={p('/events')}>{T.events}</a>
  <div class="mm-sub">
    <a href={p('/events') + '#upcoming'}>Upcoming Events</a><a href={p('/events') + '#camps'}>Camps</a>
    <a href={p('/events') + '#days'}>Days</a><a href={p('/events') + '#retreats'}>Retreats</a>
    <a href={ext('hosted-experiences.html')}>{T.hosted}</a><a href={p('/events') + '#alle'}>Alle events</a>
  </div>
  <a class="mm-item" href={ext('samenwerken.html')}>{T.samen}</a>
  <div class="mm-sub">
    <a href={ext('samenwerken.html#partner-worden')}>Partner worden</a><a href={ext('hosted-experiences.html')}>{T.hosted}</a>
    <a href={ext('samenwerken.html#experts')}>Experts &amp; coaches</a><a href={ext('samenwerken.html#bedrijven')}>Voor bedrijven</a>
    <a href={ext('samenwerken.html#partners')}>Onze partners</a>
  </div>
  <a class="mm-item" href={ext('social-impact.html')}>{T.social}</a>
  <div class="mm-sub">
    <a href={ext('social-impact.html#aanpak')}>Onze aanpak</a><a href={ext('social-impact.html#impact')}>Onze impact</a>
    <a href={ext('social-impact.html#draag-bij')}>Steun onze missie</a>
  </div>
  <div class="mm-lang">
    <span>{T.lang}</span>
    <a href={nl} class="lang" class:is-active={locale === 'nl'} hreflang="nl">NL</a>
    <a href={en} class="lang" class:is-active={locale === 'en'} hreflang="en">EN</a>
  </div>
  <div class="mm-foot">
    <a href={ext('assets/impact-brochure.pdf')} target="_blank" rel="noopener">{T.brochure}</a>
    <a href={ext('media.html')}>{T.media}</a><a href={p('/journal')}>{T.journal}</a>
    <a href={ext('contact.html')}>{T.contact}</a>
    <a href="https://www.instagram.com/impact___collective/" target="_blank" rel="noopener">Instagram</a>
  </div>
</div>

<main id="main">
  {@render children()}
</main>

<footer class="footer">
  <div class="wrap">
    <div class="grid">
      <div class="brandcol">
        <a href={ext('index.html')} class="logo logo--invert">
          <img src="/assets/brand/impact-logo.png" alt="IMPACT" width="647" height="145" />
        </a>
        <p class="body">{T.tagline}</p>
        <div class="socials">
          <a href="https://www.instagram.com/impact___collective/" target="_blank" rel="noopener">Instagram</a>
        </div>
      </div>
      <div>
        <h4>IMPACT</h4>
        <ul>
          <li><a href={ext('over.html')}>{T.over}</a></li>
          <li><a href={ext('over.html#fundamenten')}>Fundamenten</a></li>
          <li><a href={ext('over.html#team')}>Team</a></li>
        </ul>
      </div>
      <div>
        <h4>Events</h4>
        <ul>
          <li><a href={p('/events') + '#upcoming'}>Upcoming</a></li>
          <li><a href={p('/events') + '#camps'}>Camps</a></li>
          <li><a href={p('/events') + '#days'}>Days</a></li>
          <li><a href={p('/events') + '#retreats'}>Retreats</a></li>
          <li><a href={ext('hosted-experiences.html')}>{T.hosted}</a></li>
        </ul>
      </div>
      <div>
        <h4>{T.samen}</h4>
        <ul>
          <li><a href={ext('samenwerken.html#partner-worden')}>Partner worden</a></li>
          <li><a href={ext('hosted-experiences.html')}>{T.hosted}</a></li>
          <li><a href={ext('samenwerken.html#bedrijven')}>Voor bedrijven</a></li>
        </ul>
      </div>
      <div>
        <h4>Social impact</h4>
        <ul>
          <li><a href={ext('social-impact.html')}>IMPACT FOR ALL</a></li>
          <li><a href={ext('social-impact.html#draag-bij')}>Steun onze missie</a></li>
        </ul>
      </div>
      <div>
        <h4>Info</h4>
        <ul>
          <li><a href={p('/journal')}>{T.journal}</a></li>
          <li><a href={ext('media.html')}>{T.media}</a></li>
          <li><a href={ext('assets/impact-brochure.pdf')} target="_blank" rel="noopener">{T.brochure}</a></li>
          <li><a href={ext('contact.html')}>{T.contact}</a></li>
        </ul>
      </div>
    </div>
    <div class="bottom">
      <span>
        hello@wemakeimpact.be · <a href="tel:+32495370044">+32 495 37 00 44</a> ·
        <a href="https://www.instagram.com/impact___collective/" target="_blank" rel="noopener">@impact___collective</a>
      </span>
      <span class="legal">
        <a href={ext('privacy.html')}>{T.privacy}</a>
        <button type="button" class="linkish" data-consent-open hidden>{T.cookies}</button>
      </span>
      <span><span class="built">Built by <a href="https://drpbuildlab.com" target="_blank" rel="noopener">DRP BuildLab</a></span></span>
    </div>
  </div>
</footer>

<div class="dome" id="dome" hidden>
  <div class="dome-panel" role="dialog" aria-modal="true" aria-labelledby="dome-title">
    <button class="dome-close" type="button" aria-label={T.menuClose}>×</button>
    <div class="dome-in">
      <span class="dome-mark">[ ]</span>
      <h2 id="dome-title">{T.domeTitle}</h2>
      <p class="body">{T.domeBody}</p>
      <!-- Posts to the live Netlify function, same as the static site. -->
      <form class="dome-form" data-newsletter data-dome-form novalidate name="newsletter" action="/">
        <input type="hidden" name="form-name" value="newsletter" />
        <input type="hidden" name="bot-field" />
        <label class="sr-only" for="dome-email">E-mail</label>
        <input id="dome-email" name="email" type="email" placeholder={T.domeEmail} required />
        <button type="submit" class="pill pill--dark">{T.domeCta}</button>
        <p class="form-msg" role="status"></p>
        <p class="form-privacy">
          {T.domePrivacy} <a href={ext('privacy.html')}>{T.privacy.toLowerCase()}</a>.
        </p>
      </form>
    </div>
  </div>
</div>
