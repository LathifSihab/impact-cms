/**
 * The privacy policy, drafted for legal review.
 *
 * The static page ships a skeleton with `[ bracketed ]` gaps. Everything that
 * could be answered from what this project actually does has been written out
 * here; what genuinely is not known — the legal entity's name, form, address
 * and company number — is still bracketed, because inventing a company
 * registration number would be worse than leaving a blank.
 *
 * Sources for the factual claims, so a reviewer can check them rather than
 * take them on trust:
 *
 *   - the processors and what each holds: 04-INTEGRATIONS.md
 *   - what the forms collect: reference/subscribe.mjs and the form markup
 *   - the fourteen Brevo attributes: src/lib/server/signals.ts
 *   - consent for the participant clips: 01-BRIEF.md, "two client obligations"
 *
 * Two things a reviewer must decide rather than confirm: the retention periods
 * (a proposal is written in, flagged), and whether a DPO is required.
 */

export interface LegalBlock {
  heading: string;
  body: string;
  ticks: string;
}

export interface LegalCopy {
  draftNotice: string;
  blocks: LegalBlock[];
  updated: string;
  asideRunning: string;
  asideHeading: string;
  asideTicks: string;
  asideNote: string;
}

const MAIL = '<a href="mailto:hello@wemakeimpact.be">hello@wemakeimpact.be</a>';
const GBA =
  '<a href="https://www.gegevensbeschermingsautoriteit.be/" target="_blank" rel="noopener">gegevensbeschermingsautoriteit.be</a>';

