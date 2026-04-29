const { getTextExtractor } = require('office-text-extractor');
const extractor = getTextExtractor();
console.log(extractor.extractText.toString());
