const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

// Read the source file
const sourceCode = fs.readFileSync(path.join(__dirname, 'camera-server-sizer.js'), 'utf8');

// Obfuscate with balanced settings (less aggressive than before)
const obfuscatedCode = JavaScriptObfuscator.obfuscate(sourceCode, {
  compact: true,
  controlFlowFlattening: true, 
  controlFlowFlatteningThreshold: 0.5, // Reduced from 1
  deadCodeInjection: false, // Removed to improve performance
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: true,
  rotateStringArray: true,
  selfDefending: true,
  stringArray: true,
  stringArrayEncoding: ['base64'], // Less intensive than rc4
  stringArrayThreshold: 0.8,
  transformObjectKeys: true,
  unicodeEscapeSequence: false // Disabled for better performance
}).getObfuscatedCode();

// Write to a new file
fs.writeFileSync(path.join(__dirname, 'private', 'camera-server-sizer.min.js'), obfuscatedCode);
console.log('Obfuscation complete!');