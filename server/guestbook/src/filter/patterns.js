/*
 * The pattern lists. Edit these freely — they are meant to be tuned once you
 * see what actually arrives.
 *
 * Weights are additive and feed one score. config.holdScore (3 by default)
 * sends an entry to the queue; config.blockScore (8) means it is never
 * visible to anyone and, for the illegal categories, is not even stored.
 *
 * `target` picks which normalised form the pattern runs against:
 *   'normal'     — word boundaries intact. Use for anything that could appear
 *                  inside an innocent word.
 *   'aggressive' — separators stripped, leet folded. Catches "v-i-a-g-r-a",
 *                  but "cialis" would also match inside "specialist", so
 *                  patterns here must be long and specific.
 *   'raw'        — the untouched text, for structural things like markup.
 */

export const SPAM_PATTERNS = [
  // --- Pharmacy, the oldest guest book spam there is ---
  { id: 'pharma', weight: 5, target: 'aggressive',
    re: /viagra|cialis|levitra|tadalafil|sildenafil|kamagra|xanax|oxycontin|phentermine|tramadol/ },
  { id: 'pharma-offer', weight: 3, target: 'normal',
    re: /\b(no|without)\s+(a\s+)?prescription\b|\bcanadian\s+pharmacy\b|\bcheap\s+(pills|meds|drugs)\b/ },

  // --- Casino / betting ---
  { id: 'gambling', weight: 4, target: 'aggressive',
    re: /onlinecasino|slotmachine|freespins|bettingsite|pokeronline|situsjudi|slotgacor|togelonline|bandarqq/ },
  { id: 'gambling-terms', weight: 2, target: 'normal',
    re: /\b(casino|betting|jackpot|roulette|sportsbook)\b.*\b(bonus|deposit|free|win)\b/ },

  // --- Crypto / financial ---
  { id: 'crypto-scam', weight: 4, target: 'normal',
    re: /\b(bitcoin|crypto|ethereum|usdt|binance|forex)\b.{0,40}\b(profit|invest|double|earn|guaranteed|recovery|expert)\b/ },
  { id: 'recovery-scam', weight: 5, target: 'normal',
    re: /\b(recover|retrieve|recovery)\b.{0,30}\b(lost|stolen|scammed)\b.{0,30}\b(funds|crypto|bitcoin|money|wallet)\b/ },
  { id: 'money-fast', weight: 3, target: 'normal',
    re: /\b(earn|make)\s+\$?\d[\d,.]*\s*(k|usd|dollars)?\s*(a|per|\/)\s*(day|week|hour|month)\b/ },
  { id: 'loan-spam', weight: 3, target: 'normal',
    re: /\b(payday|instant|guaranteed)\s+loans?\b|\bbad\s+credit\s+(ok|accepted|no\s+problem)\b/ },

  // --- SEO / link selling ---
  { id: 'seo', weight: 4, target: 'normal',
    re: /\b(backlinks?|seo\s+services?|guest\s+post(ing)?|link\s+building|domain\s+authority|dofollow)\b/ },
  { id: 'cta', weight: 2, target: 'normal',
    re: /\b(click|visit|check\s+out)\s+(here|now|my\s+(site|profile|link)|this\s+link)\b/ },
  { id: 'promo-boiler', weight: 3, target: 'normal',
    re: /\b(best\s+regards|thanks?\s+for\s+the\s+(great\s+)?(post|article|info))\b.{0,80}(https?:|www\.)/ },

  // --- Adult advertising ---
  { id: 'adult-ads', weight: 4, target: 'aggressive',
    re: /escortservice|callgirl|sexcam|livecam|hookupnow|adultdating|onlyfansleak|pornsite/ },

  // --- Contact harvesting: the tell of a marketplace ad ---
  { id: 'contact-handle', weight: 3, target: 'normal',
    re: /\b(telegram|whatsapp|wickr|signal|icq|kik|snapchat|session)\b\s*[:@#]?\s*[+@a-z0-9._-]{3,}/ },
  { id: 'phone', weight: 2, target: 'normal',
    re: /\+?\d[\d\s().-]{8,}\d/ },
  { id: 'email', weight: 2, target: 'normal',
    re: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/ },

  // --- Structural tells ---
  { id: 'markup', weight: 5, target: 'raw',
    re: /<\s*(a|script|iframe|img|style|form|svg|object|embed)\b|\[url[=\]]|\[link[=\]]/i },
  { id: 'bbcode', weight: 3, target: 'raw', re: /\[\/?(b|i|u|img|quote)\]/i },
  { id: 'template-leak', weight: 4, target: 'raw',
    re: /\{\{.*\}\}|%[A-Z_]{3,}%|\$\{.*\}|\bspintax\b|\{[^}]+\|[^}]+\}/ },
];

