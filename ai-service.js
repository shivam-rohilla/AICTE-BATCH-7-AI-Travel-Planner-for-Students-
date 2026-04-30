/**
 * AI Service — Multi-provider itinerary generator
 * Supports: Groq (LLaMA 3.3), Google Gemini 1.5 Flash, OpenRouter (free models)
 */

export const PROVIDERS = {
  groq: {
    name: 'Groq — LLaMA 3.3 70B',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    keyUrl: 'https://console.groq.com/keys',
    badge: '⚡ Fastest Free',
  },
  gemini: {
    name: 'Google Gemini 1.5 Flash',
    url: null, // handled separately
    model: 'gemini-1.5-flash',
    keyUrl: 'https://aistudio.google.com/apikey',
    badge: '🌟 Google AI',
  },
  openrouter: {
    name: 'OpenRouter — Llama 3 (Free)',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'meta-llama/llama-3-8b-instruct:free',
    keyUrl: 'https://openrouter.ai/keys',
    badge: '🔓 Free Tier',
  },
}

class AIService {
  constructor() {
    this.provider = 'groq'
    this.apiKey = null
  }

  setProvider(providerId) { this.provider = providerId }
  setApiKey(key)          { this.apiKey = key }
  isAvailable()           { return !!this.apiKey }

  // ── Public entry point ───────────────────────────────────────────────────

  async generateItinerary(params) {
    if (!this.apiKey) throw new Error('No API key configured.')

    const prompt = this.buildPrompt(params)
    let raw

    if (this.provider === 'gemini') {
      raw = await this._callGemini(prompt)
    } else {
      raw = await this._callOpenAICompat(prompt)
    }

    return this._parseJSON(raw)
  }

  // ── Prompt engineering ───────────────────────────────────────────────────

  buildPrompt({ destination, duration, budget, interests, accommodation }) {
    const interestStr = interests.length ? interests.join(', ') : 'general sightseeing'

    return `You are an expert student travel planner. Generate a detailed ${duration}-day itinerary for ${destination}.

HARD CONSTRAINTS:
- Total budget: ₹${budget} INR
- Duration: ${duration} days
- Accommodation: ${accommodation}
- Interests: ${interestStr}
- Target: University/college students — maximise value, prioritise authentic experiences
- At least one FREE activity per day
- Activities must be real, named places (not generic)

Return ONLY valid JSON — no markdown, no explanation — exactly matching this schema:
{
  "destination": "${destination}",
  "totalBudget": ${budget},
  "currency": "INR",
  "days": [
    {
      "day": 1,
      "title": "Descriptive day title",
      "theme": "One-line theme",
      "activities": [
        {
          "time": "09:00",
          "name": "Exact place name",
          "description": "2-3 sentences with local context and what makes it special",
          "category": "cultural|adventure|food|nightlife|nature|shopping|transport",
          "estimatedCost": 500,
          "duration": "2 hours",
          "location": "Full name for map geocoding (e.g. 'Eiffel Tower, Paris')",
          "tips": "Practical student tip — discounts, timing, what to avoid"
        }
      ]
    }
  ],
  "budgetBreakdown": {
    "accommodation": 0,
    "food": 0,
    "transport": 0,
    "activities": 0,
    "miscellaneous": 0
  },
  "packingList": ["item1", "item2"],
  "localTips": ["tip1", "tip2", "tip3", "tip4"],
  "emergencyInfo": {
    "police": "number",
    "ambulance": "number",
    "touristHelpline": "number or N/A"
  },
  "bestTimeToVisit": "season recommendation",
  "localCurrency": "currency name, symbol, and rough INR exchange rate",
  "languages": ["primary", "secondary if relevant"]
}`
  }

  // ── Provider calls ────────────────────────────────────────────────────────

