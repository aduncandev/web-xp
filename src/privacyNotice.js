/*
 * The site's privacy notice, in one place.
 *
 * Three surfaces render it and they must not drift apart: the message box the
 * guest book shows the first time somebody signs, privacy.txt in My Documents
 * on the virtual disk, and the licence page in Setup.
 *
 * It is written plainly rather than in legalese on purpose — a notice nobody
 * reads protects nobody, and the actual facts here are short enough to say
 * outright. Everything it claims is checked against what the code does; if
 * the guest book's retention settings change, this changes with them.
 */

export const PRIVACY_CONTACT = 'aduncandev@proton.me';

/** Days the guest book keeps a raw IP. Mirrors RETAIN_RAW_IP_DAYS. */
export const IP_RETENTION_DAYS = 30;

/**
 * The short form, for the message box shown at the moment of collection.
 * Kept to what actually changes someone's decision to press Sign.
 */
export const PRIVACY_SUMMARY = [
  'Signing the guest book sends your entry to a server.',
  '',
  'Published with your entry:',
  '    your name, your message, and "from" if you fill it in',
  '',
  'Kept privately, to stop spam and abuse:',
  `    your IP address, for ${IP_RETENTION_DAYS} days`,
  '    a one-way hash of it, kept indefinitely, so someone',
  '        can be blocked without keeping their address',
  "    your browser's user agent string",
  '',
  'Entries are checked before they appear, so yours may not',
  'show up immediately.',
  '',
  'Nothing else on this desktop leaves your browser. The files',
  'you make, your accounts and your settings are stored on your',
  'own machine. There are no cookies, no analytics and no',
  'tracking of any kind.',
  '',
  `To have an entry removed, email ${PRIVACY_CONTACT}`,
].join('\n');

/**
 * The full text, for privacy.txt and the Setup licence page. Written to look
 * like the plain-text notices that shipped alongside a Windows install.
 */
export const PRIVACY_FULL = [
  'PRIVACY NOTICE',
  'webxp.net',
  '',
  '',
  '1. WHAT THIS SITE IS',
  '',
  '   webxp.net (also served at aduncan.dev) is a personal site',
  '   presented as a Windows XP desktop. Almost everything in it',
  '   runs entirely inside your browser. This notice explains',
  '   the one part that does not.',
  '',
  '',
  '2. WHAT STAYS ON YOUR COMPUTER',
  '',
  '   The files you create, the accounts you make, your wallpaper,',
  '   your desktop layout and every setting are stored by your',
  '   browser on your own machine, using its local storage. None',
  '   of it is transmitted anywhere, and nobody but you can read',
  '   it. Clearing your browser data for this site deletes all of',
  '   it permanently.',
  '',
  '   There are no cookies. There is no analytics, no advertising,',
  '   no tracking, and no third-party scripts.',
  '',
  '',
  '3. THE GUEST BOOK',
  '',
  '   The guest book is the only feature that deliberately sends',
  '   anything to a server, and the only one that stores what you type.',
  '',
  '   When you sign it, these are published on the page:',
  '',
  '       - the name you enter',
  '       - the message you write',
  '       - the "from" field, if you fill it in',
  '',
  '   Write only what you are happy for strangers to read. The',
  '   guest book is public.',
  '',
  '   These are kept privately, and are never shown to anyone but',
  '   the site owner:',
  '',
  `       - your IP address, deleted after ${IP_RETENTION_DAYS} days`,
  '       - a one-way cryptographic hash of your IP address,',
  '         kept indefinitely',
  '       - the user agent string your browser sends',
  '       - the time you signed',
  '',
  '   These exist to stop spam and abuse: to limit how often one',
  '   person can post, and to block someone who misuses it. The',
  '   hash is kept rather than the address so that a block can',
  '   keep working after the address itself has been deleted. A',
  '   hash cannot be turned back into an address.',
  '',
  '   Entries are checked automatically before they appear, so',
  '   yours may not show up straight away. Entries that appear to',
  '   advertise or supply illegal material are never published. In',
  '   the most serious category the text is not stored at all.',
  '',
  '   Entries awaiting a decision are also sent to a private Discord',
  '   channel that only the site owner can see, so that they can be',
  '   reviewed. Your address is never included there.',
  '',
  '',
  '4. WEB SERVER LOGS',
  '',
  '   Like every website, the server that delivers these pages keeps',
  '   an access log: the address that asked for each file, the time,',
  '   and the browser that asked. This happens for every visit, not',
  '   only for people who sign the guest book, and it is how the',
  '   server is diagnosed when something breaks.',
  '',
  "   These logs rotate and are deleted on the web server's own",
  '   schedule. They are not combined with guest book entries and are',
  '   not used to build any profile of anyone.',
  '',
  '',
  '5. OTHER PARTS OF THE SITE',
  '',
  '   PictoChat connects to a separate chat service run by the',
  '   same owner at chat.aduncan.dev. What you type there is sent',
  '   to that service and is not covered by this notice.',
  '',
  '   Internet Explorer in this desktop can load real websites at',
  '   your request. Those sites are not run by this one and have',
  '   their own practices.',
  '',
  '',
  '6. YOUR ENTRY, REMOVED',
  '',
  '   Ask and it will be deleted. You do not have to give a reason',
  '   and you do not have to prove it was yours if you can point',
  '   to which one it is. You can also ask what is held about you.',
  '',
  `   Email: ${PRIVACY_CONTACT}`,
  '',
  '',
  '7. CHANGES',
  '',
  '   If this notice changes, the version in the guest book and',
  '   the copy in this file change together.',
].join('\n');
