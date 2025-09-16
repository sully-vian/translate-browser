import { rshift } from "./utils.js";

export class TokenAcquirer {
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