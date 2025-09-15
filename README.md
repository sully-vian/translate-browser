# Browser Translate

A **free** and **unlimited** JavaScript library that implements Google Translate API for browsers. This is a pure JavaScript/TypeScript port of the popular [py-googletrans](https://github.com/ssut/py-googletrans) Python library, designed to work directly in web browsers without any external dependencies.

## Features

- 🌐 **Browser-native** - Works directly in any modern web browser
- 🚀 **Zero dependencies** - Pure JavaScript, no npm packages required
- 🔍 **Auto language detection** - Automatically detects source language
- 📦 **Bulk translations** - Translate multiple texts in a single request
- 🎯 **Same API as Google Translate** - Uses the same servers as translate.google.com
- 💨 **Fast and reliable** - Direct API calls to Google's translation service
- 🔧 **Customizable** - Support for custom service URLs and proxy configurations

## Quick Start

1. Clone or download the repository
2. Open [`index.html`](browser-translate/index.html) in your browser
3. Use the translation interface or check the console for programmatic examples

## Basic Usage

### Simple Translation

```javascript
// Create a translator instance
const translator = new Translator();

// Translate text (auto-detects source language)
translator.translate('Hello, world!', 'es')
  .then(result => {
    console.log(result.text); // "¡Hola mundo!"
    console.log(result.src);  // "en"
    console.log(result.dest); // "es"
  });

// Translate with specific source language
translator.translate('Bonjour le monde', 'en', 'fr')
  .then(result => {
    console.log(result.text); // "Hello world"
  });
```

### Language Detection

```javascript
translator.detect('这是中文')
  .then(result => {
    console.log(result.lang);       // "zh"
    console.log(result.confidence); // 0.99
  });
```

### Bulk Translation

```javascript
const texts = [
  'The quick brown fox',
  'jumps over',
  'the lazy dog'
];

translator.translate(texts, 'ko')
  .then(results => {
    results.forEach(result => {
      console.log(`${result.origin} -> ${result.text}`);
    });
    // The quick brown fox -> 빠른 갈색 여우
    // jumps over -> 이상 점프
    // the lazy dog -> 게으른 개
  });
```

### Custom Service URLs

```javascript
// Use different Google Translate domains
const translator = new Translator({
  serviceUrls: [
    'translate.google.com',
    'translate.google.co.kr',
    'translate.google.co.jp'
  ]
});

// Or use the direct API (no token required)
const apiTranslator = new Translator({
  serviceUrls: ['translate.googleapis.com']
});
```

## API Reference

### Translator Class

#### Constructor

```javascript
new Translator(options = {})
```

**Options:**

- `serviceUrls` - Array of Google Translate service URLs
- `userAgent` - Custom user agent string
- `timeout` - Request timeout in milliseconds

#### Methods

##### translate(text, dest, src)

Translates text from source language to destination language.

**Parameters:**

- `text` - String or array of strings to translate
- `dest` - Destination language code (e.g., 'en', 'es', 'fr')
- `src` - Source language code (optional, auto-detects if not provided)

**Returns:** Promise resolving to translation result(s)

##### detect(text)

Detects the language of the given text.

**Parameters:**

- `text` - String to detect language for

**Returns:** Promise resolving to detection result

## Supported Languages

The library supports all languages available in Google Translate. Language codes are defined in [`constants.js`](browser-translate/constants.js).

Common language codes:

- `en` - English
- `es` - Spanish
- `fr` - French
- `de` - German
- `zh` - Chinese
- `ja` - Japanese
- `ko` - Korean
- `ru` - Russian
- `ar` - Arabic
- `hi` - Hindi

## File Structure

```sh
browser-translate/
├── index.html     # Demo page and usage examples
├── client.js      # Main Translator class
├── gtoken.js      # Token generation logic
├── constants.js   # Language codes and constants
├── models.js      # Result data structures
├── urls.js        # Service URL management
├── utils.js       # Utility functions
└── script.js      # Demo interface logic
```

## How It Works

This library works by reverse-engineering the token generation mechanism used by Google Translate's web interface. The core logic is ported from the original Python implementation, which figured out how to generate the required authentication tokens by analyzing Google's obfuscated JavaScript code.

**Note:** This is an unofficial library that uses Google Translate's web API and is not associated with Google. The token generation mechanism could be blocked or changed at any time.

## Limitations

- **15k character limit** per translation request
- **Rate limiting** - Google may temporarily block your IP if you make too many requests
- **Stability** - As an unofficial API, it may break if Google changes their service
- **CORS** - May require a CORS proxy for some domains due to browser security policies

## Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

Requires support for:

- `fetch()` API
- `Promise` and `async/await`
- ES6 modules (if using module imports)

## Development

To contribute or modify the library:

1. Clone the repository
2. Make your changes to the JavaScript files
3. Test using the demo page in [`index.html`](browser-translate/index.html)
4. Ensure compatibility across different browsers

## Disclaimer

This library is not affiliated with Google and uses their translate service unofficially. For production applications requiring guaranteed stability, consider using [Google's official Cloud Translation API](https://cloud.google.com/translate/docs).

## Acknowledgments

- Original [py-googletrans](https://github.com/ssut/py-googletrans) library by SuHun Han
- Reverse engineering work on Google Translate's token generation mechanism
