(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["TranslateBrowser"] = factory();
	else
		root["TranslateBrowser"] = factory();
})(this, () => {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  DEFAULT_CLIENT_SERVICE_URLS: () => (/* reexport */ DEFAULT_CLIENT_SERVICE_URLS),
  DEFAULT_RAISE_EXCEPTION: () => (/* reexport */ DEFAULT_RAISE_EXCEPTION),
  DEFAULT_SERVICE_URLS: () => (/* reexport */ DEFAULT_SERVICE_URLS),
  DEFAULT_USER_AGENT: () => (/* reexport */ DEFAULT_USER_AGENT),
  DUMMY_DATA: () => (/* reexport */ DUMMY_DATA),
  Detected: () => (/* reexport */ Detected),
  LANGCODES: () => (/* reexport */ LANGCODES),
  LANGUAGES: () => (/* reexport */ LANGUAGES),
  SPECIAL_CASES: () => (/* reexport */ SPECIAL_CASES),
  TokenAcquirer: () => (/* reexport */ TokenAcquirer),
  Translated: () => (/* reexport */ Translated),
  Translator: () => (/* reexport */ Translator)
});

;// ./src/utils.js
function buildParams(client, query, src, dest, token, override = null) {
    const params = {
        client: client,
        sl: src,
        tl: dest,
        h: dest,
        dt: ["at", "bd", "ex", "ls", "md", "qca", "rw", "rm", "ss", "t"],
        ie: "UTF-8",
        oe: "UTF-8",
        otf: 1,
        ssel: 0,
        tsel: 0,
        tl: token,
        q: query
    };

    if (override) {
        for (const [key, value] of Object.entries(override)) {
            params[key] = value;
        }
    }
    return params;
}

