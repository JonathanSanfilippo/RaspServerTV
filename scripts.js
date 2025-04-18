
  document.getElementById("year").textContent = new Date().getFullYear();

  const m3uUrls = [
    'https://raw.githubusercontent.com/JonathanSanfilippo/iptv-auto-cleaner/refs/heads/main/lists/original/original.m3u'
  ];

  let hls, allChannels = {}, currentGroup = 'UK';
  const player = document.getElementById('player');
  const channelList = document.getElementById('channelList');
  const countrySelector = document.getElementById('countrySelector');
  const searchBox = document.getElementById('searchBox');
  const statusMsg = document.getElementById('statusMessage');
  const channelTitle = document.getElementById('channelTitle');

  function parseM3UData(text, skipFlags = false) {
    const lines = text.split('\n');
    let name = '', logo = '', group = '', url = '';

    lines.forEach((line) => {
      if (line.startsWith('#EXTINF')) {
        const logoMatch = line.match(/tvg-logo="([^"]+)"/);
        const groupMatch = line.match(/group-title="([^"]+)"/);
        logo = logoMatch ? logoMatch[1] : '';
        group = groupMatch ? groupMatch[1] : 'Other';
        const parts = line.split(',');
        name = parts.length > 1 ? parts.slice(1).join(',').trim() : 'Unnamed';
      } else if (line.startsWith('http')) {
        url = line.trim();
        if (!allChannels[group]) allChannels[group] = [];
        allChannels[group].push({ name, logo, url });
      }
    });

    if (!skipFlags) {
      const countries = Object.keys(allChannels).sort();
      countries.forEach(c => createCountryFlag(c));

      fetch('https://ipinfo.io/json')
        .then(res => res.json())
        .then(ipdata => {
          const ipCountryCode = ipdata.country.toLowerCase();
          const groupName = Object.keys(allChannels).find(
            key => getCountryCode(key) === ipCountryCode
          );
          if (groupName) {
            const defaultBtn = document.querySelector(`[data-country="${groupName}"]`);
            if (defaultBtn) defaultBtn.click();
          }
          const flagUrl = `https://hatscripts.github.io/circle-flags/flags/${ipdata.country.toLowerCase()}.svg`;
          const info = `<a href='https://ipinfo.io/${ipdata.ip}' target='_blank' style='text-decoration: none; color: inherit;'>
            <img src='${flagUrl}' style=' width: 14px; vertical-align: middle;'>
            ${ipdata.country} (${ipdata.ip})
          </a>`;
          document.getElementById('locationInfo').innerHTML = info;
        })
        .catch(err => console.warn('IP info not available:', err));
    }
  }

  async function loadAllPlaylists(urls) {
    for (let i = 0; i < urls.length; i++) {
      try {
        const res = await fetch(urls[i]);
        const text = await res.text();
        parseM3UData(text, i < urls.length - 1);
      } catch (err) {
        console.error(`Error loading list ${i + 1}:`, err);
      }
    }
  }

  function playStream(url) {
    if (hls) hls.destroy();
    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(player);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
  player.play();
  statusMsg.textContent = '';

  // Evidenzia il canale che sta effettivamente partendo
  document.querySelectorAll('.channel').forEach(c => c.classList.remove('selected'));
  const selectedChannel = document.querySelector(`.channel[data-url="${url}"]`);
  if (selectedChannel) selectedChannel.classList.add('selected');
});

      hls.on(Hls.Events.ERROR, function (event, data) {
        if (data.fatal) {
          statusMsg.textContent = "Channel not available, trying another one...";
          const visible = Array.from(document.querySelectorAll('.channel')).filter(el => el.style.display !== 'none');
          const i = visible.findIndex(el => el.dataset.url === url);
          const next = visible[i + 1];
          if (next) {
            updateChannelTitle(next.dataset.display, next.dataset.logo);
            playStream(next.dataset.url);
          } else {
            statusMsg.textContent = "No other channel available.";
          }
        }
      });
    } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
      player.src = url;
      player.play();
    } else {
      alert("Your browser does not support HLS.");
    }
  }

  function updateChannelTitle(name, logo) {
    channelTitle.innerHTML = `
      <img src="${logo}" alt="" ><p> ${name}<p/>
      `;
  }

  function createChannelElement(name, logo, url) {
    const div = document.createElement('div');
    div.className = 'channel';
    div.dataset.url = url;
    div.dataset.name = name.toLowerCase();
    div.dataset.display = name;
    div.dataset.logo = logo;

    const img = document.createElement('img');
    img.src = logo && logo.trim() !== '' ? logo : 'https://img.icons8.com/office40/512/raspberry-pi.png';
    img.alt = name;
    img.className = 'channel-logo';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = name;
    nameSpan.className = 'channel-name';

    div.appendChild(img);
    div.appendChild(nameSpan);

    div.addEventListener('click', () => {
  // Rimuove "selected" da tutti i canali
  document.querySelectorAll('.channel').forEach(c => c.classList.remove('selected'));

  // Aggiunge "selected" solo al canale cliccato
  div.classList.add('selected');

  playStream(url);
  updateChannelTitle(name, logo);
});

    channelList.appendChild(div);
  }

  function getCountryCode(groupName) {
  const map = {
    "uk": "gb", "usa": "us", "canada": "ca", "ireland": "ie", "australia": "au",
    "india": "in", "japan": "jp", "china": "cn", "hong_kong": "hk", "macau": "mo",
    "taiwan": "tw", "north_korea": "kp", "korea": "kr", "denmark": "dk",
    "faroe_islands": "fo", "greenland": "gl", "finland": "fi", "iceland": "is",
    "norway": "no", "sweden": "se", "estonia": "ee", "latvia": "lv", "lithuania": "lt",
    "belgium": "be", "netherlands": "nl", "luxembourg": "lu", "germany": "de",
    "austria": "at", "switzerland": "ch", "poland": "pl", "czech_republic": "cz",
    "slovakia": "sk", "hungary": "hu", "romania": "ro", "moldova": "md", "bulgaria": "bg",
    "france": "fr", "italy": "it", "portugal": "pt", "spain": "es", "russia": "ru",
    "belarus": "by", "ukraine": "ua", "armenia": "am", "azerbaijan": "az", "georgia": "ge",
    "bosnia_and_herzegovina": "ba", "croatia": "hr", "montenegro": "me",
    "north_macedonia": "mk", "serbia": "rs", "slovenia": "si", "albania": "al",
    "kosovo": "xk", "greece": "gr", "cyprus": "cy", "andorra": "ad", "malta": "mt",
    "monaco": "mc", "san_marino": "sm", "iran": "ir", "iraq": "iq", "israel": "il",
    "qatar": "qa", "turkey": "tr", "united_arab_emirates": "ae", "argentina": "ar",
    "costa_rica": "cr", "dominican_republic": "do", "mexico": "mx", "paraguay": "py",
    "peru": "pe", "venezuela": "ve", "brazil": "br", "trinidad": "tt", "chad": "td",
    "somalia": "so", "indonesia": "id", "chile": "cl", "saudi_arabia": "sa",
    "afghanistan": "af", "algeria": "dz", "american_samoa": "as", "angola": "ao",
    "anguilla": "ai", "antarctica": "aq", "antigua_and_barbuda": "ag", "aruba": "aw",
    "bahamas": "bs", "bahrain": "bh", "bangladesh": "bd", "barbados": "bb",
    "belize": "bz", "benin": "bj", "bermuda": "bm", "bhutan": "bt",
    "bolivia_plurinational_state_of": "bo", "bonaire_sint_eustatius_and_saba": "bq",
    "botswana": "bw", "bouvet_island": "bv", "brunei_darussalam": "bn",
    "burkina_faso": "bf", "burundi": "bi", "cabo_verde": "cv", "cambodia": "kh",
    "cameroon": "cm", "cape_verde": "cv", "cayman_islands": "ky",
    "central_african_republic": "cf", "christmas_island": "cx",
    "cocos_keeling_islands": "cc", "colombia": "co", "comoros": "km",
    "congo_democratic_republic_of": "cd", "cook_islands": "ck", "cuba": "cu",
    "curaçao": "cw", "ivory_coast": "ci", "djibouti": "dj", "dominica": "dm",
    "ecuador": "ec", "egypt": "eg", "el_salvador": "sv", "equatorial_guinea": "gq",
    "eritrea": "er", "eswatini": "sz", "ethiopia": "et",
    "falkland_islands_malvinas": "fk", "fiji": "fj",
    "french_polynesia": "pf", "french_southern_territories": "tf",
    "gabon": "ga", "gambia": "gm", "ghana": "gh", "gibraltar": "gi",
    "grenada": "gd", "guadeloupe": "gp", "guam": "gu", "guatemala": "gt",
    "guernsey": "gg", "guinea": "gn", "guinea_bissau": "gw", "guyana": "gy",
    "haiti": "ht", "heard_island_and_mcdonald_islands": "hm", "honduras": "hn",
    "islamic_republic_of_iran": "ir", "isle_of_man": "im", "jamaica": "jm",
    "jersey": "je", "jordan": "jo", "kazakhstan": "kz", "kenya": "ke",
    "kiribati": "ki", "kosovo": "xk", "kuwait": "kw", "kyrgyzstan": "kg",
    "lao_peoples_democratic_republic": "la", "lebanon": "lb", "lesotho": "ls",
    "liberia": "lr", "libya": "ly", "liechtenstein": "li", "madagascar": "mg",
    "malawi": "mw", "malaysia": "my", "maldives": "mv", "mali": "ml",
    "marshall_islands": "mh", "martinique": "mq", "mauritania": "mr",
    "mauritius": "mu", "mayotte": "yt", "federated_states_of_micronesia": "fm",
    "moldova_republic_of": "md", "mongolia": "mn", "montserrat": "ms",
    "morocco": "ma", "mozambique": "mz", "myanmar": "mm", "namibia": "na",
    "nauru": "nr", "nepal": "np", "new_caledonia": "nc", "new_zealand": "nz",
    "nicaragua": "ni", "niger": "ne", "nigeria": "ng", "niue": "nu",
    "norfolk_island": "nf", "northern_mariana_islands": "mp", "oman": "om",
    "pakistan": "pk", "palau": "pw", "palestine_state_of": "ps", "panama": "pa",
    "papua_new_guinea": "pg", "philippines": "ph", "pitcairn": "pn",
    "puerto_rico": "pr", "russian_federation": "ru", "rwanda": "rw",
    "réunion": "re", "saint_barthélemy": "bl", "saint_helena_ascension_and_tristan_da_cunha": "sh",
    "saint_kitts_and_nevis": "kn", "saint_lucia": "lc", "saint_martin_french_part": "mf",
    "saint_pierre_and_miquelon": "pm", "saint_vincent_and_the_grenadines": "vc",
    "samoa": "ws", "sao_tome_and_principe": "st", "senegal": "sn",
    "seychelles": "sc", "sierra_leone": "sl", "singapore": "sg",
    "sint_maarten_dutch_part": "sx", "solomon_islands": "sb",
    "south_africa": "za", "south_georgia_and_the_south_sandwich_islands": "gs",
    "south_sudan": "ss", "sri_lanka": "lk", "sudan": "sd", "suriname": "sr",
    "svalbard_and_jan_mayen": "sj", "syrian_arab_republic": "sy",
    "tajikistan": "tj", "tanzania_united_republic_of": "tz", "thailand": "th",
    "timor_leste": "tl", "togo": "tg", "tokelau": "tk", "tonga": "to",
    "tunisia": "tn", "turkmenistan": "tm", "turks_and_caicos_islands": "tc",
    "tuvalu": "tv", "uganda": "ug", "united_kingdom": "gb",
    "united_states": "us", "united_states_minor_outlying_islands": "um",
    "uruguay": "uy", "uzbekistan": "uz", "vanuatu": "vu",
    "venezuela_bolivarian_republic_of": "ve", "viet_nam": "vn",
    "virgin_islands_british": "vg", "virgin_islands_us": "vi",
    "wallis_and_futuna": "wf", "western_sahara": "eh", "yemen": "ye",
    "zambia": "zm", "zimbabwe": "zw", "åland_islands": "ax"
  };
  const key = groupName.toLowerCase().trim();
  return map[key] || key;
}


  function createCountryFlag(country) {
    const code = getCountryCode(country);
    const wrapper = document.createElement('div');
    wrapper.className = 'flag-wrapper';

    const flag = document.createElement('img');
    flag.className = 'flag';
    flag.src = `https://hatscripts.github.io/circle-flags/flags/${code}.svg`;
    flag.onerror = () => {
      flag.src = 'https://parsefiles.back4app.com/JPaQcFfEEQ1ePBxbf6wvzkPMEqKYHhPYv8boI1Rc/11113cc80977b7c9417ce4fb349cbd35_low_res_Folder_Common.png';
    };
    flag.title = country;
    flag.dataset.country = country;

    const count = allChannels[country]?.length || 0;
    const label = document.createElement('div');
    label.className = 'flag-label';
    label.textContent = `${country} (${count})`;

    wrapper.appendChild(flag);
    wrapper.appendChild(label);

    wrapper.addEventListener('click', () => {
      document.querySelectorAll('.flag-wrapper').forEach(w => w.classList.remove('selected'));
      wrapper.classList.add('selected');
      loadCountry(country);
    });

    countrySelector.appendChild(wrapper);
  }

  function loadCountry(group) {
    currentGroup = group;
    channelList.innerHTML = '';
    const channels = allChannels[group] || [];
    channels.forEach(ch => createChannelElement(ch.name, ch.logo, ch.url));
    if (channels[0]) {
      updateChannelTitle(channels[0].name, channels[0].logo);
      playStream(channels[0].url);
    }
  }

  function searchChannels() {
    const term = searchBox.value.toLowerCase();
    channelList.innerHTML = '';
    if (term === '') {
      loadCountry(currentGroup);
      return;
    }
    for (const group in allChannels) {
      allChannels[group].forEach(channel => {
        if (channel.name.toLowerCase().includes(term)) {
          createChannelElement(channel.name, channel.logo, channel.url);
        }
      });
    }
  }

  searchBox.addEventListener('input', searchChannels);
  loadAllPlaylists(m3uUrls);



  fetch('https://raw.githubusercontent.com/JonathanSanfilippo/iptv-auto-cleaner/refs/heads/main/lists/info/stats.json')
    .then(res => res.json())
    .then(stats => {
      document.getElementById('updateDate').textContent = `Last update: ${stats.last_update}`;
      document.getElementById('validCount').textContent = `Valid channels: ${stats.valid}`;
      document.getElementById('skippedCount').textContent = `Skipped channels: ${stats.skipped}`;
      document.getElementById('totalCount').textContent = `Total entries: ${stats.total}`;
    })
    .catch(err => {
      console.warn("⚠️ Impossibile caricare stats.json:", err);
      document.getElementById('updateDate').textContent = "❌ Unable to load stats.";
    });
    
    
    //test
    

