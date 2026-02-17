# 🌍 AI Travel Planner for Students

An intelligent travel planning application that helps students create personalized, budget-friendly itineraries using AI and interactive maps.

![Travel Planner Demo](demo-screenshot.png)

## ✨ Features

- 🤖 **AI-Powered Itineraries**: Generate detailed day-by-day travel plans using Google Gemini AI
- 🗺️ **Interactive Maps**: Visualize your destinations with Leaflet.js and OpenStreetMap
- 💰 **Budget Management**: Smart budget tracking and cost optimization for students
- 🎨 **Modern UI**: Beautiful glassmorphism design with dark mode support
- 📱 **Fully Responsive**: Works seamlessly on mobile, tablet, and desktop
- ⚡ **Fast & Lightweight**: Built with Vite for optimal performance

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- Google Gemini API key (free tier available)

### Installation

1. **Clone or download this repository**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up your API key**
   
   Create a `.env` file in the project root:
   ```env
   VITE_GEMINI_API_KEY=your_actual_api_key_here
   ```

   To get a free Google Gemini API key:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Sign in with your Google account
   - Click "Create API Key"
   - Copy the key and paste it in your `.env` file

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:5173`

## 📖 How to Use

1. **Enter Your Destination**: Type in where you want to go (e.g., "Paris", "Tokyo", "New York")
2. **Set Your Budget**: Specify your total budget in USD
3. **Choose Trip Duration**: Select how many days you'll be traveling
4. **Select Interests**: Pick activities you enjoy (cultural, adventure, food, etc.)
5. **Pick Accommodation**: Choose your preferred lodging type
6. **Generate Itinerary**: Click the button and let AI create your perfect trip!

The app will:
- Show your destination on an interactive map
- Generate a detailed day-by-day itinerary
- Calculate costs and track your budget
- Provide money-saving tips and recommendations

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Build Tool**: Vite
- **Language**: Vanilla JavaScript (ES Modules)
- **AI SDK**: `@google/genai` (supporting Gemini 3.0 models)
- **Maps**: Leaflet.js + OpenStreetMap
- **Styling**: Custom CSS with glassmorphism and dark mode
- **Fonts**: Google Fonts (Inter, Outfit)

## 📁 Project Structure

```
ai-travel-planner/
├── index.html          # Main HTML structure
├── style.css           # Complete styling system
├── main.js             # Application controller
├── ai-service.js       # AI integration module
├── map-service.js      # Map functionality
├── budget-calculator.js# Budget tracking logic
├── package.json        # Dependencies
├── .env.example        # Environment template
└── .gitignore         # Git ignore rules
```

## 🌟 Key Features Explained

### AI Itinerary Generation
Uses Google's Gemini AI model to create personalized travel plans based on your preferences, budget, and interests. The AI considers:
- Local attractions and hidden gems
- Student-friendly pricing
- Logical activity sequencing
- Time management

### Budget Tracking
Automatically categorizes expenses into:
- Accommodation
- Food & Dining
- Activities & Attractions
- Transportation
- Miscellaneous

Provides real-time budget status and smart recommendations to stay within budget.

### Interactive Maps
- Real-time geocoding of destinations
- Custom markers for locations
- Distance calculations
- Responsive map controls

## 🎨 Design Highlights

- **Glassmorphism Cards**: Modern frosted-glass effect UI elements
- **Smooth Animations**: Micro-interactions on hover and transitions
- **Dark Mode**: Full dark theme support with system preference detection
- **Gradient Accents**: Vibrant color gradients throughout
- **Mobile-First**: Optimized for all screen sizes

## 🔒 Environment Variables

Create a `.env` file with:

```env
VITE_GEMINI_API_KEY=your_google_gemini_api_key
```

**Important**: Never commit your `.env` file to version control!

## 🚧 Future Enhancements

- [ ] Save and export itineraries as PDF
- [ ] User accounts and trip history
- [ ] Real-time flight and hotel booking integration
- [ ] Collaborative trip planning
- [ ] Weather forecast integration
- [ ] Currency conversion
- [ ] Offline mode support

## 🚀 Deployment

### Option 1: Netlify Drop (Easiest)
1. Run `npm run build` in your terminal.
2. Allow the build to complete (it creates a `dist` folder).
3. Drag and drop the `dist` folder to [Netlify Drop](https://app.netlify.com/drop).
4. **Note**: Your API key from `.env` is automatically included in the build. You don't need to configure it on Netlify!

### Option 2: Git Integration
1. Push this code to GitHub.
2. Initialise a new site on Netlify from Git.
3. Netlify will detect the `netlify.toml` and configure build settings automatically.
4. Set the `VITE_GEMINI_API_KEY` in Netlify Site Settings.

## 📝 License

This project is open source and available for educational purposes.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 💡 Tips for Students

- **Book in advance**: Flights and accommodation are cheaper when booked early
- **Use student discounts**: Many attractions offer student pricing
- **Travel off-season**: Prices drop significantly outside peak tourist months
- **Mix paid and free**: Balance expensive attractions with free walking tours
- **Local food**: Street food and local markets are cheaper than tourist restaurants

## 📧 Support

If you encounter any issues:
1. Check that your API key is correctly set in `.env`
2. Ensure you have a stable internet connection
3. Verify Node.js version is 18 or higher
4. Clear browser cache and try again

---

**Built with ❤️ for student travelers**

Happy travels! 🎒✈️🗺️