/*
 * Illegal-content indicators. These are deliberately blunt: a hit here is
 * worth a block on its own, and the entry is never rendered anywhere.
 *
 * The CSAM layer is combination-based rather than keyword-based — a minor
 * indicator alone is innocent ("my daughter loved this site"), and a sexual
 * term alone is merely adult. Only the two together score, which is what
 * keeps the false-positive rate low enough to auto-block on.
 */
export const ILLEGAL_PATTERNS = [
  { id: 'drug-market', weight: 8, category: 'drugs', target: 'aggressive',
    re: /buycocaine|buyheroin|buymeth|buyketamine|mdmaforsale|cocaineforsale|methforsale|fentanylforsale|drugsforsale/ },
  { id: 'drug-market-2', weight: 8, category: 'drugs', target: 'normal',
    re: new RegExp('(\\b(?:cocaine|heroin|meth(amphetamine)?|fentanyl|mdma|ketamine|lsd|crack)\\b.{0,40}\\b(?:for\\s+sale|buy|sell|selling|order|shipping|discreet|delivery|vendor|in\\s+stock|dm\\s+me|hit\\s+me\\s+up)\\b)' +'|(\\b(?:for\\s+sale|buy|sell|selling|order|shipping|discreet|delivery|vendor|in\\s+stock|dm\\s+me|hit\\s+me\\s+up)\\b.{0,40}\\b(?:cocaine|heroin|meth(amphetamine)?|fentanyl|mdma|ketamine|lsd|crack)\\b)') },

  { id: 'weapons', weight: 8, category: 'weapons', target: 'normal',
    re: new RegExp('(\\b(?:guns?|firearms?|rifles?|pistols?|ak-?47|glock|ammo|silencers?|grenades?|explosives?)\\b.{0,40}\\b(?:for\\s+sale|no\\s+(?:background\\s+)?check|untraceable|ghost|unregistered|buy|sell|selling|shipping|dm\\s+me)\\b)' +'|(\\b(?:for\\s+sale|no\\s+(?:background\\s+)?check|untraceable|ghost|unregistered|buy|sell|selling|shipping|dm\\s+me)\\b.{0,40}\\b(?:guns?|firearms?|rifles?|pistols?|ak-?47|glock|ammo|silencers?|grenades?|explosives?)\\b)') },

  { id: 'stolen-data', weight: 8, category: 'fraud', target: 'normal',
    re: /\b(fullz|dumps?\s*\+?\s*pins?|cvv2?|carding|bank\s+logs|cc\s+dumps|skimmer)\b/ },
  { id: 'stolen-data-2', weight: 8, category: 'fraud', target: 'normal',
    re: /\b(stolen|hacked|cloned)\s+(cards?|credit\s+cards?|accounts?|paypal|bank\s+accounts?)\b/ },
  { id: 'forged-docs', weight: 8, category: 'fraud', target: 'normal',
    re: /\b(fake|forged|novelty|counterfeit)\s+(passports?|ids?|id\s+cards?|driver'?s?\s+licen[cs]es?|diplomas?|certificates?)\b/ },
  { id: 'counterfeit-cash', weight: 8, category: 'fraud', target: 'normal',
    re: /\bcounterfeit\s+(money|cash|notes|bills|currency)\b|\bsuper\s*notes?\s+for\s+sale\b/ },

  { id: 'violence-hire', weight: 10, category: 'violence', target: 'normal',
    re: /\b(hit\s*man|hitman|contract\s+kill(er|ing)|murder\s+for\s+hire)\b/ },
  { id: 'terror', weight: 10, category: 'violence', target: 'normal',
    re: /\b(how\s+to\s+(make|build)\s+(a\s+)?(bomb|explosive|ied)|pipe\s+bomb\s+(recipe|instructions))\b/ },

  /*
   * A hard-drug or weapon name with no supply context around it.
   *
   * The rules above deliberately need a sale term too, so that "I watched a
   * documentary about cocaine" is not treated as trafficking. That is right
   * for a forum and wrong for a guest book, where nobody has much reason to
   * type these at all.
   *
   * Weight 3 is exactly the hold threshold: on its own it sends the entry to
   * you rather than blocking it, so a legitimate mention costs one click and
   * never disappears. Combined with anything else it escalates normally.
   */
  { id: 'drug-mention', weight: 3, category: 'spam', target: 'normal',
    re: /\b(cocaine|heroin|meth|methamphetamine|fentanyl|mdma|ecstasy|ketamine|lsd|oxycodone|percocet|adderall)\b/ },
  { id: 'weapon-mention', weight: 3, category: 'spam', target: 'normal',
    re: /\b(ak-?47|glock|silencers?|suppressors?|grenades?|c4|semtex|ghost\s*guns?)\b/ },

  /*
   * Joined compounds, matched with separators already stripped.
   *
   * The combination matcher below needs word boundaries, so "child porn"
   * scores and "childporn" does not — neither half matches inside the
   * joined word. Running the combination without boundaries instead would
   * be far worse: "child" appears in "childhood", "sex" inside "Essex",
   * "rape" inside "grape", and a false positive here BLOCKS and DESTROYS
   * the text, so a loose rule is not an option.
   *
   * So this is an explicit list of concatenations with no innocent reading.
   * Deliberately absent: "childsex" and "kidsex", which an apostrophe strip
   * turns "my child's ex" and "my kids ex" into.
   *
   * Because it runs on the aggressive form, it also catches the spaced-out,
   * punctuated and leetspeak variants for free: "c.h.i.l.d p.o.r.n" and
   * "ch1ld p0rn" both fold to the same string.
   */
  { id: 'csam-joined', weight: 20, category: 'csam', target: 'aggressive',
    re: /child(porn|pornography|erotica|rape|molest)|kidd?(ie|y)porn|preteen(porn|nude|nudes|erotica)|toddler(porn|nude)|infant(porn|nude)|underage(porn|nude|nudes|erotica)|jailbait(porn|nude|nudes)|lolita(porn|nude|nudes)/ },

  // Known CSAM trade codewords. A hit is unambiguous, so it stands alone.
  { id: 'csam-codeword', weight: 20, category: 'csam', target: 'aggressive',
    re: /pthc|hussyfan|kingpass|r@ygold|raygold|childlover|lolitacity|pedomom|babyj/ },
];

/**
 * Combination matcher for CSAM. Scores only when a minor indicator and a
 * sexual indicator both appear, which is what separates it from both innocent
 * mentions of children and ordinary adult spam.
 */
export const CSAM_COMBINATION = {
  id: 'csam-combination',
  weight: 20,
  category: 'csam',
  minor: /\b(child(ren)?|kid(s)?|minor(s)?|preteen|pre-?teen|toddler|infant|underage|under\s*-?\s*age|jailbait|loli(ta)?|shota|(\d|1[0-7])\s*(yo|y\/o|year\s*old)|teen(s)?)\b/,
  sexual: /\b(porn|pornography|nude(s)?|naked|sex(ual|ting)?|xxx|explicit|hardcore|cp|pics?\s+for\s+trade|nsfw|erotic|fuck|rape)\b/,
};

/**
 * Domains that are essentially never a genuine recommendation in a guest book.
 * URL shorteners hide the destination; the rest are spam-farm favourites.
 */
export const BAD_DOMAINS = [
  'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'is.gd', 'buff.ly',
  'cutt.ly', 'rebrand.ly', 'shorturl.at', 'tiny.cc', 'rb.gy', 'bit.do',
  'adf.ly', 'shorte.st', 'bc.vc', 'linkvertise.com',
];

/** TLDs that carry a bad enough reputation to be worth a point on their own. */
export const BAD_TLDS = [
  'ru', 'su', 'cn', 'tk', 'ml', 'ga', 'cf', 'gq', 'top', 'xyz', 'buzz',
  'click', 'link', 'work', 'loan', 'download', 'stream', 'bid', 'win',
  'review', 'country', 'kim', 'party', 'science', 'date', 'racing',
];
