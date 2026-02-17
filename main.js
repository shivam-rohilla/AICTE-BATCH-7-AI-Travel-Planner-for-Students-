import './style.css';
import MapService from './map-service.js';
import AIService from './ai-service.js';
import BudgetCalculator from './budget-calculator.js';

// Initialize services
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const mapService = new MapService();
const aiService = new AIService(API_KEY);
const budgetCalculator = new BudgetCalculator();

// State
let currentItinerary = null;
let currentDestination = null;

/**
 * Initialize the application
 */
function init() {
  // Initialize map
  mapService.initMap('map');

  // Set up theme toggle
  setupThemeToggle();

  // Set up scroll animations
  setupScrollAnimations();

  // Check API key
  if (!aiService.isAvailable()) {
    document.getElementById('api-notice').style.display = 'block';
  }

  // Set up form submission
  const form = document.getElementById('trip-form');
  form.addEventListener('submit', handleFormSubmit);
}

/**
 * Set up theme toggle functionality
 */
function setupThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Set initial theme
  const savedTheme = localStorage.getItem('theme');
  const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', initialTheme);

  // Toggle theme
  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  });
}

/**
 * Set up scroll animations using IntersectionObserver
 */
function setupScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  const elements = document.querySelectorAll('.reveal-on-scroll');
  elements.forEach(el => observer.observe(el));

  // Add Parallax Text Effect
  // Add Parallax Text Effect
  window.addEventListener('scroll', () => {
    const heroContent = document.querySelector('.hero-content');
    const massiveTitle = document.querySelector('.hero-massive-title');
    const scrollPosition = window.scrollY;

    if (scrollPosition < 800) { // Only animate when hero is in view
      // Hero Content fades and moves up
      if (heroContent) {
        heroContent.style.transform = `translateY(${scrollPosition * 0.4}px)`;
        heroContent.style.opacity = 1 - (scrollPosition / 600);
      }

      // Massive Title moves slower (background depth)
      if (massiveTitle) {
        massiveTitle.style.transform = `translate(-50%, calc(-50% + ${scrollPosition * 0.1}px))`;
      }
    }
  });
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  if (!aiService.isAvailable()) {
    alert('Please configure your Google Gemini API key in the .env file.');
    return;
  }

  // Get form data
  const formData = new FormData(e.target);
  const destination = formData.get('destination');
  const duration = parseInt(formData.get('duration'));
  const budget = parseFloat(formData.get('budget'));
  const accommodation = formData.get('accommodation');
  const interests = formData.getAll('interests');

  // Validate
  if (!destination || !duration || !budget) {
    alert('Please fill in all required fields.');
    return;
  }

  // Show loading state
  setLoadingState(true);

  try {
    // Geocode destination
    currentDestination = await mapService.geocodeLocation(destination);

    // Center map on destination
    mapService.centerOnLocation(currentDestination.lat, currentDestination.lon);
    mapService.clearMarkers();
    mapService.addMarker(
      currentDestination.lat,
      currentDestination.lon,
      destination,
      'Your destination'
    );

    // Show skeleton loading
    showSkeletonLoading();

    // Generate itinerary
    currentItinerary = await aiService.generateItinerary({
      destination,
      duration,
      budget,
      interests,
      accommodation,
    });

    // Calculate budget
    const accommodationCostPerDay = getAccommodationCost(accommodation);
    budgetCalculator.calculateBreakdown(currentItinerary, accommodationCostPerDay);

    // Display results
    displayItinerary(currentItinerary, budget);

    // Show mock mode notice if applicable
    if (currentItinerary.isMock) {
      showMockNotice();
    }



  } catch (error) {
    console.error('Error generating itinerary:', error);
    alert('Failed to generate itinerary. Please try again.');
  } finally {
    setLoadingState(false);
  }
}

/**
 * Get estimated accommodation cost per day
 */
function getAccommodationCost(type) {
  const costs = {
    hostel: 25,
    'budget-hotel': 50,
    airbnb: 40,
    any: 30,
  };
  return costs[type] || 30;
}

/**
 * Set loading state for the submit button
 */
function setLoadingState(isLoading) {
  const button = document.getElementById('generate-btn');
  const buttonText = button.querySelector('.button-text');
  const buttonLoader = button.querySelector('.button-loader');

  button.disabled = isLoading;
  buttonText.style.display = isLoading ? 'none' : 'inline';
  buttonLoader.style.display = isLoading ? 'flex' : 'none';
}

/**
 * Display the generated itinerary
 */
