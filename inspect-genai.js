import * as genai from '@google/genai';
console.log('Exports:', Object.keys(genai));
console.log('Type of genai:', typeof genai);
if (genai.GoogleGenerativeAI) console.log('Has GoogleGenerativeAI');
if (genai.GenAI) console.log('Has GenAI');
if (genai.Client) console.log('Has Client');
