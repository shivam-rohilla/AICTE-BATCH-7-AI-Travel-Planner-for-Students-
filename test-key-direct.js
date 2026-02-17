// Secure test script - Run this and paste your key when prompted
import { GoogleGenerativeAI } from '@google/generative-ai';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n🔐 SECURE API KEY TESTER');
console.log('-----------------------------------');
console.log('This script bypasses the .env file to test your key directly.\n');

rl.question('Please paste your NEW API key here: ', async (apiKey) => {
    const cleanKey = apiKey.trim();

    if (!cleanKey) {
        console.log('❌ No key provided.');
        rl.close();
        return;
    }

    console.log(`\nTesting key: ${cleanKey.substring(0, 4)}...${cleanKey.substring(cleanKey.length - 4)}`);

    try {
        const genAI = new GoogleGenerativeAI(cleanKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        console.log('Sending request to Gemini...');
        const result = await model.generateContent('Say "Success!" if you can hear me.');
        const response = await result.response;
        const text = response.text();

        console.log('\n✅ SUCCESSS! Your API key is working perfectly.');
        console.log(`Response: ${text}`);
        console.log('\nIf this worked, the issue is with your .env file or VITE caching.');

    } catch (error) {
        console.log('\n❌ FAILED. The issue is definitely with the API key or Google Account.');
        console.log(`Error: ${error.message}`);
    }

    rl.close();
});
