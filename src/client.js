import { TokenAcquirer } from "./gtoken.js";
import { buildParams, formatJson } from "./utils.js";
import { TRANSLATE } from "./urls.js";

import {
    DEFAULT_CLIENT_SERVICE_URLS,
    DEFAULT_USER_AGENT,
    DEFAULT_RAISE_EXCEPTION,
    DUMMY_DATA,
    LANGUAGES,
    LANGCODES,
    SPECIAL_CASES
} from "./constants.js";
import { Translated, Detected } from "./models.js";

const EXCLUDES = ["en", "ca", "fr"];

export class Translator {
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
