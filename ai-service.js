import { GoogleGenAI } from '@google/genai';

class AIService {
    constructor(apiKey) {
        if (!apiKey) {
            console.error('API Key is missing!');
            return;
        }

        // Initialize with new SDK
        this.client = new GoogleGenAI({ apiKey: apiKey });
        // Use the model that is confirmed to work with the user's key
        this.modelName = 'gemini-3-flash-preview';
    }

    /**
     * Check if AI service is available
     */
    isAvailable() {
        return !!this.client;
    }

    /**
     * Generate an itinerary based on user preferences
     */
    async generateItinerary(params) {
        if (!this.client) {
            throw new Error('AI service not initialized. Please provide an API key.');
        }

        const { destination, duration, budget, interests, accommodation } = params;

        const prompt = this.buildPrompt(destination, duration, budget, interests, accommodation);

        try {
            console.log(`Sending request to Gemini API (${this.modelName})...`);

            // New SDK usage
            const result = await this.client.models.generateContent({
                model: this.modelName,
                contents: [{ parts: [{ text: prompt }] }],
            });

            // Parse response from new SDK structure
            let text = '';
            // Detailed check for new response structure
            if (result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts[0]) {
                text = result.candidates[0].content.parts[0].text;
            } else {
                console.error('Unexpected response structure:', JSON.stringify(result, null, 2));
                throw new Error('Unexpected response structure from Gemini API');
            }

            console.log('AI Response received:', text.substring(0, 200) + '...');

            // Parse the response into structured data
            return this.parseItinerary(text, duration, budget);
        } catch (error) {
            console.warn('API call failed, switching to mock mode:', error.message);
            // Return a high-quality mock itinerary based on the destination
            return this.generateMockItinerary(destination, duration, budget, interests);
        }
    }

    /**
     * Build the prompt for AI
     */
    buildPrompt(destination, duration, budget, interests, accommodation) {
        const interestsList = interests.length > 0 ? interests.join(', ') : 'general sightseeing';

        return `You are a helpful travel planner for students. Create a detailed ${duration}-day itinerary for ${destination}.

REQUIREMENTS:
- Total budget: $${budget} USD
- Interests: ${interestsList}
- Accommodation preference: ${accommodation}
- Focus on budget-friendly options suitable for students
- Include specific activity names, not just general categories

For each day, provide:
1. 3-5 activities with specific names
2. Estimated cost for each activity in INR (₹)
3. Brief description of why it's recommended
4. Approximate time allocation

FORMAT YOUR RESPONSE EXACTLY AS FOLLOWS:

DAY 1: [Theme/Area]
Activity: [Specific Activity Name]
Cost: ₹[Amount]
Time: [Duration]
Description: [Why visit and what to expect]

Activity: [Next Activity Name]
Cost: ₹[Amount]
Time: [Duration]
Description: [Why visit and what to expect]

[Continue for all activities]

DAY 2: [Theme/Area]
[Same format]

IMPORTANT:
- Keep within the ₹${budget} total budget
- Suggest free or low-cost alternatives where possible
- Include mix of must-see attractions and hidden gems
- Consider practical logistics (location proximity, opening hours)
- Be specific with activity names (e.g., "Louvre Museum" not just "museum visit")`;
    }