function legacyFormatJson(original) {
    // save state
    const states = [];
    let text = original;

    // save position for double-quoted texts
    const quoteMatches = [...text.matchAll(/"/g)];
    for (let i = 0; i < quoteMatches.length; i++) {
        // quoteMatches[i].index is a double quote
        const p = quoteMatches[i].index + 1;
        if (i % 2 === 0) {
            const nxt = text.indexOf('"', p);
            states.push([p, text.slice(p, nxt)]);
        }
    }

    // replace all weird characters in text
    while (text.includes(",,")) {
        text = text.replace(/,,/g, ",null,");
    }
    while (text.includes("[,")) {
        text = text.replace(/\[,/g, "[null,");
    }

    // recover state
    const quoteMatches2 = [...text.matchAll(/"/g)];
    for (let i = 0; i < quoteMatches2.length; i++) {
        const p = quoteMatches2[i].index + 1;
        if (i % 2 === 0) {
            const j = i / 2
            const nxt = text.indexOf('"', p);
            text = text.slice(0, p) + states[j][1] + text.slice(nxt);
        }
    }
    return JSON.parse(text);
}

function formatJson(original) {
    try {
        return JSON.parse(original);
    } catch (e) {
        return legacyFormatJson(original);
    }
}

function rshift(val, n) {
    return (val >>> n);
}
;// ./src/gtoken.js


class TokenAcquirer {
    /**
     * Google Translate API token generator
     *
     * translate.google.com uses a token to authorize the requests. If you are
     * not Google, you do have this token and will have to pay for use.
     * This class is the result of reverse engineering on the obfuscated and
     * minified code used by Google to generate such token.
     */

    constructor(tkk = "0", host = "translate.google.com") {
        this.tkk = tkk;
        this.host = host.includes("http") ? host : "https://" + host;

        // regular expressions for finding TKK in HTML
        this.RE_TKK = /tkk:\'(.+?)\'/g;
        this.RE_RAWTKK = /tkk:\'(.+?)\'/g;
    }

    async update() {
        // we don't need to update the base tkk value when it is still valid
        const now = Math.floor(Date.now() / 3600000.0);
        if (this.tkk && parseInt(this.tkk.split(".")[0]) === now) {
            return;
        }

        const response = await fetch(this.host);
        const text = await response.text();

        // try to find raw TKK first
        const rawTkkMatch = text.match(this.RE_TKK);
        if (rawTkkMatch) {
            this.tkk = rawTkkMatch[1];
            return;
        }

        // try to find TKK code
        const codeMatch = text.match(this.RE_TKK);
        let code = null;
        if (codeMatch) {
            code = codeMatch[1];
            // Unescape special ASCII characters like \x3d (=)
            code = code.replace(/\\x([0-9A-Fa-f]{2})/g, (match, hex) =>
                String.fromCharCode(parseInt(hex, 16))
            );
        }

        if (code) {
            try {
                // Execute the JS code directly
                // (much simpler than python AST parsing)

                const funcBody = `
                ${code};
                return { a: a, b: b, n: typeof n !== "undefined" ? n : 0 };
            `;
                console.log("funcBody:", funcBody);
                const func = new Function(funcBody);
                const { a, b, n } = func();

                // Calculate the final value (default operator is '+')
                const value = a + b;
                this.tkk = `${n}.${value}`;
            } catch (e) {
                // Fallback: try to extract values with regex
                const aMatch = code.match(/a\s*=\s*(-?\d+)/);
                const bMatch = code.match(/b\s*=\s*(-?\d+)/);
                const nMatch = code.match(/n\s*=\s*(-?\d+)/);

                if (aMatch && bMatch && nMatch) {
                    const a = parseInt(aMatch[1]);
                    const b = parseInt(bMatch[1]);
                    const n = parseInt(nMatch[1]);
                    const value = a + b;
                    this.tkk = `${n}.${value}`;
                }
            }
        }
    }

    xr(a, b) {
        const sizeB = b.length;
        let c = 0;
        while (c < sizeB - 2) {
            let d = b[c + 2];
            d = d >= "a" ? d.charCodeAt(0) - 87 : parseInt(d);
            d = b[c + 1] === "+" ? rshift(a, d) : a << d;
            a = b[c] === "+" ? (a + d) & 4294967295 : a ^ d;

            c += 3;
        }
        return a;
    }

    acquire(text) {
        const a = [];
        // convert text into char codes
        for (let i = 0; i < text.length; i++) {
            const val = text.charCodeAt(i);
            if (val < 0x10000) {
                a.push(val);
            } else {
                // Handle Unicode surrogates
                a.push(
                    Math.floor((val - 0x10000) / 0x400 + 0xD800),
                    Math.floor((val - 0x10000) % 0x400 + 0xDC00)
                );
            }
        }
        const b = this.tkk !== "0" ? this.tkk : "";
        const d = b.split(".");
        const bVal = d.length > 1 ? parseInt(d[0]) : 0;

        // Assume e means char code array
        const e = [];
        let g = 0;
        const size = a.length;

        while (g < size) {
            let l = a[g];

            // just append if l is less than 128 (ASCII: DEL)
            if (l < 128) {
                e.push(l);
            } else {
                // Append calculated value if l is less than 2048
                if (l < 2048) {
                    e.push(l >> 6 | 192);
                } else {
                    // Append calculated value if l matches aspecial condition
                    if ((l & 64512) === 55296
                        && g + 1 < size
                        && (a[g + 1] & 64512) === 56320) {
                        g += 1;
                        l = 65536 + ((l & 1023) << 10) + (a[g] & 1023);
                        e.push(l >> 18 | 240);
                        e.push(l >> 12 & 63 | 128);
                    } else {
                        e.push(l >> 12 | 224);
                    }
                    e.push(l >> 6 & 63 | 128);
                }
                e.push(l & 63 | 128);
            }
            g += 1;
        }
        let aVal = bVal;
        for (const value of e) {
            aVal += value;
            aVal = this.xr(aVal, "+-a^+6");
        }

        aVal = this.xr(aVal, "+-3^+b+-f");
        aVal ^= d.length > 1 ? parseInt(d[1]) : 0;

        if (aVal < 0) {
            aVal = (aVal & 2147483647) + 2147483648;
        }
        aVal %= 1000000; // 1E6

        return `${aVal}.${aVal ^ bVal}`;
    }

    async do(text) {
        await this.update();
        const tk = this.acquire(text);
        return tk;
    }
}
;// ./src/urls.js
const BASE = "https://translate.google.com";

/**
 * Made into arraow function to reproducethe ython behavior.
 */
const TRANSLATE = (host) => `https://${host}/translate_a/single`;
;// ./src/constants.js
const DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";

const DEFAULT_CLIENT_SERVICE_URLS = ["translate.googleapis.com"];

const DEFAULT_SERVICE_URLS = [
    "translate.google.ac",
    "translate.google.ad",
    "translate.google.ae",
    "translate.google.al",
    "translate.google.am",
    "translate.google.as",
    "translate.google.at",
    "translate.google.az",
    "translate.google.ba",
    "translate.google.be",
    "translate.google.bf",
    "translate.google.bg",
    "translate.google.bi",
    "translate.google.bj",
    "translate.google.bs",
    "translate.google.bt",
    "translate.google.by",
    "translate.google.ca",
    "translate.google.cat",
    "translate.google.cc",
    "translate.google.cd",
    "translate.google.cf",
    "translate.google.cg",
    "translate.google.ch",
    "translate.google.ci",
    "translate.google.cl",
    "translate.google.cm",
    "translate.google.cn",
    "translate.google.co.ao",
    "translate.google.co.bw",
    "translate.google.co.ck",
    "translate.google.co.cr",
    "translate.google.co.id",
    "translate.google.co.il",
    "translate.google.co.in",
    "translate.google.co.jp",
    "translate.google.co.ke",
    "translate.google.co.kr",
    "translate.google.co.ls",
    "translate.google.co.ma",
    "translate.google.co.mz",
    "translate.google.co.nz",
    "translate.google.co.th",
    "translate.google.co.tz",
    "translate.google.co.ug",
    "translate.google.co.uk",
    "translate.google.co.uz",
    "translate.google.co.ve",
    "translate.google.co.vi",
    "translate.google.co.za",
    "translate.google.co.zm",
    "translate.google.co.zw",
    "translate.google.com.af",
    "translate.google.com.ag",
    "translate.google.com.ai",
    "translate.google.com.ar",
    "translate.google.com.au",
    "translate.google.com.bd",
    "translate.google.com.bh",
    "translate.google.com.bn",
    "translate.google.com.bo",
    "translate.google.com.br",
    "translate.google.com.bz",
    "translate.google.com.co",
    "translate.google.com.cu",
    "translate.google.com.cy",
    "translate.google.com.do",
    "translate.google.com.ec",
    "translate.google.com.eg",
    "translate.google.com.et",
    "translate.google.com.fj",
    "translate.google.com.gh",
    "translate.google.com.gi",
    "translate.google.com.gt",
    "translate.google.com.hk",
    "translate.google.com.jm",
    "translate.google.com.kh",
    "translate.google.com.kw",
    "translate.google.com.lb",
    "translate.google.com.ly",
    "translate.google.com.mm",
    "translate.google.com.mt",
    "translate.google.com.mx",
    "translate.google.com.my",
    "translate.google.com.na",
    "translate.google.com.ng",
    "translate.google.com.ni",
    "translate.google.com.np",
    "translate.google.com.om",
    "translate.google.com.pa",
    "translate.google.com.pe",
    "translate.google.com.pg",
    "translate.google.com.ph",
    "translate.google.com.pk",
    "translate.google.com.pr",
    "translate.google.com.py",
    "translate.google.com.qa",
    "translate.google.com.sa",
    "translate.google.com.sb",
    "translate.google.com.sg",
    "translate.google.com.sl",
    "translate.google.com.sv",
    "translate.google.com.tj",
    "translate.google.com.tr",
    "translate.google.com.tw",
    "translate.google.com.ua",
    "translate.google.com.uy",
    "translate.google.com.vc",
    "translate.google.com.vn",
    "translate.google.com",
    "translate.google.cv",
    "translate.google.cz",
    "translate.google.de",
    "translate.google.dj",
    "translate.google.dk",
    "translate.google.dm",
    "translate.google.dz",
    "translate.google.ee",
    "translate.google.es",
    "translate.google.eu",
    "translate.google.fi",
    "translate.google.fm",
    "translate.google.fr",
    "translate.google.ga",
    "translate.google.ge",
    "translate.google.gf",
    "translate.google.gg",
    "translate.google.gl",
    "translate.google.gm",
    "translate.google.gp",
    "translate.google.gr",
    "translate.google.gy",
    "translate.google.hn",
    "translate.google.hr",
    "translate.google.ht",
    "translate.google.hu",
    "translate.google.ie",
    "translate.google.im",
    "translate.google.io",
    "translate.google.iq",
    "translate.google.is",
    "translate.google.it",
    "translate.google.je",
    "translate.google.jo",
    "translate.google.kg",
    "translate.google.ki",
    "translate.google.kz",
    "translate.google.la",
    "translate.google.li",
    "translate.google.lk",
    "translate.google.lt",
    "translate.google.lu",
    "translate.google.lv",
    "translate.google.md",
    "translate.google.me",
    "translate.google.mg",
    "translate.google.mk",
    "translate.google.ml",
    "translate.google.mn",
    "translate.google.ms",
    "translate.google.mu",
    "translate.google.mv",
    "translate.google.mw",
    "translate.google.ne",
    "translate.google.nf",
    "translate.google.nl",
    "translate.google.no",
    "translate.google.nr",
    "translate.google.nu",
    "translate.google.pl",
    "translate.google.pn",
    "translate.google.ps",
    "translate.google.pt",
    "translate.google.ro",
    "translate.google.rs",
    "translate.google.ru",
    "translate.google.rw",
    "translate.google.sc",
    "translate.google.se",
    "translate.google.sh",
    "translate.google.si",
    "translate.google.sk",
    "translate.google.sm",
    "translate.google.sn",
    "translate.google.so",
    "translate.google.sr",
    "translate.google.st",
    "translate.google.td",
    "translate.google.tg",
    "translate.google.tk",
    "translate.google.tl",
    "translate.google.tm",
    "translate.google.tn",
    "translate.google.to",
    "translate.google.tt",
    "translate.google.us",
    "translate.google.vg",
    "translate.google.vu",
    "translate.google.ws"
];

const SPECIAL_CASES = {
    "ee": "et"
};

const LANGUAGES = {
    "abk": "abkhaz",
    "ace": "acehnese",
    "ach": "acholi",
    "aar": "afar",
    "af": "afrikaans",
    "sq": "albanian",
    "alz": "alur",
    "am": "amharic",
    "ar": "arabic",
    "hy": "armenian",
    "as": "assamese",
    "ava": "avar",
    "awa": "awadhi",
    "ay": "aymara",
    "az": "azerbaijani",
    "ban": "balinese",
    "bal": "baluchi",
    "bm": "bambara",
    "bci": "baoulé",
    "bak": "bashkir",
    "eu": "basque",
    "btx": "batak karo",
    "bts": "batak simalungun",
    "bbc": "batak toba",
    "be": "belarusian",
    "bem": "bemba",
    "bn": "bengali",
    "bew": "betawi",
    "bho": "bhojpuri",
    "bik": "bikol",
    "bs": "bosnian",
    "bre": "breton",
    "bg": "bulgarian",
    "bua": "buryat",
    "yue": "cantonese",
    "ca": "catalan",
    "ceb": "cebuano",
    "cha": "chamorro",
    "che": "chechen",
    "zh": "chinese",
    "zh-cn": "chinese (simplified)",
    "zh-tw": "chinese (traditional)",
    "chk": "chuukese",
    "chv": "chuvash",
    "co": "corsican",
    "crh": "crimean tatar",
    "hr": "croatian",
    "cs": "czech",
    "da": "danish",
    "fa-af": "dari",
    "dv": "dhivehi",
    "din": "dinka",
    "doi": "dogri",
    "dom": "dombe",
    "nl": "dutch",
    "dyu": "dyula",
    "dzo": "dzongkha",
    "en": "english",
    "eo": "esperanto",
    "et": "estonian",
    "fao": "faroese",
    "fij": "fijian",
    "fil": "filipino (tagalog)",
    "fi": "finnish",
    "fon": "fon",
    "fr": "french",
    "fy": "frisian",
    "fur": "friulian",
    "ful": "fulani",
    "gaa": "ga",
    "gl": "galician",
    "ka": "georgian",
    "de": "german",
    "el": "greek",
    "gn": "guarani",
    "gu": "gujarati",
    "ht": "haitian creole",
    "cnh": "hakha chin",
    "ha": "hausa",
    "haw": "hawaiian",
    "he": "hebrew",
    "iw": "hebrew",
    "hil": "hiligaynon",
    "hi": "hindi",
    "hmn": "hmong",
    "hu": "hungarian",
    "hrx": "hunsrik",
    "iba": "iban",
    "is": "icelandic",
    "ig": "igbo",
    "ilo": "ilocano",
    "id": "indonesian",
    "ga": "irish",
    "it": "italian",
    "jam": "jamaican patois",
    "ja": "japanese",
    "jv": "javanese",
    "jw": "javanese",
    "kac": "jingpo",
    "kal": "kalaallisut",
    "kn": "kannada",
    "kau": "kanuri",
    "pam": "kapampangan",
    "kk": "kazakh",
    "kha": "khasi",
    "km": "khmer",
    "cgg": "kiga",
    "kik": "kikongo",
    "rw": "kinyarwanda",
    "ktu": "kituba",
    "trp": "kokborok",
    "kom": "komi",
    "gom": "konkani",
    "ko": "korean",
    "kri": "krio",
    "ku": "kurdish",
    "ckb": "kurdish (sorani)",
    "ky": "kyrgyz",
    "lo": "lao",
    "ltg": "latgalian",
    "la": "latin",
    "lv": "latvian",
    "lij": "ligurian",
    "lim": "limburgish",
    "ln": "lingala",
    "lt": "lithuanian",
    "lmo": "lombard",
    "lg": "luganda",
    "luo": "luo",
    "lb": "luxembourgish",
    "mk": "macedonian",
    "mad": "madurese",
    "mai": "maithili",
    "mak": "makassar",
    "mg": "malagasy",
    "ms": "malay",
    "ms-arab": "malay (jawi)",
    "ml": "malayalam",
    "mt": "maltese",
    "mam": "mam",
    "glv": "manx",
    "mi": "maori",
    "mr": "marathi",
    "mah": "marshallese",
    "mwr": "marwadi",
    "mfe": "mauritian creole",
    "mhr": "meadow mari",
    "mni-mtei": "meiteilon (manipuri)",
    "min": "minang",
    "lus": "mizo",
    "mn": "mongolian",
    "my": "myanmar (burmese)",
    "nhe": "nahuatl (eastern huasteca)",
    "ndc-zw": "ndau",
    "nde": "ndebele (south)",
    "new": "nepalbhasa (newari)",
    "ne": "nepali",
    "no": "norwegian",
    "nus": "nuer",
    "ny": "nyanja (chichewa)",
    "oci": "occitan",
    "or": "odia (oriya)",
    "om": "oromo",
    "oss": "ossetian",
    "pag": "pangasinan",
    "pap": "papiamento",
    "ps": "pashto",
    "fa": "persian",
    "pl": "polish",
    "por": "portuguese (portugal)",
    "pt": "portuguese (portugal, brazil)",
    "pa": "punjabi",
    "pa-arab": "punjabi (shahmukhi)",
    "kek": "q'eqchi'",
    "qu": "quechua",
    "rom": "romani",
    "ro": "romanian",
    "run": "rundi",
    "ru": "russian",
    "sme": "sami (north)",
    "sm": "samoan",
    "sag": "sango",
    "sa": "sanskrit",
    "sat": "santali",
    "gd": "scots gaelic",
    "nso": "sepedi",
    "sr": "serbian",
    "st": "sesotho",
    "crs": "seychellois creole",
    "shn": "shan",
    "sn": "shona",
    "scn": "sicilian",
    "szl": "silesian",
    "sd": "sindhi",
    "si": "sinhala (sinhalese)",
    "sk": "slovak",
    "sl": "slovenian",
    "so": "somali",
    "es": "spanish",
    "su": "sundanese",
    "sus": "susu",
    "sw": "swahili",
    "ssw": "swati",
    "sv": "swedish",
    "tl": "tagalog (filipino)",
    "tah": "tahitian",
    "tg": "tajik",
    "ber-latn": "tamazight",
    "ber": "tamazight (tifinagh)",
    "ta": "tamil",
    "tt": "tatar",
    "te": "telugu",
    "tet": "tetum",
    "th": "thai",
    "bod": "tibetan",
    "ti": "tigrinya",
    "tiv": "tiv",
    "tpi": "tok pisin",
    "ton": "tongan",
    "ts": "tsonga",
    "tsn": "tswana",
    "tcy": "tulu",
    "tum": "tumbuka",
    "tr": "turkish",
    "tk": "turkmen",
    "tuk": "tuvan",
    "ak": "twi (akan)",
    "udm": "udmurt",
    "uk": "ukrainian",
    "ur": "urdu",
    "ug": "uyghur",
    "uz": "uzbek",
    "ven": "venda",
    "vec": "venetian",
    "vi": "vietnamese",
    "war": "waray",
    "cy": "welsh",
    "wol": "wolof",
    "xh": "xhosa",
    "sah": "yakut",
    "yi": "yiddish",
    "yo": "yoruba",
    "yua": "yucatec maya",
    "zap": "zapotec",
    "zu": "zulu",
};


const LANGCODES = Object.fromEntries(
    Object.entries(LANGUAGES).map(([k, v]) => [v, k])
);

const DEFAULT_RAISE_EXCEPTION = false;

const DUMMY_DATA = [
    [["", null, null, 0]],
    null,
    "en",
    null,
    null,
    null,
    1,
    null,
    [["en"], null, [1], ["en"]],
];
;// ./src/models.js
class Base {
    constructor(response = null) {
        this.response = response;
    }
}

class Translated extends Base {
    /**
     * @param {string} src - source language (default: auto)
     * @param {string} dest - destination language (default: en)
     * @param {string} origin - original text
     * @param {string} text - translated text
     * @param {string} pronunciation - pronunciation
     * @param {Object} extraData - extra data (optional)
     * @param {Object} kwargs - additional arguments
     */
    constructor(src, dest, origin, text, pronunciation, extraData = null, ...kwargs) {
        super(...kwargs);
        this.src = src;
        this.dest = dest;
        this.origin = origin;
        this.text = text;
        this.pronunciation = pronunciation;
        this.extraData = extraData;
    }

    toString() {
        const extraDataRepr = this.extraData ?
            JSON.stringify(this.extraData).slice(0, 10) + "..." :
            "null";
        return `Translated(src=${this.src}, dest=${this.dest}, ` +
            `text=${this.text},pronunciation=${this.pronunciation}, ` +
            `extraData="${this.extraData}")`;
    }
}

class Detected extends Base {
    constructor(lang, confidence, ...kwargs) {
        super(...kwargs);
        this.lang = lang;
        this.confidence = confidence;
    }

    toString() {
        return `Detected(lang=${this.lang}, confidence=${this.confidence})`;
    }
}
;// ./src/client.js







const EXCLUDES = ["en", "ca", "fr"];

class Translator {
    /**
     * Google Translate AJAX API implementation class
     *
     * @param {string[]} serviceUrls - Google translate URL list. URLs will be used randomly.
     * @param {string} userAgent - The User-Agent header to send when making requests.
     * @param {boolean} raiseException - If true, raise exception if something goes wrong.
     */
    constructor({
        serviceUrls = DEFAULT_CLIENT_SERVICE_URLS,
        userAgent = DEFAULT_USER_AGENT,
        raiseException = DEFAULT_RAISE_EXCEPTION,
        listOperationmaxConcurrency = 2
    } = {}) {
        this.userAgent = userAgent;
        this.serviceUrls = ["translate.google.com"];
        this.clientType = "webapp";
        this.raiseException = raiseException;
        this.listOperationmaxConcurrency = listOperationmaxConcurrency;

        // init token acquirer
        this.tokenAcquirer = new TokenAcquirer("0", this.serviceUrls[0]);

        if (serviceUrls) {
            // default way of working: use the defined values from user app
            this.serviceUrls = serviceUrls;
            this.clientType = "webapp";
            this.tokenAcquirer = new TokenAcquirer("0", this.serviceUrls[0]);

            // Check if we have googleapis URL (client API)
            for (const url of serviceUrls) {
                if (url.includes("googleapis")) {
                    this.serviceUrls = ["translate.googleapis.com"];
                    this.clientType = "gtx";
                    break;
                }
            }
        }
    }

    pickServiceUrl() {
        if (this.serviceUrls.length === 1) {
            return this.serviceUrls[0];
        }
        const randomIndex = Math.floor(Math.random() * this.serviceUrls.length);
        return this.serviceUrls[randomIndex];
    }

    // _translate in the original python script
    async translateRaw(text, dest, src, override) {
        let token = "xxxx" // dummy default value here as it is not used by api client
        if (this.clientType === "webapp") {
            token = await this.tokenAcquirer.do(text);
        }

        const params = buildParams(
            this.clientType, text, src, dest, token, override
        );

        const url = TRANSLATE(this.pickServiceUrl());

        //convert params object to URLSearchParams for fetch
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            if (Array.isArray(value)) {
                // Handle arrays (like dt parameter)
                value.forEach(item => searchParams.append(key, item));
            } else {
                searchParams.append(key, value);
            }
        }

        const response = await fetch(`${url}?${searchParams.toString()}`, {
            method: "GET",
            headers: {
                "User-Agent": this.userAgent
            }
        });

        if (response.status === 200) {
            const text = await response.text();
            let data = formatJson(text);
            if (!Array.isArray(data)) {
                data = [data] // convert dict to list to match return type
            }
            return [data, response];
        }

        if (this.raiseException) {
            throw new Error(
                `Unexpected status code "${response.status}" from ${this.serviceUrls}`
            );
        }

        // return dummy data on error
        const dummyData = [...DUMMY_DATA]; // clone to avoid mutations
        dummyData[0][0][0] = text;
        return [dummyData, response];
    }

    parseExtraData(data) {
        const responseParts = {
            0: "translation",
            1: "all-translations",
            2: "original-language",
            5: "possible-translations",
            6: "confidence",
            7: "possible-mistakes",
            8: "language",
            11: "synonyms",
            12: "definitions",
            13: "examples",
            14: "see-also"
        }

        const extra = {};
        for (const [index, category] of Object.entries(responseParts)) {
            const idx = parseInt(index);
            extra[category] = (idx < data.length && data[idx]) ? data[idx] : null;
        }
        return extra;
    }

    async translate(text, dest = "en", src = "auto", kwargs = {}) {
        // language validation and normalization
        dest = dest.toLowerCase().split("_")[0];
        src = src.toLowerCase().split("_")[0];

        // validate source language
        if (src !== "auto" && !LANGUAGES[src]) {
            if (SPECIAL_CASES[src]) {
                src = SPECIAL_CASES[src];
            } else if (LANGCODES[src]) {
                src = LANGCODES[src];
            } else {
                throw new Error("Invalid source language:", src);
            }
        }

        // validate destination language
        if (!LANGUAGES[dest]) {
            if (SPECIAL_CASES[dest]) {
                dest = SPECIAL_CASES[dest];
            } else if (LANGCODES[dest]) {
                dest = LANGCODES[dest];
            } else {
                throw new Error("invalid destination language");
            }
        }

        // handle array input (batch translation)
        if (Array.isArray(text)) {
            const promises = text.map(item => this.translate(item, dest, src, kwargs));
            return await Promise.all(promises);
        }

        const origin = text;
        const [data, response] = await this.translateRaw(text, dest, src, kwargs);

        // Extract translated text
        const translated = data[0].map(d => d[0] || "").join("");

        const extraData = this.parseExtraData(data);

        // Get actual source language
        try {
            src = data[2];
        } catch (e) {
            // keep original src
        }

        // Get pronunciation
        let pron = origin;
        try {
            pron = data[0][1][-2];
        } catch (e) {
            try {
                pron = data[0][1][2];
            } catch (e) {
                // keep original
            }
        }

        if (EXCLUDES.includes(dest) && pron === origin) {
            pron = translated;
        }

        return new Translated(src, dest, origin, translated, pron, extraData);
    }

    async detect(text, kwargs = {}) {
        if (Array.isArray(text)) {
            const promises = text.map(item => this.detect(item, kwargs));
            return await Promise.all(promises);
        }

        const [data, response] = await this.translateRaw(text, "en", "auto", kwargs);

        // actualsource language that will be recognized by Google Translator
        // when the src passed is equal to "auto"
        let src = ""
        let confidence = 0.0;

        try {
            if (data[8][0].length > 1) {
                src = data[8][0];
                confidence = data[8][-2];
            } else {
                src = data[8][0].join("");
                confidence = data[8][-2][0];
            }
        } catch (e) {
            // keep defaults if parsing fails
        }
        return new Detected(src, confidence, response);
    }
}

;// ./src/index.js





/******/ 	return __webpack_exports__;
/******/ })()
;
});