function displayItinerary(itinerary, budget) {
  const resultsSection = document.getElementById('results-section');
  const budgetSummary = document.getElementById('budget-summary');
  const itineraryContent = document.getElementById('itinerary-content');

  // Show results section
  resultsSection.style.display = 'block';

  // Scroll to results
  setTimeout(() => {
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);

  // Display budget summary
  const budgetStatus = budgetCalculator.getBudgetStatus(budget);
  budgetSummary.innerHTML = `
    <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
      <div>
        <strong>Total Budget:</strong> $${budget}
      </div>
      <div>
        <strong>Estimated Cost:</strong> 
        <span style="color: ${budgetStatus.isOverBudget ? '#f5576c' : '#4ade80'}">
          $${budgetStatus.spent}
        </span>
      </div>
      <div>
        <strong>${budgetStatus.isOverBudget ? 'Over' : 'Remaining'}:</strong> 
        $${Math.abs(budgetStatus.remaining)}
      </div>
    </div>
  `;

  // Display itinerary days
  itineraryContent.innerHTML = '';

  itinerary.days.forEach((day, index) => {
    const dayCard = createDayCard(day);
    itineraryContent.appendChild(dayCard);
  });

  // Add budget recommendations
  const recommendations = budgetCalculator.getRecommendations(budget);
  if (recommendations.length > 0) {
    const recCard = document.createElement('div');
    recCard.className = 'day-card';
    recCard.innerHTML = `
      <h3 class="day-title">💡 Budget Tips</h3>
      <div style="color: var(--text-secondary); line-height: 1.8;">
        ${recommendations.map(rec => `<div>${rec}</div>`).join('')}
      </div>
    `;
    itineraryContent.appendChild(recCard);
  }
}

/**
 * Create a day card element
 */
function createDayCard(day) {
  const card = document.createElement('div');
  card.className = 'day-card';

  const activitiesList = day.activities
    .map((activity, index) => {
      const icon = getActivityIcon(index);
      return `
        <li class="activity-item">
          <div class="activity-icon">${icon}</div>
          <div class="activity-details">
            <div class="activity-name">${activity.name}</div>
            <div class="activity-description">${activity.description}</div>
            <div class="activity-meta">
              <span>⏱️ ${activity.time}</span>
            </div>
          </div>
          <div class="activity-cost">$${activity.cost}</div>
        </li>
      `;
    })
    .join('');

  card.innerHTML = `
    <h3 class="day-title">Day ${day.day}: ${day.title}</h3>
    <ul class="activity-list">
      ${activitiesList}
    </ul>
  `;

  return card;
}

/**
 * Get activity icon based on index
 */
function getActivityIcon(index) {
  const icons = ['🌅', '🎯', '🍽️', '🎨', '🌃', '✨'];
  return icons[index % icons.length];
}

/**
 * Show a notice that mock data is being used
 */
function showMockNotice() {
  const resultsSection = document.getElementById('results-section');
  const notice = document.createElement('div');
  notice.style.cssText = `
        background: rgba(255, 193, 7, 0.1);
        border: 1px solid rgba(255, 193, 7, 0.3);
        color: #d97706;
        padding: 1rem;
        margin-bottom: 1.5rem;
        border-radius: var(--radius-md);
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    `;
  notice.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        <span><strong>Demo Mode:</strong> Using sample data because the AI API key is invalid or quota exceeded.</span>
    `;

  const resultsCard = resultsSection.querySelector('.results-card');
  resultsCard.insertBefore(notice, resultsCard.firstChild);
}

/**
 * Show skeleton loading state
 */
function showSkeletonLoading() {
  const resultsSection = document.getElementById('results-section');
  const itineraryContent = document.getElementById('itinerary-content');
  const budgetSummary = document.getElementById('budget-summary');

  // Show section
  resultsSection.style.display = 'block';

  // Scroll to results
  setTimeout(() => {
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);

  // Clear previous content
  budgetSummary.innerHTML = '';
  itineraryContent.innerHTML = '';

  // Add skeleton budget
  budgetSummary.innerHTML = `
    <div style="display: flex; gap: 1rem; width: 100%;">
      <div class="skeleton skeleton-text" style="width: 100px;"></div>
      <div class="skeleton skeleton-text" style="width: 100px;"></div>
    </div>
  `;

  // Add skeleton days
  for (let i = 0; i < 3; i++) {
    const skeletonDay = document.createElement('div');
    skeletonDay.className = 'day-card';
    skeletonDay.innerHTML = `
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-block"></div>
      <div class="skeleton skeleton-block"></div>
      <div class="skeleton skeleton-block"></div>
    `;
    itineraryContent.appendChild(skeletonDay);
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