    /**
     * Parse AI response into structured itinerary data
     */
    parseItinerary(text, duration, budget) {
        const days = [];
        let totalCost = 0;

        // Split by days
        const dayMatches = text.match(/DAY \d+:.*?(?=DAY \d+:|$)/gs);

        if (!dayMatches) {
            // Fallback parsing
            return this.createFallbackItinerary(duration, budget);
        }

        dayMatches.forEach((dayText, index) => {
            const dayNumber = index + 1;
            const dayTitleMatch = dayText.match(/DAY \d+: (.+)/);
            const dayTitle = dayTitleMatch ? dayTitleMatch[1].trim() : `Day ${dayNumber}`;

            // Extract activities
            const activities = [];
            const activityBlocks = dayText.split(/Activity:/g).slice(1);

            activityBlocks.forEach((block) => {
                const nameMatch = block.match(/^([^\n]+)/);
                const costMatch = block.match(/Cost: \$?(\d+(?:\.\d{2})?)/i);
                const timeMatch = block.match(/Time: ([^\n]+)/i);
                const descMatch = block.match(/Description: ([^\n]+)/i);

                if (nameMatch) {
                    const cost = costMatch ? parseFloat(costMatch[1]) : 0;
                    totalCost += cost;

                    activities.push({
                        name: nameMatch[1].trim(),
                        cost: cost,
                        time: timeMatch ? timeMatch[1].trim() : 'Flexible',
                        description: descMatch ? descMatch[1].trim() : '',
                    });
                }
            });

            if (activities.length > 0) {
                days.push({
                    day: dayNumber,
                    title: dayTitle,
                    activities: activities,
                });
            }
        });

        // Ensure we have the right number of days
        while (days.length < duration) {
            days.push(this.createDefaultDay(days.length + 1));
        }

        return {
            days: days.slice(0, duration),
            totalCost: Math.round(totalCost * 100) / 100,
            budget: budget,
        };
    }

    /**
     * Create a fallback itinerary if parsing fails
     */
    createFallbackItinerary(duration, budget) {
        const days = [];
        const costPerDay = Math.floor(budget / duration);

        for (let i = 1; i <= duration; i++) {
            days.push(this.createDefaultDay(i, costPerDay));
        }

        return {
            days,
            totalCost: budget,
            budget,
        };
    }

    /**
     * Create a default day structure
     */
    createDefaultDay(dayNumber, costPerDay = 50) {
        return {
            day: dayNumber,
            title: `Day ${dayNumber} - Explore & Discover`,
            activities: [
                {
                    name: 'Morning exploration',
                    cost: costPerDay * 0.3,
                    time: '2-3 hours',
                    description: 'Start your day with local sights',
                },
                {
                    name: 'Lunch at local spot',
                    cost: costPerDay * 0.2,
                    time: '1 hour',
                    description: 'Try authentic local cuisine',
                },
                {
                    name: 'Afternoon activity',
                    cost: costPerDay * 0.4,
                    time: '3-4 hours',
                    description: 'Main attraction or activity',
                },
                {
                    name: 'Evening relaxation',
                    cost: costPerDay * 0.1,
                    time: '2 hours',
                    description: 'Unwind and enjoy the atmosphere',
                },
            ],
        };
    }

    /**
     * Generate a mock itinerary when API fails
     */
    generateMockItinerary(destination, duration, budget, interests) {
        console.log('Generating mock itinerary for:', destination);

        // Create realistic mock activities based on destination
        const isParis = destination.toLowerCase().includes('paris');
        const isTokyo = destination.toLowerCase().includes('tokyo');
        const isNY = destination.toLowerCase().includes('york');

        const days = [];
        let totalCost = 0;

        for (let i = 1; i <= duration; i++) {
            let activities = [];

            if (isParis) {
                activities = this.getParisActivities(i);
            } else if (isTokyo) {
                activities = this.getTokyoActivities(i);
            } else if (isNY) {
                activities = this.getNYActivities(i);
            } else {
                // Generic activities for other cities
                activities = this.getGenericActivities(i, destination);
            }

            // Adjust costs to fit budget
            activities.forEach(act => {
                totalCost += act.cost;
            });

            days.push({
                day: i,
                title: `Day ${i}: Exploring ${destination}`,
                activities: activities
            });
        }

        return {
            days,
            totalCost: Math.round(totalCost * 100) / 100,
            budget: budget,
            isMock: true // Flag to indicate this is mock data
        };
    }

