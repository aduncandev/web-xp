// Local period recreations of the classic start pages IE6 shipped pointing
// at. Rendered via iframe srcdoc; links post an 'ie-navigate' message so the
// outer browser chrome (address bar, history, title) stays in charge.
import { getArt } from '../../../xpArt';
import msnButterflyDrawn from 'assets/windowsIcons/msn.png';
import googleLogoDrawn from './google-logo.svg';

const msnLogo = getArt('msn-butterfly', msnButterflyDrawn);
const googleLogo = getArt('google-logo', googleLogoDrawn);

const NAV_SCRIPT =
  '<script>function nav(u){parent.postMessage({type:"ie-navigate",url:u},"*");return false;}</script>';

const msnHtml = `<html>
<head>
<title>MSN.com</title>
<style>
body{margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#000000;}
a{color:#003399;text-decoration:none;}
a:hover{text-decoration:underline;}
form{margin:0;}
.nav a{color:#ffffff;font-weight:bold;font-size:11px;}
.hd{background:#d8e4f8;color:#003399;font-weight:bold;font-size:11px;padding:2px 6px;border-bottom:1px solid #b0c4e8;}
.chan a{font-size:11px;}
.item{font-size:11px;padding:3px 6px 3px 6px;}
.small{font-size:10px;color:#666666;}
.small a{color:#666666;}
</style>
${NAV_SCRIPT}
</head>
<body>
<table width="770" cellpadding="0" cellspacing="0" border="0" align="center">
<tr>
<td width="200" valign="middle" style="padding:8px 0 8px 6px;">
<a href="http://www.msn.com/" onclick="return nav(this.href)"><img src="${msnLogo}" width="34" height="34" border="0" alt="MSN" style="vertical-align:middle;"><span style="font-family:Verdana,Arial,sans-serif;font-size:27px;font-weight:bold;color:#000000;margin-left:5px;vertical-align:middle;">msn<span style="color:#ff9933;">&#174;</span></span></a>
</td>
<td valign="middle">
<form onsubmit="return nav('https://www.bing.com/search?q='+encodeURIComponent(this.q.value))">
<b style="font-size:11px;">Search the Web:</b>
<input type="text" name="q" size="32" style="font-size:11px;">
<input type="submit" value="Search" style="font-size:11px;">
</form>
</td>
<td width="150" valign="middle" align="right" style="padding-right:6px;font-size:11px;">
<a href="https://www.hotmail.com" onclick="return nav(this.href)">Hotmail</a>&nbsp;|&nbsp;<a href="https://login.live.com" onclick="return nav(this.href)">Sign In</a>
</td>
</tr>
<tr>
<td colspan="3" class="nav" bgcolor="#003399" style="padding:3px 8px;">
<a href="http://www.msn.com/" onclick="return nav(this.href)">Home</a>&nbsp;&nbsp;|&nbsp;&nbsp;<a href="https://my.msn.com" onclick="return nav(this.href)">My MSN</a>&nbsp;&nbsp;|&nbsp;&nbsp;<a href="https://www.hotmail.com" onclick="return nav(this.href)">Hotmail</a>&nbsp;&nbsp;|&nbsp;&nbsp;<a href="https://shopping.msn.com" onclick="return nav(this.href)">Shopping</a>&nbsp;&nbsp;|&nbsp;&nbsp;<a href="https://money.msn.com" onclick="return nav(this.href)">Money</a>&nbsp;&nbsp;|&nbsp;&nbsp;<a href="https://chat.msn.com" onclick="return nav(this.href)">People &amp; Chat</a>
</td>
</tr>
<tr>
<td colspan="3">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td width="150" valign="top" style="border-right:1px solid #cccccc;">
<div class="hd">MSN Channels</div>
<div class="item chan">
<a href="https://autos.msn.com" onclick="return nav(this.href)">Autos</a><br>
<a href="https://careers.msn.com" onclick="return nav(this.href)">Careers &amp; Jobs</a><br>
<a href="https://cityguides.msn.com" onclick="return nav(this.href)">City Guides</a><br>
<a href="https://entertainment.msn.com" onclick="return nav(this.href)">Entertainment</a><br>
<a href="https://games.msn.com" onclick="return nav(this.href)">Games</a><br>
<a href="https://health.msn.com" onclick="return nav(this.href)">Health &amp; Fitness</a><br>
<a href="https://houseandhome.msn.com" onclick="return nav(this.href)">House &amp; Home</a><br>
<a href="https://kids.msn.com" onclick="return nav(this.href)">Kids</a><br>
<a href="https://encarta.msn.com" onclick="return nav(this.href)">Learning &amp; Research</a><br>
<a href="https://money.msn.com" onclick="return nav(this.href)">Money</a><br>
<a href="https://movies.msn.com" onclick="return nav(this.href)">Movies</a><br>
<a href="https://music.msn.com" onclick="return nav(this.href)">Music</a><br>
<a href="https://msnbc.msn.com" onclick="return nav(this.href)">News</a><br>
<a href="https://relationships.msn.com" onclick="return nav(this.href)">Relationships</a><br>
<a href="https://shopping.msn.com" onclick="return nav(this.href)">Shopping</a><br>
<a href="https://msn.foxsports.com" onclick="return nav(this.href)">Sports by FOX Sports</a><br>
<a href="https://tech.msn.com" onclick="return nav(this.href)">Tech &amp; Gadgets</a><br>
<a href="https://travel.msn.com" onclick="return nav(this.href)">Travel</a><br>
<a href="https://weather.msn.com" onclick="return nav(this.href)">Weather</a><br>
<a href="https://women.msn.com" onclick="return nav(this.href)">Women</a><br>
<a href="https://yellowpages.msn.com" onclick="return nav(this.href)">Yellow Pages</a>
</div>
</td>
<td valign="top">
<div class="hd">Today on MSN</div>
<div class="item">
&#8226; <a href="https://entertainment.msn.com" onclick="return nav(this.href)">Athens 2004: Phelps opens the Games with gold in the pool</a><br>
&#8226; <a href="https://msnbc.msn.com" onclick="return nav(this.href)">Hurricane Charley: Florida begins the long cleanup</a><br>
&#8226; <a href="https://www.microsoft.com/windowsxp" onclick="return nav(this.href)">Windows XP Service Pack 2: what you need to know</a><br>
&#8226; <a href="https://tech.msn.com" onclick="return nav(this.href)">Back-to-school tech that won't break the bank</a><br>
&#8226; <a href="https://autos.msn.com" onclick="return nav(this.href)">10 hot convertibles to drive before summer ends</a>
</div>
<div class="hd">News from MSNBC</div>
<div class="item">
&#8226; <a href="https://msnbc.msn.com" onclick="return nav(this.href)">Athens welcomes the world for the 2004 Olympic Games</a><br>
&#8226; <a href="https://msnbc.msn.com" onclick="return nav(this.href)">NASA's Messenger begins seven-year journey to Mercury</a><br>
&#8226; <a href="https://msnbc.msn.com" onclick="return nav(this.href)">Google prepares for its Wall Street debut</a>
</div>
</td>
<td width="180" valign="top" style="border-left:1px solid #cccccc;">
<div class="hd">Sign in to MSN</div>
<div class="item">
<a href="https://www.hotmail.com" onclick="return nav(this.href)"><b>Hotmail</b></a><br>
<span class="small">Free Web-based e-mail</span><br><br>
<a href="https://messenger.msn.com" onclick="return nav(this.href)"><b>Messenger</b></a><br>
<span class="small">Chat with friends online</span><br><br>
<a href="https://my.msn.com" onclick="return nav(this.href)"><b>My MSN</b></a><br>
<span class="small">Your personalized start page</span><br><br>
<a href="https://login.live.com" onclick="return nav(this.href)">Member sign in</a>
</div>
<div class="hd">Have you tried?</div>
<div class="item">
<a href="https://games.msn.com" onclick="return nav(this.href)">MSN Games by Zone.com</a><br>
<a href="https://encarta.msn.com" onclick="return nav(this.href)">Encarta Online</a><br>
<a href="https://music.msn.com" onclick="return nav(this.href)">MSN Music downloads</a>
</div>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td colspan="3" align="center" class="small" style="border-top:1px solid #cccccc;padding:6px;">
&#169; 2004 Microsoft Corporation. All rights reserved.&nbsp;
<a href="https://www.microsoft.com" onclick="return nav(this.href)">Terms of Use</a>&nbsp;
<a href="https://www.microsoft.com" onclick="return nav(this.href)">Advertise</a>&nbsp;
<a href="https://www.microsoft.com" onclick="return nav(this.href)">TRUSTe Approved Privacy Statement</a>&nbsp;
<a href="https://www.microsoft.com" onclick="return nav(this.href)">GetNetWise</a>&nbsp;
<a href="https://www.microsoft.com" onclick="return nav(this.href)">Anti-Spam Policy</a>
</td>
</tr>
</table>
</body>
</html>`;