  async _callGemini(prompt) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
          },
        }),
      }
    )
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Gemini ${res.status}: ${err}`)
    }
    const data = await res.json()
    return data.candidates[0].content.parts[0].text
  }

  async _callOpenAICompat(prompt) {
    const cfg = PROVIDERS[this.provider]
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...(this.provider === 'openrouter' ? {
          'HTTP-Referer': window.location.origin,
          'X-Title': 'AI Travel Planner for Students',
        } : {}),
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          {
            role: 'system',
            content: 'You are a travel planning expert. Always respond with valid JSON only — no markdown, no explanation, no extra text.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 8192,
        // Groq supports JSON mode natively
        ...(this.provider === 'groq' ? { response_format: { type: 'json_object' } } : {}),
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`${this.provider} ${res.status}: ${err}`)
    }
    const data = await res.json()
    return data.choices[0].message.content
  }

  // ── JSON parsing & validation ────────────────────────────────────────────

  _parseJSON(raw) {
    if (typeof raw === 'string') {
      // Strip markdown code fences if present
      raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    }

    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed.days)) throw new Error('Invalid response: missing days array')

    // Normalise budget breakdown — ensure it sums to something
    if (parsed.budgetBreakdown) {
      const total = Object.values(parsed.budgetBreakdown).reduce((a, b) => a + (b || 0), 0)
      if (!total && parsed.totalBudget) {
        const b = parsed.totalBudget
        parsed.budgetBreakdown = {
          accommodation: Math.round(b * 0.35),
          food:          Math.round(b * 0.25),
          transport:     Math.round(b * 0.15),
          activities:    Math.round(b * 0.15),
          miscellaneous: Math.round(b * 0.10),
        }
      }
    }

    return parsed
  }

  // ── Chatbot ───────────────────────────────────────────────────────────────

  async chat(messages) {
    if (!this.apiKey) throw new Error('No API key configured.')
    if (this.provider === 'gemini') {
      return this._chatGemini(messages)
    }
    return this._chatOpenAICompat(messages)
  }

  async _chatOpenAICompat(messages) {
    const cfg = PROVIDERS[this.provider]
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...(this.provider === 'openrouter' ? {
          'HTTP-Referer': window.location.origin,
          'X-Title': 'AI Travel Planner for Students',
        } : {}),
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`${this.provider} ${res.status}: ${err}`)
    }
    const data = await res.json()
    return data.choices[0].message.content
  }

  async _chatGemini(messages) {
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
    const system = messages.find(m => m.role === 'system')?.content || ''
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: system ? { parts: [{ text: system }] } : undefined,
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
        }),
      }
    )
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Gemini ${res.status}: ${err}`)
    }
    const data = await res.json()
    return data.candidates[0].content.parts[0].text
  }

  // ── Demo fallback ─────────────────────────────────────────────────────────

  getDemoItinerary({ destination, duration, budget, interests }) {
    const dayTitles = [
      'Arrival & First Impressions',
      'Culture & Heritage',
      'Local Markets & Street Food',
      'Hidden Gems & Nature',
      'Leisure & Departure Prep',
    ]
    const perDay = Math.round(budget / duration)

    const days = Array.from({ length: duration }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1} — ${dayTitles[i % dayTitles.length]}`,
      theme: 'Explore authentically on a student budget',
      activities: [
        {
          time: '08:30',
          name: `${destination} City Centre Walk`,
          description: `Start the day exploring the main square and historic streets of ${destination}. Perfect for photography and atmosphere before crowds arrive.`,
          category: 'cultural', estimatedCost: 0, duration: '1.5 hours',
          location: `${destination} city centre`,
          tips: 'Go before 9 AM for uncrowded photos — the light is best then too.',
        },
        {
          time: '10:30',
          name: 'Local Museum or Heritage Site',
          description: `Visit the most popular museum or historic site in ${destination}. Most global attractions offer student discounts of 30–50% with a valid university ID.`,
          category: 'cultural', estimatedCost: Math.round(perDay * 0.12), duration: '2 hours',
          location: `${destination} museum`,
          tips: 'Always carry your student ID — it can save you hundreds of rupees.',
        },
        {
          time: '13:00',
          name: 'Street Food Lunch at Local Market',
          description: 'Find vendors with the longest local queues — that is always the best food at the best price. Try two or three small portions to sample variety.',
          category: 'food', estimatedCost: Math.round(perDay * 0.08), duration: '1 hour',
          location: `${destination} local market`,
          tips: 'Avoid eating directly outside tourist sites — walk 2 streets away for 30% cheaper food.',
        },
        {
          time: '15:00',
          name: 'Neighbourhood Exploration & Photography',
          description: `Walk through a lesser-known neighbourhood of ${destination}. Discover street art, local architecture, and life that travel guides miss entirely.`,
          category: 'nature', estimatedCost: 0, duration: '2 hours',
          location: `${destination} old town`,
          tips: 'Download Maps.me for offline navigation — works without data.',
        },
        {
          time: '18:30',
          name: 'Sunset Viewpoint',
          description: `Watch golden hour from the best free viewpoint in ${destination}. Completely free, unforgettable, and perfect for travel photos.`,
          category: 'nature', estimatedCost: 0, duration: '1 hour',
          location: `${destination} viewpoint`,
          tips: 'Arrive 30 minutes before sunset for a good spot.',
        },
      ],
    }))

    const interestTags = interests.length ? interests : ['cultural', 'food']

    return {
      destination, totalBudget: budget, currency: 'INR', days,
      budgetBreakdown: {
        accommodation: Math.round(budget * 0.35),
        food:          Math.round(budget * 0.25),
        transport:     Math.round(budget * 0.15),
        activities:    Math.round(budget * 0.15),
        miscellaneous: Math.round(budget * 0.10),
      },
      packingList: [
        'Passport / Government ID', 'Student ID card', 'Power bank (10,000mAh+)',
        'Universal travel adapter', 'Comfortable walking shoes', 'Lightweight rain jacket',
        'Reusable water bottle', 'First aid kit', 'Sunscreen SPF 50+',
        'Camera or phone with offline maps downloaded', 'Emergency cash in local currency',
        'Digital copies of all documents in cloud storage',
      ],
      localTips: [
        `Always carry a printed copy of your accommodation address in the local language of ${destination}.`,
        'Download Google Maps offline for your destination BEFORE boarding your flight.',
        'Student ID saves 20–50% at most global museums, monuments, and transport.',
        'Use public transport or walk — local buses/metro cost 1/10th of a taxi.',
        'Eat where locals eat: find busy stalls 2+ streets away from tourist hotspots.',
        'Use Wise or Revolut card abroad — the best exchange rates, no hidden fees.',
      ],
      emergencyInfo: {
        police: '100 (India) — check local number',
        ambulance: '108 (India) — check local number',
        touristHelpline: '1800-11-1363 (India Tourism)',
      },
      bestTimeToVisit: `Research the ideal season for ${destination} to avoid extreme weather and peak crowds.`,
      localCurrency: 'Research current exchange rates — use Wise or bank transfer for best rates.',
      languages: ['Research basic local phrases — even 5 words creates goodwill with locals.'],
      _isDemo: true,
      _interests: interestTags,
    }
  }
}

export default AIService
