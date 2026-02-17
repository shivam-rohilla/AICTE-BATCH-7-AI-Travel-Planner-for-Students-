// Quick test script to verify Gemini API connection
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyBvYTShBTSfPrsPD95l4unxgmPPkCIncA8';

async function testAPI() {
    console.log('Testing Gemini API connection...');

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const result = await model.generateContent('Say "Hello, world!" in a friendly way.');
        const response = await result.response;
        const text = response.text();

        console.log('✅ API is working!');
        console.log('Response:', text);
    } catch (error) {
        console.error('❌ API test failed:');
        console.error('Error:', error.message);
        console.error('Full error:', error);
    }
}

testAPI();