export const PRIVACY_NL: LegalCopy = {
  draftNotice:
    '<strong>Klaar voor juridische controle.</strong> Deze tekst beschrijft wat de site ' +
    'en de backoffice vandaag effectief doen. Wat nog tussen <code>[ ]</code> staat, zijn ' +
    'gegevens van de rechtspersoon die IMPACT zelf moet invullen. De bewaartermijnen zijn ' +
    'een voorstel en moeten bevestigd worden. Publiceer pas na controle door de jurist.',
  blocks: [
    {
      heading: 'Wie verwerkt je gegevens',
      body:
        '[ Juridische naam ], [ rechtsvorm — vzw of bv ], met maatschappelijke zetel te ' +
        `[ adres ], ondernemingsnummer [ BE 0xxx.xxx.xxx ]. Voor vragen over je gegevens: ${MAIL}. ` +
        'We hebben geen functionaris voor gegevensbescherming aangesteld: we verwerken geen ' +
        'gegevens op grote schaal en volgen geen gedrag systematisch. [ Laat bevestigen. ]',
      ticks: ''
    },
    {
      heading: 'Welke gegevens en waarom',
      body: '',
      ticks: [
        '<strong>Wachtlijst voor een editie</strong> — voornaam en leeftijd van de deelnemer, ' +
          'e-mailadres van de ouder of voogd, en optioneel de gemeente. We gebruiken die om je te ' +
          'verwittigen wanneer de inschrijvingen voor die editie openen, en om te bepalen of de ' +
          'leeftijdsgroep past. Grondslag: toestemming.',
        '<strong>Nieuwsbrief</strong> — e-mailadres, en de taal waarin je de site bekeek. ' +
          'Grondslag: toestemming. Uitschrijven kan met één klik in elke mail.',
        '<strong>Contact- en samenwerkingsaanvragen</strong> — naam, e-mailadres, het onderwerp ' +
          'dat je koos en wat je zelf schrijft. Grondslag: het beantwoorden van je vraag, en ons ' +
          'gerechtvaardigd belang om die vraag op te volgen.',
        '<strong>Herkomst van je inschrijving</strong> — de pagina, de editie en de campagne ' +
          'waarlangs je binnenkwam. Dit zit aan je inschrijving vast zodat we weten wat werkt. ' +
          'Er wordt geen profiel van je opgebouwd en we combineren het niet met gegevens van derden.',
        '<strong>Tickets en deelnames</strong> — als je een ticket koopt, verloopt dat via ' +
          'Ticket Tailor. Zij verwerken je bestel- en deelnamegegevens; de betaling zelf gebeurt ' +
          'bij Stripe. Wij bewaren geen kaartgegevens en zien ze ook nooit.'
      ].join('\n')
    },
    {
      heading: 'Gegevens van minderjarigen',
      body:
        'Voor onze camps en days verzamelen we gegevens van kinderen en jongeren. Dat doen we ' +
        'altijd via de ouder of voogd: het e-mailadres dat je achterlaat is dat van de volwassene, ' +
        'en die geeft de toestemming.<br /><br />' +
        'Voor foto’s en video’s vragen we per deelnemer schriftelijke toestemming van de ' +
        'ouder of voogd, en per gebruik: beeld dat op de site of in een aftermovie komt, is apart ' +
        'toegestaan. Zonder die toestemming publiceren we het beeld niet — de backoffice toont zo’n ' +
        'fragment pas als de toestemming aangevinkt is, en toont anders niets.<br /><br />' +
        'Toestemming intrekken kan altijd en zonder reden, met een mail naar ' +
        `${MAIL}. We halen het beeld dan offline. Beeld dat al door derden gedeeld werd, kunnen ` +
        'we niet terughalen; dat zeggen we op voorhand.',
      ticks: ''
    },
    {
      heading: 'Hoe lang we ze bewaren',
      body:
        '[ Voorstel, te bevestigen door de jurist. ]',
      ticks: [
        '<strong>Wachtlijst</strong> — tot twaalf maanden na de editie waarvoor je je inschreef.',
        '<strong>Nieuwsbrief</strong> — tot je uitschrijft. Daarna houden we enkel je e-mailadres ' +
          'op een uitschrijflijst bij, zodat we je niet opnieuw aanschrijven.',
        '<strong>Contactvragen</strong> — tot twee jaar na het laatste contact.',
        '<strong>Beeldmateriaal van minderjarigen</strong> — zolang de toestemming loopt, en niet ' +
          'langer dan [ termijn ] na de editie.',
        '<strong>Tickets en bestellingen</strong> — zolang de boekhoudwet dat vraagt, vandaag ' +
          'zeven jaar. Die bewaring gebeurt bij Ticket Tailor en Stripe, niet bij ons.'
      ].join('\n')
    },
    {
      heading: 'Met wie we ze delen',
      body:
        'We verkopen je gegevens nooit door. We werken met de volgende verwerkers, elk met een ' +
        'verwerkersovereenkomst:',
      ticks: [
        '<strong>Brevo</strong> (Frankrijk, EU) — e-mail en de contactenlijst: nieuwsbrief en ' +
          'wachtlijsten, met de herkomst van je inschrijving.',
        '<strong>Ticket Tailor</strong> (Verenigd Koninkrijk) — events, tickets, wachtlijsten en ' +
          'deelnemers. Het VK heeft een adequaatheidsbesluit van de Europese Commissie.',
        '<strong>Stripe</strong> (Ierland, EU) — de betaling van een ticket, via Ticket Tailor.',
        '<strong>Netlify</strong> (Verenigde Staten) — hosting van de site. Doorgifte op basis ' +
          'van de standaardbepalingen van de Europese Commissie.',
        '<strong>Supabase</strong> (EU-regio) — de database achter onze backoffice, waarin de ' +
          'inhoud van de site staat.',
        '<strong>Plausible</strong> (EU) — bezoekersstatistieken zonder cookies en zonder ' +
          'persoonsgegevens.'
      ].join('\n')
    },
    {
      heading: 'Cookies en meten',
      body:
        'Deze site gebruikt geen advertentie- of trackingcookies. We bewaren enkel wat nodig is ' +
        'om de site te laten werken — bijvoorbeeld dat je een venster al hebt weggeklikt, en welke ' +
        'keuze je in de cookiebanner maakte. Die staan in je eigen browser en gaan nergens heen.' +
        '<br /><br />' +
        'Bezoekersstatistieken meten we met Plausible: zonder cookies, zonder IP-adressen te ' +
        'bewaren en zonder je over sites heen te volgen. Wat verder gaat dan dat, vragen we eerst.',
      ticks: ''
    },
    {
      heading: 'Waar je gegevens staan',
      body:
        'Je gegevens worden in de Europese Economische Ruimte verwerkt, behalve bij de twee ' +
        'verwerkers hierboven die daarbuiten zitten. Voor het Verenigd Koninkrijk geldt een ' +
        'adequaatheidsbesluit; voor de Verenigde Staten sluiten we de standaardbepalingen van ' +
        'de Europese Commissie.',
      ticks: ''
    },
    {
      heading: 'Je rechten',
      body:
        'Je kan je gegevens opvragen, laten verbeteren, laten wissen of laten overdragen, je kan ' +
        'bezwaar maken tegen een verwerking, en je kan je toestemming altijd intrekken — dat ' +
        'laatste verandert niets aan wat daarvoor al gebeurde. Stuur een mail naar ' +
        `${MAIL} en we reageren binnen 30 dagen, zoals de AVG voorschrijft. Duurt het ` +
        'uitzonderlijk langer, dan laten we dat binnen die 30 dagen weten.<br /><br />' +
        'Ben je het niet eens met hoe we ermee omgaan, dan kan je klacht indienen bij de ' +
        `Gegevensbeschermingsautoriteit, ${GBA}.`,
      ticks: ''
    }
  ],
  updated: 'Laatst bijgewerkt: [ datum van publicatie ].',
  asideRunning: 'Kort',
  asideHeading: 'Wat we niet doen',
  asideTicks: [
    'Geen advertentiecookies',
    'Geen doorverkoop van gegevens',
    'Geen profielen van bezoekers',
    'Geen mails die je niet gevraagd hebt',
    'Geen beeld van minderjarigen zonder toestemming'
  ].join('\n'),
  asideNote:
    'Vraag over je gegevens? Mail <a href="mailto:hello@wemakeimpact.be" ' +
    'style="color:var(--red);font-weight:600">hello@wemakeimpact.be</a>.'
};

