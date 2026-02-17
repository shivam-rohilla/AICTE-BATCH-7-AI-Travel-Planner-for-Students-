class BudgetCalculator {
    constructor() {
        this.categories = {
            accommodation: 0,
            food: 0,
            activities: 0,
            transport: 0,
            other: 0,
        };
    }

    /**
     * Calculate budget breakdown from itinerary
     * @param {Object} itinerary - The generated itinerary
     * @param {number} accommodationCostPerDay - Daily accommodation cost
     */
    /**
     * Calculate budget breakdown from itinerary
     * @param {Object} itinerary - The generated itinerary
     * @param {number} accommodationCostPerDay - Daily accommodation cost (default ₹2000)
     */
    calculateBreakdown(itinerary, accommodationCostPerDay = 2000) {
        this.reset();

        const days = itinerary.days || [];

        // Calculate accommodation costs
        this.categories.accommodation = accommodationCostPerDay * days.length;

        // Calculate activity and food costs from itinerary
        days.forEach(day => {
            day.activities.forEach(activity => {
                const cost = activity.cost || 0;
                const name = activity.name.toLowerCase();

                // Categorize based on activity name
                if (name.includes('food') || name.includes('lunch') || name.includes('dinner') ||
                    name.includes('breakfast') || name.includes('restaurant') || name.includes('cafe')) {
                    this.categories.food += cost;
                } else if (name.includes('transport') || name.includes('taxi') || name.includes('bus') ||
                    name.includes('train') || name.includes('metro')) {
                    this.categories.transport += cost;
                } else if (name.includes('museum') || name.includes('tour') || name.includes('ticket') ||
                    name.includes('activity') || name.includes('visit')) {
                    this.categories.activities += cost;
                } else {
                    this.categories.other += cost;
                }
            });
        });

        // Add estimated transport costs if none specified
        if (this.categories.transport === 0) {
            this.categories.transport = days.length * 500; // Estimate ₹500/day for local transport
        }

        return this.categories;
    }

    /**
     * Get total spent
     */
    getTotalSpent() {
        return Object.values(this.categories).reduce((sum, val) => sum + val, 0);
    }

    /**
     * Check if within budget
     */
    isWithinBudget(budget) {
        return this.getTotalSpent() <= budget;
    }

    /**
     * Get budget status
     */
    getBudgetStatus(budget) {
        const spent = this.getTotalSpent();
        const remaining = budget - spent;
        const percentage = (spent / budget) * 100;

        return {
            spent: Math.round(spent * 100) / 100,
            remaining: Math.round(remaining * 100) / 100,
            percentage: Math.round(percentage),
            isOverBudget: remaining < 0,
        };
    }

    /**
     * Generate budget recommendations
     */
    getRecommendations(budget) {
        const status = this.getBudgetStatus(budget);
        const recommendations = [];

        if (status.isOverBudget) {
            recommendations.push('Your current itinerary exceeds the budget. Consider:');

            // Check which category is highest
            const sorted = Object.entries(this.categories)
                .sort((a, b) => b[1] - a[1])
                .filter(([_, cost]) => cost > 0);

            sorted.slice(0, 2).forEach(([category, cost]) => {
                if (category === 'accommodation') {
                    recommendations.push('• Look for hostels or shared accommodations');
                } else if (category === 'food') {
                    recommendations.push('• Try local markets and street food instead of restaurants');
                } else if (category === 'activities') {
                    recommendations.push('• Mix paid attractions with free walking tours');
                } else if (category === 'transport') {
                    recommendations.push('• Use public transportation instead of taxis');
                }
            });
        } else if (status.remaining > budget * 0.3) {
            recommendations.push('You have room in your budget! Consider:');
            recommendations.push('• Adding a special experience or tour');
            recommendations.push('• Upgrading accommodation for better comfort');
            recommendations.push('• Trying a nice restaurant for a memorable meal');
        } else {
            recommendations.push('Your budget is well-balanced! Tips:');
            recommendations.push('• Keep some buffer for unexpected expenses');
            recommendations.push('• Bring snacks to save on food costs');
            recommendations.push('• Look for student discounts at attractions');
        }

        return recommendations;
    }

    /**
     * Get category breakdown as percentages
     */
    getCategoryPercentages() {
        const total = this.getTotalSpent();
        const percentages = {};

        Object.entries(this.categories).forEach(([category, cost]) => {
            percentages[category] = total > 0 ? Math.round((cost / total) * 100) : 0;
        });

        return percentages;
    }

    /**
     * Format currency
     */
    formatCurrency(amount) {
        return `₹${Math.round(amount).toLocaleString('en-IN')}`;
    }

    /**
     * Reset calculator
     */
    reset() {
        Object.keys(this.categories).forEach(key => {
            this.categories[key] = 0;
        });
    }
}

export default BudgetCalculator;
