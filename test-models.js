// Test to list available models
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyBvYTShBTSfPrsPD95l4unxgmPPkCIncA8';

async function listModels() {
    console.log('Listing available Gemini models...\n');

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);

        const modelsToTry = [
            'gemini-3-flash-preview',
            'gemini-2.0-flash-exp',
            'gemini-1.5-flash',
        ];

        for (const modelName of modelsToTry) {
            try {
                console.log(`\nTrying model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent('Say hello');
                const response = await result.response;
                const text = response.text();
                console.log(`✅ ${modelName} works!`);
                console.log(`Response: ${text.substring(0, 50)}...`);
                break; // If one works, we're good
            } catch (error) {
                console.log(`❌ ${modelName} failed: ${error.message}`);
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

listModels();
