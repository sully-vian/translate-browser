class Base {
    constructor(response = null) {
        this.response = response;
    }
}

export class Translated extends Base {
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

export class Detected extends Base {
    constructor(lang, confidence, ...kwargs) {
        super(...kwargs);
        this.lang = lang;
        this.confidence = confidence;
    }

    toString() {
        return `Detected(lang=${this.lang}, confidence=${this.confidence})`;
    }
}