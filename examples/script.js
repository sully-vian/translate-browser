import { LANGUAGES, Translator } from "../dist/translate-browser.esm.js";

// import { LANGUAGES } from "../src/constants.js";
// import { Translator } from "../src/client.js";

const translator = new Translator();

const srcLangSelect = document.getElementById("srcLangSelect");
const destLangSelect = document.getElementById("destLangSelect");
const textInput = document.getElementById("textInput");
const translationForm = document.getElementById("translationForm");
const translationResult = document.getElementById("translationResult");

autosize(textInput);

for (const [code, lang] of Object.entries(LANGUAGES)) {
    const srcOption = document.createElement("option");
    srcOption.value = code;
    srcOption.textContent = lang;
    srcLangSelect.appendChild(srcOption);

    const destOption = document.createElement("option");
    destOption.value = code;
    destOption.textContent = lang;
    destLangSelect.appendChild(destOption);
}

async function translateText() {
    const text = textInput.value.trim();
    const srcLang = srcLangSelect.value;
    const destLang = destLangSelect.value;

    try {
        const result = await translator.translate(text, destLang, srcLang);
        translationResult.textContent = result.text;
    } catch (error) {
        console.log("Translation error:", error);
    }
}

translationForm.onsubmit = (event) => {
    event.preventDefault();
    translateText();
};
