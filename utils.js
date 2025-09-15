export function buildParams(client, query, src, dest, token, override = null) {
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

export function formatJson(original) {
    try {
        return JSON.parse(original);
    } catch (e) {
        return legacyFormatJson(original);
    }
}

export function rshift(val, n) {
    return (val >>> n);
}