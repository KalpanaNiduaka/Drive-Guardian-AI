/// ===== PUBLISH RATES PAGE FUNCTIONALITY =====

// Storage key for published journeys
const PUBLISHED_JOURNEYS_KEY = 'driveGuardianPublishedJourneys';

// Global variables for search and filter state
let currentFilter = 'all';
let currentSearch = '';
let currentSort = 'date-desc';

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Check URL for search parameters (e.g., ?search=Kalpana)
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    
    if (searchParam) {
        currentSearch = searchParam.toLowerCase().trim();
        const searchInput = document.getElementById('searchJourneys');
        if (searchInput) {
            searchInput.value = searchParam;
            const clearBtn = document.getElementById('clearSearchBtn');
            if (clearBtn) clearBtn.style.display = 'block';
            searchInput.classList.add('search-active');
        }
    }

    // Seed initial data if storage is empty (using the requested names and Sri Lankan vehicles)
    seedInitialData();
    
    loadAndDisplayJourneys();
    updateCommunityStats();
    // initializeCommunityCharts(); // Ensure this exists in your main UI script
    setupSearchListeners();
});

// Seed data based on your specific history file
function seedInitialData() {
    if (localStorage.getItem(PUBLISHED_JOURNEYS_KEY)) return;

    const sriLankanVehicles = ["Tuk-tuk (Bajaj RE)", "Suzuki Wagon R", "Toyota Aqua", "Honda Fit", "Suzuki Alto", "Toyota Axio", "Tuk-tuk (TVS King)", "Nissan Dayz"];
    const historyData = [
        { "date": "2026-02-07T00:40:57.215Z", "duration": 3, "score": 10, "alerts": 0, "notes": "Excellent focus! Perfect session." },
        { "date": "2026-02-07T00:13:06.641Z", "duration": 0, "score": 10, "alerts": 0, "notes": "Excellent focus! Perfect session." },
        { "date": "2026-02-06T16:19:42.876Z", "duration": 1, "score": 6.1, "alerts": 8, "notes": "Needs improvement - high alert count detected." },
        { "date": "2026-02-06T16:13:46.751Z", "duration": 0, "score": 9.5, "alerts": 1, "notes": "Good focus with minor distractions." },
        { "date": "2026-02-06T14:45:12.332Z", "duration": 15, "score": 8.2, "alerts": 2, "notes": "Stable driving through Colombo traffic." },
        { "date": "2026-02-06T09:03:43.381Z", "duration": 0, "score": 9.5, "alerts": 1, "notes": "Good focus with minor distractions." },
        { "date": "2026-02-06T08:28:28.569Z", "duration": 0, "score": 6.5, "alerts": 7, "notes": "Needs improvement - high alert count detected." },
        { "date": "2026-02-06T07:00:51.490Z", "duration": 2, "score": 7.6, "alerts": 5, "notes": "Needs improvement - high alert count detected." }
    ];

    const published = historyData.map((item, index) => ({
        driverName: index % 2 === 0 ? "Kalpana Niduka" : "Vihas Dintharu",
        timestamp: item.date,
        score: item.score,
        duration: item.duration,
        alerts: item.alerts,
        distance: (Math.random() * 15 + 1).toFixed(1) + " km",
        notes: item.notes,
        vehicleType: sriLankanVehicles[index % sriLankanVehicles.length]
    }));

    localStorage.setItem(PUBLISHED_JOURNEYS_KEY, JSON.stringify(published));
}

// Setup event listeners for search
function setupSearchListeners() {
    const searchInput = document.getElementById('searchJourneys');
    const clearBtn = document.getElementById('clearSearchBtn');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function() {
        currentSearch = this.value.toLowerCase().trim();
        if (currentSearch.length > 0) {
            if (clearBtn) clearBtn.style.display = 'block';
            searchInput.classList.add('search-active');
        } else {
            if (clearBtn) clearBtn.style.display = 'none';
            searchInput.classList.remove('search-active');
            currentSearch = '';
        }
        loadAndDisplayJourneys();
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loadAndDisplayJourneys();
        }
    });
}

function loadAndDisplayJourneys() {
    let publishedJourneys = JSON.parse(localStorage.getItem(PUBLISHED_JOURNEYS_KEY) || '[]');
    const container = document.getElementById('publishedJourneysList');
    if (!container) return;
    
    publishedJourneys = applyTimeFilter(publishedJourneys, currentFilter);
    
    if (currentSearch) {
        publishedJourneys = publishedJourneys.filter(journey => {
            const driverName = (journey.driverName || 'Anonymous Driver').toLowerCase();
            return driverName.includes(currentSearch);
        });
    }
    
    publishedJourneys = sortJourneysList(publishedJourneys, currentSort);
    displayJourneys(publishedJourneys, container);
}

function applyTimeFilter(journeys, filter) {
    if (filter === 'all' || filter === 'top') return journeys;
    const now = new Date();
    const filterMap = {
        'week': 7,
        'month': 30
    };
    if (!filterMap[filter]) return journeys;
    
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - filterMap[filter]);
    return journeys.filter(j => new Date(j.timestamp) >= cutoff);
}