const googleHtml = `<html>
<head>
<title>Google</title>
<style>
body{margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#000000;text-align:center;}
a{color:#0000cc;}
form{margin:0;}
.tabs{font-size:13px;}
.small{font-size:11px;}
.foot{font-size:13px;color:#000000;}
.copy{font-size:11px;color:#666666;}
</style>
${NAV_SCRIPT}
</head>
<body>
<div style="margin-top:68px;"><img src="${googleLogo}" width="276" height="110" alt="Google"></div>
<div class="tabs" style="margin-top:14px;">
<b>Web</b>&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://images.google.com" onclick="return nav(this.href)">Images</a>&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://groups.google.com" onclick="return nav(this.href)">Groups</a>&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://news.google.com" onclick="return nav(this.href)">News</a>&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://froogle.google.com" onclick="return nav(this.href)">Froogle</a>&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://www.google.com/options" onclick="return nav(this.href)" class="small">more&nbsp;&raquo;</a>
</div>
<form onsubmit="return nav('https://www.google.com/search?igu=1&amp;q='+encodeURIComponent(this.q.value))">
<table cellpadding="0" cellspacing="0" border="0" align="center" style="margin-top:10px;">
<tr>
<td align="center"><input type="text" name="q" size="55" maxlength="256" style="font-size:13px;"></td>
<td valign="middle" class="small" style="padding-left:10px;text-align:left;line-height:1.4;">
<a href="https://www.google.com/advanced_search" onclick="return nav(this.href)">Advanced&nbsp;Search</a><br>
<a href="https://www.google.com/preferences" onclick="return nav(this.href)">Preferences</a><br>
<a href="https://www.google.com/language_tools" onclick="return nav(this.href)">Language&nbsp;Tools</a>
</td>
</tr>
<tr>
<td align="center" style="padding-top:12px;">
<input type="submit" value="Google Search" style="font-size:12px;">&nbsp;
<input type="submit" value="I'm Feeling Lucky" style="font-size:12px;">
</td>
<td></td>
</tr>
</table>
</form>
<div class="foot" style="margin-top:60px;">
<a href="https://www.google.com/ads" onclick="return nav(this.href)">Advertising&nbsp;Programs</a> - <a href="https://www.google.com/services" onclick="return nav(this.href)">Business&nbsp;Solutions</a> - <a href="https://www.google.com/about" onclick="return nav(this.href)">About&nbsp;Google</a>
</div>
<div class="copy" style="margin-top:22px;">&copy;2004 Google - Searching 4,285,199,774 web pages</div>
</body>
</html>`;

const msnPage = {
  canonicalUrl: 'http://www.msn.com/',
  title: 'MSN.com',
  html: msnHtml,
};

const googlePage = {
  canonicalUrl: 'http://www.google.com/',
  title: 'Google',
  html: googleHtml,
};

/**
 * Returns the local period page for a URL (classic start-page hostnames at
 * their root path), or null so the real URL loads in the iframe.
 */
export function resolveLocalPage(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (e) {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const path = parsed.pathname.replace(/\/+$/, '') || '/';
  if (host === 'msn.com' && path === '/') return msnPage;
  if (host === 'google.com' && (path === '/' || path === '/webhp')) {
    return googlePage;
  }
  return null;
}
