/// ===== PUBLISH RATES PAGE FUNCTIONALITY =====

// Storage key for published journeys
const PUBLISHED_JOURNEYS_KEY = 'driveGuardianPublishedJourneys';

// Global variables for search and filter state
let currentFilter = 'all';
let currentSearch = '';
let currentSort = 'date-desc';

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadAndDisplayJourneys();
    updateCommunityStats();
    initializeCommunityCharts();
    setupSearchListeners();
});

// Setup event listeners for search
function setupSearchListeners() {
    const searchInput = document.getElementById('searchJourneys');
    const clearBtn = document.getElementById('clearSearchBtn');
    
    searchInput.addEventListener('input', function() {
        currentSearch = this.value.toLowerCase().trim();
        if (currentSearch.length > 0) {
            clearBtn.style.display = 'block';
            searchInput.classList.add('search-active');
        } else {
            clearBtn.style.display = 'none';
            searchInput.classList.remove('search-active');
            currentSearch = '';
        }
        loadAndDisplayJourneys();
    });
    
    // Add enter key support
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loadAndDisplayJourneys();
        }
    });
}

// Load, filter, search, sort and display journeys
function loadAndDisplayJourneys() {
    let publishedJourneys = JSON.parse(localStorage.getItem(PUBLISHED_JOURNEYS_KEY) || '[]');
    const container = document.getElementById('publishedJourneysList');
    
    // Apply time filter
    publishedJourneys = applyTimeFilter(publishedJourneys, currentFilter);
    
    // Apply search filter
    if (currentSearch) {
        publishedJourneys = publishedJourneys.filter(journey => {
            const driverName = (journey.driverName || 'Anonymous Driver').toLowerCase();
            return driverName.includes(currentSearch);
        });
    }
    
    // Apply sorting
    publishedJourneys = sortJourneysList(publishedJourneys, currentSort);
    
    // Display results
    displayJourneys(publishedJourneys, container);
}

// Apply time filter
function applyTimeFilter(journeys, filter) {
    if (filter === 'all') return journeys;
    if (filter === 'top') return journeys; // Top rated is handled in sort
    
    const now = new Date();
    let filteredJourneys = [...journeys];
    
    switch(filter) {
        case 'week':
            const weekAgo = new Date();
            weekAgo.setDate(now.getDate() - 7);
            filteredJourneys = journeys.filter(j => new Date(j.timestamp) >= weekAgo);
            break;
        case 'month':
            const monthAgo = new Date();
            monthAgo.setMonth(now.getMonth() - 1);
            filteredJourneys = journeys.filter(j => new Date(j.timestamp) >= monthAgo);
            break;
    }
    
    return filteredJourneys;
}

// Sort journeys based on current sort option
function sortJourneysList(journeys, sortOption) {
    const sorted = [...journeys];
    
    switch(sortOption) {
        case 'date-desc':
            sorted.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            break;
        case 'date-asc':
            sorted.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            break;
        case 'score-desc':
            sorted.sort((a, b) => b.score - a.score);
            break;
        case 'score-asc':
            sorted.sort((a, b) => a.score - b.score);
            break;
        case 'name-asc':
            sorted.sort((a, b) => {
                const nameA = (a.driverName || 'Anonymous Driver').toLowerCase();
                const nameB = (b.driverName || 'Anonymous Driver').toLowerCase();
                return nameA.localeCompare(nameB);
            });
            break;
        case 'name-desc':
            sorted.sort((a, b) => {
                const nameA = (a.driverName || 'Anonymous Driver').toLowerCase();
                const nameB = (b.driverName || 'Anonymous Driver').toLowerCase();
                return nameB.localeCompare(nameA);
            });
            break;
        case 'duration-desc':
            sorted.sort((a, b) => b.duration - a.duration);
            break;
        case 'duration-asc':
            sorted.sort((a, b) => a.duration - b.duration);
            break;
    }
    
    return sorted;
}