    getParisActivities(day) {
        const activities = [
            [
                { name: 'Eiffel Tower Picnic', cost: 0, time: '2 hours', description: 'Enjoy the view from Champ de Mars gardens' },
                { name: 'Louvre Museum', cost: 17, time: '3-4 hours', description: 'World-famous art museum (free for EU students under 26)' },
                { name: 'Seine River Cruise', cost: 15, time: '1 hour', description: 'Scenic boat tour passing major monuments' }
            ],
            [
                { name: 'Montmartre Walk', cost: 0, time: '3 hours', description: 'Explore the artistic district and Sacré-Cœur' },
                { name: 'Latin Quarter Lunch', cost: 15, time: '1.5 hours', description: 'Affordable crepes and student atmosphere' },
                { name: 'Luxembourg Gardens', cost: 0, time: '2 hours', description: 'Beautiful public park perfect for relaxing' }
            ],
            [
                { name: 'Le Marais Window Shopping', cost: 0, time: '2 hours', description: 'Trendy district with historic architecture' },
                { name: 'Pompidou Center', cost: 14, time: '2 hours', description: 'Modern art museum with great rooftop views' },
                { name: 'Canal Saint-Martin', cost: 0, time: '2 hours', description: 'Popular spot for student hangouts' }
            ]
        ];
        return activities[(day - 1) % activities.length];
    }

    getTokyoActivities(day) {
        const activities = [
            [
                { name: 'Senso-ji Temple', cost: 0, time: '2 hours', description: 'Ancient Buddhist temple in Asakusa' },
                { name: 'Ueno Park', cost: 0, time: '2 hours', description: 'Large park with museums and zoo' },
                { name: 'Akihabara', cost: 0, time: '3 hours', description: 'Electric town famous for anime and electronics' }
            ],
            [
                { name: 'Meiji Shrine', cost: 0, time: '1.5 hours', description: 'Serene Shinto shrine in a forest' },
                { name: 'Harajuku Takeshita Street', cost: 0, time: '2 hours', description: 'Famous for youth fashion and crepes' },
                { name: 'Shibuya Crossing', cost: 0, time: '1 hour', description: 'Busiest pedestrian crossing in the world' }
            ],
            [
                { name: 'Tsukiji Outer Market', cost: 20, time: '2 hours', description: 'Fresh seafood and street food' },
                { name: 'TeamLab Planets', cost: 25, time: '2 hours', description: 'Immersive digital art museum' },
                { name: 'Odaiba', cost: 0, time: '3 hours', description: 'Man-made island with futuristic architecture' }
            ]
        ];
        return activities[(day - 1) % activities.length];
    }

    getNYActivities(day) {
        const activities = [
            [
                { name: 'Central Park Walk', cost: 0, time: '3 hours', description: 'Iconic urban park with many landmarks' },
                { name: 'Metropolitan Museum of Art', cost: 30, time: '3-4 hours', description: 'Massive art collection (pay what you wish for NY students)' },
                { name: 'Times Square', cost: 0, time: '1 hour', description: 'Bright lights and billboards' }
            ],
            [
                { name: 'High Line Park', cost: 0, time: '2 hours', description: 'Linear park built on historic freight rail line' },
                { name: 'Chelsea Market', cost: 20, time: '1.5 hours', description: 'Indoor food hall with many options' },
                { name: 'Brooklyn Bridge Walk', cost: 0, time: '1.5 hours', description: 'Iconic bridge with skyline views' }
            ],
            [
                { name: 'Staten Island Ferry', cost: 0, time: '1.5 hours', description: 'Free ferry with views of Statue of Liberty' },
                { name: 'Wall Street & Charging Bull', cost: 0, time: '1 hour', description: 'Financial district landmarks' },
                { name: '9/11 Memorial', cost: 0, time: '1 hour', description: 'Somber memorial pools' }
            ]
        ];
        return activities[(day - 1) % activities.length];
    }

    getGenericActivities(day, destination) {
        return [
            { name: 'City Center Walking Tour', cost: 0, time: '3 hours', description: `Explore the main sights of ${destination}` },
            { name: 'Local Museum Visit', cost: 15, time: '2 hours', description: 'Learn about local history and culture' },
            { name: 'Park Relaxation', cost: 0, time: '1.5 hours', description: 'Enjoy local green spaces' },
            { name: 'Local Market', cost: 0, time: '1 hour', description: 'Browse local goods and food' }
        ];
    }
}

export default AIService;