export const PRIVACY_EN: LegalCopy = {
  draftNotice:
    '<strong>Ready for legal review.</strong> This text describes what the site and the ' +
    'backoffice actually do today. What is still in <code>[ ]</code> are details of the legal ' +
    'entity that IMPACT has to fill in. The retention periods are a proposal and need ' +
    'confirming. Do not publish before the lawyer has checked it.',
  blocks: [
    {
      heading: 'Who processes your data',
      body:
        '[ Legal name ], [ legal form ], registered office at [ address ], company number ' +
        `[ BE 0xxx.xxx.xxx ]. For questions about your data: ${MAIL}. We have not appointed a ` +
        'data protection officer: we do not process data at scale and do not systematically ' +
        'monitor behaviour. [ To be confirmed. ]',
      ticks: ''
    },
    {
      heading: 'What we collect and why',
      body: '',
      ticks: [
        '<strong>Waiting list for an edition</strong> — the participant’s first name and age, ' +
          'the parent or guardian’s email address, and optionally the town. We use these to tell ' +
          'you when registration for that edition opens, and to check the age group fits. ' +
          'Basis: consent.',
        '<strong>Newsletter</strong> — your email address and the language you were reading in. ' +
          'Basis: consent. One click in any email unsubscribes you.',
        '<strong>Contact and partnership enquiries</strong> — your name, email address, the ' +
          'subject you picked and whatever you write. Basis: answering your question, and our ' +
          'legitimate interest in following it up.',
        '<strong>Where your signup came from</strong> — the page, the edition and the campaign ' +
          'you arrived through. This stays attached to your signup so we know what works. No ' +
          'profile is built and we do not combine it with third-party data.',
        '<strong>Tickets and attendance</strong> — buying a ticket goes through Ticket Tailor. ' +
          'They process your order and attendance data; the payment itself happens at Stripe. ' +
          'We never hold or see card details.'
      ].join('\n')
    },
    {
      heading: 'Children’s data',
      body:
        'Our camps and days involve data about children and young people. We always collect it ' +
        'through the parent or guardian: the email address you leave is the adult’s, and the ' +
        'adult gives consent.<br /><br />' +
        'For photographs and video we ask for written consent per participant and per use: ' +
        'footage that appears on the site or in an aftermovie is agreed separately. Without that ' +
        'consent we do not publish it — the backoffice only shows such a clip once the consent ' +
        'is ticked, and shows nothing otherwise.<br /><br />' +
        `Consent can be withdrawn at any time and without a reason, by emailing ${MAIL}. We take ` +
        'the footage down. Material others have already shared is beyond our reach, and we say ' +
        'so up front.',
      ticks: ''
    },
    {
      heading: 'How long we keep it',
      body: '[ Proposal, to be confirmed by the lawyer. ]',
      ticks: [
        '<strong>Waiting list</strong> — up to twelve months after the edition you signed up for.',
        '<strong>Newsletter</strong> — until you unsubscribe. After that we keep only your email ' +
          'address on a suppression list, so we do not write to you again.',
        '<strong>Enquiries</strong> — up to two years after the last contact.',
        '<strong>Images of minors</strong> — as long as the consent stands, and no longer than ' +
          '[ period ] after the edition.',
        '<strong>Tickets and orders</strong> — as long as accounting law requires, currently ' +
          'seven years. That retention sits with Ticket Tailor and Stripe, not with us.'
      ].join('\n')
    },
    {
      heading: 'Who we share it with',
      body:
        'We never sell your data. We work with the following processors, each under a data ' +
        'processing agreement:',
      ticks: [
        '<strong>Brevo</strong> (France, EU) — email and the contact list: newsletter and waiting ' +
          'lists, with the origin of your signup.',
        '<strong>Ticket Tailor</strong> (United Kingdom) — events, tickets, waiting lists and ' +
          'attendees. The UK holds an adequacy decision from the European Commission.',
        '<strong>Stripe</strong> (Ireland, EU) — ticket payments, via Ticket Tailor.',
        '<strong>Netlify</strong> (United States) — hosting. Transfer under the European ' +
          'Commission’s standard contractual clauses.',
        '<strong>Supabase</strong> (EU region) — the database behind our backoffice, holding the ' +
          'site’s content.',
        '<strong>Plausible</strong> (EU) — visitor statistics without cookies or personal data.'
      ].join('\n')
    },
    {
      heading: 'Cookies and measurement',
      body:
        'This site uses no advertising or tracking cookies. We store only what the site needs to ' +
        'work — that you dismissed a panel, and the choice you made in the cookie banner. Those ' +
        'stay in your own browser and go nowhere.<br /><br />' +
        'We measure visits with Plausible: no cookies, no stored IP addresses, no following you ' +
        'across sites. Anything beyond that, we ask first.',
      ticks: ''
    },
    {
      heading: 'Where your data sits',
      body:
        'Your data is processed within the European Economic Area, except at the two processors ' +
        'above that sit outside it. The United Kingdom holds an adequacy decision; for the United ' +
        'States we rely on the European Commission’s standard contractual clauses.',
      ticks: ''
    },
    {
      heading: 'Your rights',
      body:
        'You can ask for your data, have it corrected, erased or ported, object to a processing, ' +
        'and withdraw consent at any time — withdrawing changes nothing about what happened ' +
        `before. Email ${MAIL} and we will answer within 30 days, as the GDPR requires. If it ` +
        'exceptionally takes longer, we will tell you inside those 30 days.<br /><br />' +
        'If you disagree with how we handle it, you can complain to the Belgian Data Protection ' +
        `Authority, ${GBA}.`,
      ticks: ''
    }
  ],
  updated: 'Last updated: [ date of publication ].',
  asideRunning: 'In short',
  asideHeading: 'What we do not do',
  asideTicks: [
    'No advertising cookies',
    'No selling of data',
    'No visitor profiles',
    'No email you did not ask for',
    'No images of minors without consent'
  ].join('\n'),
  asideNote:
    'Question about your data? Email <a href="mailto:hello@wemakeimpact.be" ' +
    'style="color:var(--red);font-weight:600">hello@wemakeimpact.be</a>.'
};
