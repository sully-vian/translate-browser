import { Translator } from "./client.js";

const translator = new Translator();

const translationForm = document.getElementById("translationForm");
const textInput = document.getElementById("textInput");
const translatedText = document.getElementById("translatedText");
const detectedLanguage = document.getElementById("detectedLanguage");

async function translate() {
    const result = await translator.translate(textInput.value);
    detectedLanguage.textContent = `[${result.src}]`;
    translatedText.textContent = result.text;
}

translationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    translate();
});