function sortJourneysList(journeys, sortOption) {
    const sorted = [...journeys];
    const getVal = (j, key) => (j[key] || '').toString().toLowerCase();

    switch(sortOption) {
        case 'date-desc': sorted.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); break;
        case 'date-asc': sorted.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); break;
        case 'score-desc': sorted.sort((a, b) => b.score - a.score); break;
        case 'score-asc': sorted.sort((a, b) => a.score - b.score); break;
        case 'name-asc': sorted.sort((a, b) => getVal(a, 'driverName').localeCompare(getVal(b, 'driverName'))); break;
        case 'name-desc': sorted.sort((a, b) => getVal(b, 'driverName').localeCompare(getVal(a, 'driverName'))); break;
        case 'duration-desc': sorted.sort((a, b) => b.duration - a.duration); break;
        case 'duration-asc': sorted.sort((a, b) => a.duration - b.duration); break;
    }
    return sorted;
}

function displayJourneys(journeys, container) {
    if (journeys.length === 0) {
        container.innerHTML = `<div class="no-results"><h3>No results found</h3><p>Try a different search term.</p></div>`;
        return;
    }
    container.innerHTML = '';
    journeys.forEach(journey => container.appendChild(createJourneyCard(journey)));
}

function createJourneyCard(journey) {
    const card = document.createElement('div');
    card.className = 'published-journey-card';
    const date = new Date(journey.timestamp);
    const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const driverInitials = journey.driverName ? journey.driverName.split(' ').map(n => n[0]).join('').toUpperCase() : 'GU';
    
    let displayName = journey.driverName || 'Anonymous Driver';
    if (currentSearch && displayName.toLowerCase().includes(currentSearch)) {
        const regex = new RegExp(`(${currentSearch})`, 'gi');
        displayName = displayName.replace(regex, '<mark>$1</mark>');
    }
    
    let ratingColor = journey.score >= 8 ? '#10b981' : (journey.score >= 6 ? '#f59e0b' : '#ef4444');
    
    card.innerHTML = `
        <div class="journey-meta">
            <div class="driver-info">
                <div class="driver-avatar">${driverInitials}</div>
                <div>
                    <div class="driver-name">${displayName}</div>
                    <div class="journey-date">${formattedDate}</div>
                </div>
            </div>
            <div style="font-size: 1.8rem; font-weight: 700; color: ${ratingColor}">${journey.score.toFixed(1)}/10</div>
        </div>
        <div class="journey-performance">
            <div class="performance-item"><span class="performance-value">${journey.duration}m</span><span class="performance-label">Duration</span></div>
            <div class="performance-item"><span class="performance-value">${journey.alerts}</span><span class="performance-label">Alerts</span></div>
            <div class="performance-item"><span class="performance-value">${journey.distance || '--'}</span><span class="performance-label">Distance</span></div>
        </div>
        <p style="color: #cbd5e1; margin-bottom: 1rem;">${journey.notes || 'No additional notes'}</p>
        <div class="journey-tags">
            ${journey.score >= 8 ? '<span class="journey-tag" style="background: rgba(16, 185, 129, 0.2); color: #10b981;">Excellent Focus</span>' : ''}
            ${journey.alerts === 0 ? '<span class="journey-tag" style="background: rgba(59, 130, 246, 0.2); color: #3b82f6;">Alert-Free</span>' : ''}
            <span class="journey-tag">${journey.vehicleType || 'Car'}</span>
        </div>`;
    return card;
}

function updateCommunityStats() {
    const published = JSON.parse(localStorage.getItem(PUBLISHED_JOURNEYS_KEY) || '[]');
    const totalPublished = document.getElementById('totalPublished');
    if (!totalPublished) return;
    
    totalPublished.textContent = published.length;
    if (published.length > 0) {
        const avgScore = document.getElementById('avgCommunityScore');
        const totalDrivers = document.getElementById('totalDrivers');
        const topDriver = document.getElementById('topDriver');
        
        if (avgScore) avgScore.textContent = (published.reduce((sum, j) => sum + j.score, 0) / published.length).toFixed(1);
        if (totalDrivers) totalDrivers.textContent = [...new Set(published.map(j => j.driverName))].length;
        if (topDriver) topDriver.textContent = Math.max(...published.map(j => j.score)).toFixed(1);
    }
}

// Global UI Handlers
window.filterJourneys = (filter) => {
    currentFilter = filter;
    document.querySelectorAll('.date-btn').forEach(btn => {
        const onclickAttr = btn.getAttribute('onclick');
        if (onclickAttr) {
            btn.classList.toggle('active', onclickAttr.includes(filter));
        }
    });
    loadAndDisplayJourneys();
};
window.sortJourneys = () => {
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        currentSort = sortSelect.value;
        loadAndDisplayJourneys();
    }
};
window.clearSearch = () => {
    const searchInput = document.getElementById('searchJourneys');
    if (searchInput) {
        searchInput.value = '';
        currentSearch = '';
        searchInput.classList.remove('search-active');
        const clearBtn = document.getElementById('clearSearchBtn');
        if (clearBtn) clearBtn.style.display = 'none';
        loadAndDisplayJourneys();
    }
};