// Display journeys in the container
function displayJourneys(journeys, container) {
    if (journeys.length === 0) {
        if (currentSearch) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>No results found</h3>
                    <p>No drivers found matching "${currentSearch}"</p>
                    <button class="btn btn-secondary" onclick="clearSearch()" style="margin-top: 1rem;">
                        Clear Search
                    </button>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-road"></i>
                    <h3>No journeys published yet</h3>
                    <p>Be the first to publish a journey from the main dashboard!</p>
                    <a href="test.html#publish" class="btn btn-primary" style="margin-top: 1.5rem;">
                        <i class="fas fa-arrow-left"></i> Back to Dashboard
                    </a>
                </div>
            `;
        }
        return;
    }
    
    container.innerHTML = '';
    journeys.forEach(journey => {
        const journeyCard = createJourneyCard(journey);
        container.appendChild(journeyCard);
    });
}

// Search journeys by driver name
function searchJourneys() {
    const searchInput = document.getElementById('searchJourneys');
    currentSearch = searchInput.value.toLowerCase().trim();
    const clearBtn = document.getElementById('clearSearchBtn');
    
    if (currentSearch.length > 0) {
        clearBtn.style.display = 'block';
        searchInput.classList.add('search-active');
    } else {
        clearBtn.style.display = 'none';
        searchInput.classList.remove('search-active');
        currentSearch = '';
    }
    
    loadAndDisplayJourneys();
}

// Clear search
function clearSearch() {
    const searchInput = document.getElementById('searchJourneys');
    const clearBtn = document.getElementById('clearSearchBtn');
    
    searchInput.value = '';
    searchInput.classList.remove('search-active');
    clearBtn.style.display = 'none';
    currentSearch = '';
    
    loadAndDisplayJourneys();
}

// Sort journeys
function sortJourneys() {
    const sortSelect = document.getElementById('sortSelect');
    currentSort = sortSelect.value;
    loadAndDisplayJourneys();
}

// Update filterJourneys function to work with new system
function filterJourneys(filter) {
    currentFilter = filter;
    
    // Update active button
    document.querySelectorAll('.date-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    loadAndDisplayJourneys();
}

// Update community stats to consider filters
function updateCommunityStats() {
    const publishedJourneys = JSON.parse(localStorage.getItem(PUBLISHED_JOURNEYS_KEY) || '[]');
    
    document.getElementById('totalPublished').textContent = publishedJourneys.length;
    
    if (publishedJourneys.length > 0) {
        const avgScore = publishedJourneys.reduce((sum, j) => sum + j.score, 0) / publishedJourneys.length;
        document.getElementById('avgCommunityScore').textContent = avgScore.toFixed(1);
        
        // Find unique drivers
        const uniqueDrivers = [...new Set(publishedJourneys.map(j => j.driverName).filter(Boolean))];
        document.getElementById('totalDrivers').textContent = uniqueDrivers.length;
        
        // Find top score
        const topScore = Math.max(...publishedJourneys.map(j => j.score));
        document.getElementById('topDriver').textContent = topScore.toFixed(1);
    } else {
        document.getElementById('avgCommunityScore').textContent = '0.0';
        document.getElementById('totalDrivers').textContent = '0';
        document.getElementById('topDriver').textContent = '--';
    }
}

// Create journey card HTML (updated to highlight search matches)
function createJourneyCard(journey) {
    const card = document.createElement('div');
    card.className = 'published-journey-card';
    
    const date = new Date(journey.timestamp);
    const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    // Get driver initials for avatar
    const driverInitials = journey.driverName ? 
        journey.driverName.split(' ').map(n => n[0]).join('').toUpperCase() : 'GU';
    
    // Highlight search matches in driver name
    let displayName = journey.driverName || 'Anonymous Driver';
    if (currentSearch && displayName.toLowerCase().includes(currentSearch)) {
        const regex = new RegExp(`(${currentSearch})`, 'gi');
        displayName = displayName.replace(regex, '<mark>$1</mark>');
    }
    
    // Determine rating color
    let ratingColor = '#ef4444'; // red
    if (journey.score >= 8) ratingColor = '#10b981'; // green
    else if (journey.score >= 6) ratingColor = '#f59e0b'; // orange
    
    card.innerHTML = `
        <div class="journey-meta">
            <div class="driver-info">
                <div class="driver-avatar">${driverInitials}</div>
                <div>
                    <div class="driver-name">${displayName}</div>
                    <div class="journey-date">${formattedDate}</div>
                </div>
            </div>
            <div style="font-size: 1.8rem; font-weight: 700; color: ${ratingColor}">
                ${journey.score.toFixed(1)}/10
            </div>
        </div>
        
        <div class="journey-performance">
            <div class="performance-item">
                <span class="performance-value">${journey.duration}m</span>
                <span class="performance-label">Duration</span>
            </div>
            <div class="performance-item">
                <span class="performance-value">${journey.alerts}</span>
                <span class="performance-label">Alerts</span>
            </div>
            <div class="performance-item">
                <span class="performance-value">${journey.distance || '--'}</span>
                <span class="performance-label">Distance</span>
            </div>
        </div>
        
        <p style="color: #cbd5e1; margin-bottom: 1rem;">${journey.notes || 'No additional notes'}</p>
        
        <div class="journey-tags">
            ${journey.score >= 8 ? '<span class="journey-tag" style="background: rgba(16, 185, 129, 0.2); color: #10b981;">Excellent Focus</span>' : ''}
            ${journey.alerts === 0 ? '<span class="journey-tag" style="background: rgba(59, 130, 246, 0.2); color: #3b82f6;">Alert-Free</span>' : ''}
            ${journey.duration >= 30 ? '<span class="journey-tag" style="background: rgba(245, 158, 11, 0.2); color: #f59e0b;">Long Drive</span>' : ''}
            <span class="journey-tag">${journey.vehicleType || 'Car'}</span>
        </div>
    `;
    
    return card;
}

// Make functions available globally
window.filterJourneys = filterJourneys;
window.searchJourneys = searchJourneys;
window.clearSearch = clearSearch;
window.sortJourneys = sortJourneys;