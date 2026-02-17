import { GoogleGenAI } from '@google/genai';

const client = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });

async function test() {
    try {
        console.log('Listing available models...');
        // Try to list models to see what is available
        // Note: This might fail if the API key is restricted
        /*
        const models = await client.models.list(); 
        console.log('Available models:', models);
        */

        const modelsToTry = [
            'gemini-2.0-flash-exp',
            'gemini-1.5-flash',
            'gemini-1.5-flash-001',
            'gemini-3-flash-preview' // User requested
        ];

        for (const model of modelsToTry) {
            try {
                console.log(`\nTesting ${model}...`);
                const result = await client.models.generateContent({
                    model: model,
                    contents: [{ parts: [{ text: 'Hello' }] }],
                });
                console.log(`✅ Result received for ${model}`);
                console.log('Result type:', typeof result);
                console.log('Result keys:', Object.keys(result));
                // Log full result to see structure
                console.log(JSON.stringify(result, null, 2));
                break;
            } catch (err) {
                console.log(`❌ Failed with ${model}: ${err.message}`);
            }
        }

    } catch (err) {
        console.error('Fatal Error:', err.message);
    }
}

test();
