// ===== ENHANCED DROWSINESS DETECTION SYSTEM WITH ANALYTICS =====

// DOM Elements
const videoElement = document.getElementById('videoElement');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const statusText = document.getElementById('statusText');
const cameraStatus = document.getElementById('cameraStatus');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const calibrateBtn = document.getElementById('calibrateBtn');
const stopBtn = document.getElementById('stopBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const confVal = document.getElementById('confVal');
const alertCount = document.getElementById('alertCount');
const earValue = document.getElementById('earValue');
const sessionTime = document.getElementById('sessionTime');
const currentUser = document.getElementById('currentUser');
const systemStatus = document.getElementById('systemStatus');
const systemStatusTrend = document.getElementById('systemStatusTrend');
const alertProgress = document.getElementById('alertProgress');

// Enhanced detection variables
let eyeClosedCounter = 0;
let isCalibrated = false;
let alarmEarThreshold = 0.20;
let calibData = [];
let totalAlerts = 0;
let audioCtx, oscillator;
let sessionStartTime = null;
let sessionTimer = null;
let isDetectionActive = false;
let faceMesh = null;
let stream = null;

// New system variables
let isPaused = false;
let currentJourney = null;
let journeyHistory = JSON.parse(localStorage.getItem('journeyHistory') || '[]');
let isLoggedIn = localStorage.getItem('driveGuardianLoggedIn') === 'true' || false;
let currentDriver = localStorage.getItem('driveGuardianCurrentDriver') || null;
let driverRating = 0;
let journeyAlerts = 0;

// Status color classes
const statusClasses = {
    safe: 'status-safe',
    warning: 'status-warning',
    danger: 'status-danger'
};

// ===== ANALYTICS SYSTEM =====

// Historical Data Storage
let sessionHistory = JSON.parse(localStorage.getItem('driveGuardianHistory') || '[]');
let currentTimeRange = 'all';
let chartInstances = {};

// ===== PUBLISH SYSTEM =====
const PUBLISHED_JOURNEYS_KEY = 'driveGuardianPublishedJourneys';
const LAST_JOURNEY_KEY = 'driveGuardianLastJourney';

// Achievement System
const achievements = [
    { 
        id: 1, 
        name: "First Drive", 
        description: "Complete your first monitoring session", 
        icon: "play-circle", 
        condition: (history) => history.length >= 1,
        progress: (history) => Math.min(100, history.length * 100)
    },
    { 
        id: 2, 
        name: "Alert-Free Session", 
        description: "Complete a session with 0 alerts", 
        icon: "bell-slash", 
        condition: (history) => history.some(s => s.alerts === 0),
        progress: (history) => {
            const alertFreeSessions = history.filter(s => s.alerts === 0).length;
            return Math.min(100, alertFreeSessions * 100);
        }
    },
    { 
        id: 3, 
        name: "30-Minute Master", 
        description: "Complete a 30+ minute session", 
        icon: "clock", 
        condition: (history) => history.some(s => s.duration >= 30),
        progress: (history) => {
            const longSessions = history.filter(s => s.duration >= 30).length;
            return Math.min(100, longSessions * 100);
        }
    },
    { 
        id: 4, 
        name: "Safety Champion", 
        description: "3 sessions with 90%+ focus score", 
        icon: "shield-alt", 
        condition: (history) => history.filter(s => s.score >= 9).length >= 3,
        progress: (history) => {
            const goodSessions = history.filter(s => s.score >= 9).length;
            return Math.min(100, (goodSessions / 3) * 100);
        }
    },
    { 
        id: 5, 
        name: "Weekly Warrior", 
        description: "Use Drive Guardian 5 days in a row", 
        icon: "calendar-alt", 
        condition: (history) => calculateBestStreak(history) >= 5,
        progress: (history) => {
            const streak = calculateBestStreak(history);
            return Math.min(100, (streak / 5) * 100);
        }
    },
    { 
        id: 6, 
        name: "Focus Master", 
        description: "Achieve 95%+ focus score", 
        icon: "brain", 
        condition: (history) => history.some(s => s.score >= 9.5),
        progress: (history) => {
            const bestSession = history.reduce((max, s) => Math.max(max, s.score), 0);
            return Math.min(100, (bestSession / 9.5) * 100);
        }
    }
];

// Encouragement Messages
const encouragementMessages = [
    { 
        message: "Great focus! You're getting better every session!", 
        subtext: "Your alert count has decreased by 20% this week",
        icon: "chart-line",
        condition: (history) => history.length >= 3
    },
    { 
        message: "New personal best! Your focus score is improving!", 
        subtext: "Keep up the excellent work on road safety",
        icon: "trophy",
        condition: (history) => history.length >= 2 && 
            history[0].score > (history[1]?.score || 0)
    },
    { 
        message: "Consistency is key! You're building safe driving habits", 
        subtext: "Regular monitoring helps prevent accidents",
        icon: "calendar-check",
        condition: (history) => history.length >= 5
    },
    { 
        message: "Impressive focus! Professional driver level alertness", 
        subtext: "Your reaction time is faster than average",
        icon: "star",
        condition: (history) => history.length > 0 && history[0].score >= 9
    },
    { 
        message: "Stay vigilant! Even short drives need full attention", 
        subtext: "Most accidents happen within 25 miles of home",
        icon: "exclamation-triangle",
        condition: (history) => history.length > 0 && history[0].alerts > 3
    }
];

// ===== INTEGRATED FUNCTIONS =====

// Initialize everything
async function initializeEverything() {
    // Initialize camera but don't start yet
    await initializeCamera();
    initializeCharts();
    // Set up event listeners
    startBtn.addEventListener('click', startDetection);
    stopBtn.addEventListener('click', enhancedStopDetection);
    
    // Initialize with safe status
    updateStatus('warning');
    statusText.textContent = 'Ready to start detection';
    
    // Update user display if logged in
    if (isLoggedIn && currentDriver) {
        updateUserDisplay(currentDriver);
    }
    
    // Load analytics data
    updateAnalyticsUI();
    updateHistoryTable();
    updateAchievements();
    showEncouragementMessage();
    
    // Initialize publish section
    initializePublishSection();
}

// ===== PUBLISH FUNCTIONALITY =====

// Initialize publish section
function initializePublishSection() {
    const lastJourney = JSON.parse(localStorage.getItem(LAST_JOURNEY_KEY));
    if (lastJourney) {
        displayLastJourney(lastJourney);
    }
    
    loadCommunityPreview();
}

// Display last journey in publish section
function displayLastJourney(journey) {
    const card = document.getElementById('lastJourneyCard');
    if (!card) return;
    
    card.style.display = 'block';
    
    document.getElementById('lastJourneyScore').textContent = journey.score.toFixed(1);
    document.getElementById('lastJourneyDuration').textContent = journey.duration + 'm';
    document.getElementById('lastJourneyAlerts').textContent = journey.alerts;
    document.getElementById('lastJourneyNotes').textContent = journey.notes;
    
    // Update status badge
    const badge = document.getElementById('journeyStatusBadge');
    if (journey.score >= 8) {
        badge.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        badge.textContent = 'Excellent';
    } else if (journey.score >= 6) {
        badge.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        badge.textContent = 'Good';
    } else {
        badge.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        badge.textContent = 'Needs Improvement';
    }
}

// Save last journey
function saveLastJourney(journey) {
    localStorage.setItem(LAST_JOURNEY_KEY, JSON.stringify(journey));
    if (document.getElementById('lastJourneyCard')) {
        displayLastJourney(journey);
    }
}

// Publish last journey to community
function publishLastJourney() {
    if (!isLoggedIn) {
        alert('Please login to publish your journey!');
        openLoginModal();
        return;
    }
    
    const lastJourney = JSON.parse(localStorage.getItem(LAST_JOURNEY_KEY));
    if (!lastJourney) {
        alert('No journey to publish. Complete a journey first!');
        return;
    }
    
    // Get driver name or use default
    let driverName = currentDriver || 'Anonymous Driver';
    if (driverName.includes('@')) {
        driverName = driverName.split('@')[0];
    }
    
    // Enhance journey data with publish info
    const publishedJourney = {
        ...lastJourney,
        driverName: driverName,
        timestamp: new Date().toISOString(),
        publishedAt: new Date().toLocaleString(),
        vehicleType: prompt('What type of vehicle were you driving? (e.g., Car, Truck, Motorcycle)', 'Car') || 'Car',
        distance: prompt('Approximate distance traveled (miles or km)?', '25 miles') || 'Unknown',
        isPublished: true
    };
    
    // Save to published journeys
    const publishedJourneys = JSON.parse(localStorage.getItem(PUBLISHED_JOURNEYS_KEY) || '[]');
    publishedJourneys.push(publishedJourney);
    
    // Limit to 100 published journeys
    if (publishedJourneys.length > 100) {
        publishedJourneys.shift();
    }
    
    localStorage.setItem(PUBLISHED_JOURNEYS_KEY, JSON.stringify(publishedJourneys));
    
    // Update preview
    loadCommunityPreview();
    
    // Show success message
    alert('Journey published successfully! Your safety score is now visible to the community.');
    
    // Open rates page
    viewPublishedJourneys();
}

// Load community preview
function loadCommunityPreview() {
    const publishedJourneys = JSON.parse(localStorage.getItem(PUBLISHED_JOURNEYS_KEY) || '[]');
    const previewContainer = document.getElementById('communityPreview');
    
    if (!previewContainer) return;
    
    if (publishedJourneys.length === 0) {
        previewContainer.innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-users"></i>
                <p>Be the first to publish a journey!</p>
            </div>
        `;
        return;
    }
    
    // Show last 3 published journeys
    const recentJourneys = [...publishedJourneys]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 3);
    previewContainer.innerHTML = recentJourneys.map(journey => {
        // Dynamic color logic for the score badge
        const scoreColor = journey.score >= 8 ? '#10b981' : journey.score >= 6 ? '#f59e0b' : '#ef4444';
        const scoreBg = journey.score >= 8 ? 'rgba(16, 185, 129, 0.15)' : journey.score >= 6 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)';

        return `
            <div style="
                background: rgba(255, 255, 255, 0.08); 
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                padding: 1.25rem; 
                border-radius: 16px; 
                margin-bottom: 1rem; 
                margin-right: 1rem;
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                    <div>
                        <div style="color: white; font-weight: 600; font-size: 1.05rem; letter-spacing: 0.02em;">
                            ${journey.driverName || 'Anonymous'}
                        </div>
                        <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 2px;">
                            ${new Date(journey.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                    </div>
                    <div style="
                        background: ${scoreBg};
                        color: ${scoreColor};
                        padding: 4px 12px;
                        border-radius: 8px;
                        font-size: 1.1rem; 
                        font-weight: 700;
                    ">
                        ${journey.score.toFixed(1)}
                    </div>
                </div>

                <div style="
                    display: flex; 
                    align-items: center;
                    gap: 0.75rem; 
                    font-size: 0.85rem; 
                    color: #cbd5e1;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                    padding-top: 0.75rem;
                ">
                    <span style="display: flex; align-items: center; gap: 4px;">
                        <span style="opacity: 0.7;">🕒</span> ${journey.duration}m
                    </span>
                    <span style="color: rgba(255,255,255,0.2);">|</span>
                    <span style="display: flex; align-items: center; gap: 4px;">
                        <span style="opacity: 0.7;">⚠️</span> ${journey.alerts} alerts
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

// View published journeys
function viewPublishedJourneys() {
    window.location.href = 'publish-rates.html';
}

// ===== ORIGINAL DETECTION FUNCTIONS =====

async function initializeCamera() {
    try {
        loadingIndicator.style.display = 'block';
        statusText.textContent = 'Requesting camera access...';
        updateStatus('warning');
        
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            },
            audio: false
        });
        
        videoElement.srcObject = stream;
        
        await new Promise((resolve) => {
            videoElement.onloadedmetadata = () => {
                canvasElement.width = videoElement.videoWidth;
                canvasElement.height = videoElement.videoHeight;
                resolve();
            };
        });
        
        loadingIndicator.style.display = 'none';
        statusText.textContent = 'Camera ready';
        updateStatus('safe');
        startBtn.disabled = false;
        
        return true;
    } catch (error) {
        console.error('Camera initialization error:', error);
        statusText.textContent = 'Camera access denied';
        updateStatus('danger');
        loadingIndicator.style.display = 'none';
        return false;
    }
}

async function initializeFaceMesh() {
    try {
        statusText.textContent = 'Loading AI model...';
        updateStatus('warning');
        
        faceMesh = new FaceMesh({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }
        });
        
        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        faceMesh.onResults(onResults);
        
        statusText.textContent = 'AI model loaded';
        updateStatus('safe');
        
        return true;
    } catch (error) {
        console.error('FaceMesh initialization error:', error);
        statusText.textContent = 'AI model failed to load';
        updateStatus('danger');
        return false;
    }
}

function calculateEAR(landmarks) {
    const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
    
    const calcEar = (indices) => {
        const pts = indices.map(i => landmarks[i]);
        return (getDist(pts[1], pts[5]) + getDist(pts[2], pts[4])) / (2 * getDist(pts[0], pts[3]));
    };

    const leftEAR = calcEar([33, 160, 158, 133, 153, 144]);
    const rightEAR = calcEar([362, 385, 387, 263, 373, 380]);
    
    return (leftEAR + rightEAR) / 2;
}

function onResults(results) {
    if (!isDetectionActive || isPaused) return;
    if (!results || !results.image) return;
    
    // Clear canvas
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Draw video frame
    canvasCtx.save();
    canvasCtx.translate(canvasElement.width, 0);
    canvasCtx.scale(-1, 1);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.restore();
    
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        const ear = calculateEAR(landmarks);
        
        // Update EAR display
        earValue.textContent = ear.toFixed(3);
        confVal.textContent = '95%';
        
        if (!isCalibrated) {
            // Calibration phase
            calibData.push(ear);
            const progress = Math.min(100, calibData.length);
            statusText.textContent = `Calibrating: ${progress}%`;
            updateStatus('warning');
            
            if (calibData.length >= 100) {
                const sum = calibData.reduce((a, b) => a + b, 0);
                const avg = sum / calibData.length;
                alarmEarThreshold = avg * 0.75;
                isCalibrated = true;
                calibrateBtn.style.display = 'flex';
                statusText.textContent = 'Monitoring Active';
                updateStatus('safe');
                updateSystemStatus('monitoring', 'Journey monitoring active');
            }
        } else {
            // Detection phase
            if (ear < alarmEarThreshold) {
                eyeClosedCounter++;
                
                if (eyeClosedCounter > 10) {
                    // Drowsiness detected
                    statusText.textContent = 'DROWSINESS DETECTED';
                    updateStatus('danger');
                    triggerAlert(true);
                    
                    if (eyeClosedCounter === 21) {
                        totalAlerts++;
                        journeyAlerts++;
                        alertCount.textContent = journeyAlerts;
                        
                        // Update progress visualization
                        const progress = Math.min(100, (journeyAlerts / 20) * 100);
                        alertProgress.style.width = `${progress}%`;
                    }
                } else {
                    statusText.textContent = 'Warning: Eyes Closing';
                    updateStatus('warning');
                }
            } else {
                // Normal state
                eyeClosedCounter = 0;
                statusText.textContent = 'Normal: Alert';
                updateStatus('safe');
                triggerAlert(false);
            }
        }
    } else {
        if (isCalibrated) {
            statusText.textContent = 'No Face Detected';
            updateStatus('warning');
        }
        earValue.textContent = '0.000';
    }
}

function updateStatus(status) {
    Object.values(statusClasses).forEach(cls => {
        cameraStatus.classList.remove(cls);
    });
    
    cameraStatus.classList.add(statusClasses[status]);
    
    const dot = cameraStatus.querySelector('.dot');
    dot.style.background = {
        safe: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444'
    }[status];
}

function updateSystemStatus(status, message) {
    const statusConfig = {
        ready: { color: 'var(--success)', icon: 'fa-check-circle', text: 'Ready' },
        monitoring: { color: 'var(--accent)', icon: 'fa-eye', text: 'Monitoring' },
        paused: { color: 'var(--warning)', icon: 'fa-pause-circle', text: 'Paused' },
        calibrating: { color: 'var(--warning)', icon: 'fa-cog', text: 'Calibrating' },
        error: { color: 'var(--danger)', icon: 'fa-exclamation-circle', text: 'Error' }
    };
    
    const config = statusConfig[status] || statusConfig.ready;
    
    systemStatus.textContent = config.text;
    systemStatus.style.color = config.color;
    systemStatusTrend.innerHTML = `<i class="fas ${config.icon}" style="color: ${config.color}"></i> ${message}`;
}

function triggerAlert(start) {
    if (start) {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (!oscillator) {
            oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
            
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.start();
        }
    } else if (oscillator) {
        oscillator.stop();
        oscillator.disconnect();
        oscillator = null;
    }
}

function startSessionTimer() {
    if (sessionTimer) clearInterval(sessionTimer);
    sessionStartTime = Date.now();
    
    sessionTimer = setInterval(() => {
        const elapsed = Date.now() - sessionStartTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        sessionTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

async function startDetection() {
    try {
        if (isDetectionActive) return;

        if (!stream) {
            const cameraInitialized = await initializeCamera();
            if (!cameraInitialized) return;
        }
        
        if (!faceMesh) {
            const faceMeshInitialized = await initializeFaceMesh();
            if (!faceMeshInitialized) return;
        }

        // Create new journey
        currentJourney = {
            id: Date.now(),
            driver: currentDriver || 'Guest',
            startTime: new Date().toISOString(),
            alerts: 0,
            duration: 0,
            status: 'active'
        };
        
        journeyAlerts = 0;
        alertCount.textContent = '0';
        alertProgress.style.width = '0%';

        isDetectionActive = true;
        isPaused = false;
        
        // Update UI
        startBtn.style.display = 'none';
        pauseBtn.style.display = 'flex';
        calibrateBtn.style.display = 'flex';
        stopBtn.style.display = 'flex';
        statusText.textContent = 'Starting journey...';
        updateStatus('warning');
        updateSystemStatus('calibrating', 'Starting new journey...');
        startSessionTimer();

        // Frame processing function
        let processing = false;
        
        async function processFrame() {
            if (!isDetectionActive || processing) return;
            
            processing = true;
            
            try {
                if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
                    await faceMesh.send({image: videoElement});
                }
            } catch (error) {
                console.error('Frame processing error:', error);
                if (error.message.includes('stack')) {
                    isDetectionActive = false;
                    enhancedStopDetection();
                    alert('Detection system overloaded. Please restart.');
                    return;
                }
            } finally {
                processing = false;
                
                if (isDetectionActive) {
                    requestAnimationFrame(processFrame);
                }
            }
        }
        
        // Start calibration after 1 second
        setTimeout(() => {
            if (isDetectionActive) {
                isCalibrated = false;
                calibData = [];
                eyeClosedCounter = 0;
            }
        }, 1000);
        
        // Start frame processing
        requestAnimationFrame(processFrame);
        
    } catch (error) {
        console.error('Start detection error:', error);
        statusText.textContent = 'Detection failed';
        updateStatus('danger');
        updateSystemStatus('error', 'Detection failed to start');
        isDetectionActive = false;
    }
}

// Enhanced stop detection with analytics saving
function enhancedStopDetection() {
    if (isDetectionActive && sessionStartTime) {
        // Calculate session metrics for analytics
        const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 60000); // minutes
        const sessionScore = calculateSessionScore();
        const sessionAlerts = journeyAlerts;
        const sessionStatus = determineSessionStatus(sessionScore, sessionAlerts);
        
        // Save session data
        saveSessionData(sessionDuration, sessionScore, sessionAlerts, sessionStatus);
    }
    
    // Call original stop logic
    stopDetection();
}

function stopDetection() {
    isDetectionActive = false;
    isPaused = false;
    
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    
    triggerAlert(false);
    
    if (sessionTimer) {
        clearInterval(sessionTimer);
        sessionTimer = null;
    }
    
    if (canvasCtx) {
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    }
    
    eyeClosedCounter = 0;
    calibData = [];
    isCalibrated = false;
    
    startBtn.style.display = 'flex';
    pauseBtn.style.display = 'none';
    calibrateBtn.style.display = 'none';
    stopBtn.style.display = 'none';
    statusText.textContent = 'Journey completed';
    updateStatus('warning');
    updateSystemStatus('ready', 'Ready for next journey');
    
    confVal.textContent = '0%';
    earValue.textContent = '0.000';
    sessionTime.textContent = '00:00';
    journeyAlerts = 0;
}

function resetCalibration() {
    isCalibrated = false;
    calibData = [];
    eyeClosedCounter = 0;
    journeyAlerts = 0;
    alertCount.textContent = '0';
    alertProgress.style.width = '0%';
    statusText.textContent = 'Recalibrating...';
    updateStatus('warning');
    updateSystemStatus('calibrating', 'Recalibrating detection system');
    triggerAlert(false);
}

// ===== ANALYTICS FUNCTIONS =====

function saveSessionData(duration, score, alerts, status) {
    const session = {
        id: Date.now(),
        date: new Date(),
        duration: duration,
        score: score,
        alerts: alerts,
        status: status,
        notes: generateSessionNotes(score, alerts)
    };

    // Save to history
    sessionHistory.unshift(session);
    if (sessionHistory.length > 100) {
        sessionHistory = sessionHistory.slice(0, 100);
    }
    localStorage.setItem('driveGuardianHistory', JSON.stringify(sessionHistory));

    // Save as last journey for publishing
    saveLastJourney(session);

    // Update analytics UI
    updateAnalyticsUI();
    updateHistoryTable();
    updateAchievements();
    showEncouragementMessage();
    loadCommunityPreview();
}

function calculateSessionScore() {
    // Calculate a score based on alerts and duration
    let baseScore = 10;
    
    // Deduct for alerts
    const alertPenalty = journeyAlerts * 0.5;
    baseScore -= alertPenalty;
    
    // Bonus for longer durations
    const durationMinutes = Math.floor((Date.now() - sessionStartTime) / 60000);
    const durationBonus = Math.min(2, durationMinutes / 15);
    baseScore += durationBonus;
    
    return Math.max(1, Math.min(10, parseFloat(baseScore.toFixed(1))));
}

function determineSessionStatus(score, alerts) {
    if (score >= 8 && alerts <= 2) return 'safe';
    if (score >= 6 && alerts <= 5) return 'warning';
    return 'danger';
}

function generateSessionNotes(score, alerts) {
    if (score >= 9 && alerts === 0) return "Excellent focus! Perfect session.";
    if (score >= 8 && alerts <= 2) return "Good focus with minor distractions.";
    if (score >= 7 && alerts <= 4) return "Average focus, room for improvement.";
    return "Needs improvement - high alert count detected.";
}

function updateAnalyticsUI() {
    const filteredData = filterDataByTimeRange(sessionHistory, currentTimeRange);
    
    // Calculate statistics
    const totalSessions = filteredData.length;
    const totalAlertsCount = filteredData.reduce((sum, session) => sum + session.alerts, 0);
    const avgScore = totalSessions > 0 
        ? (filteredData.reduce((sum, session) => sum + session.score, 0) / totalSessions).toFixed(1)
        : '0.0';
    const avgDuration = totalSessions > 0
        ? Math.round(filteredData.reduce((sum, session) => sum + session.duration, 0) / totalSessions)
        : 0;
    
    // Find peak alert time
    let peakTime = 'N/A';
    if (filteredData.length > 0) {
        const hours = filteredData.map(s => new Date(s.date).getHours());
        const hourCounts = hours.reduce((acc, hour) => {
            acc[hour] = (acc[hour] || 0) + 1;
            return acc;
        }, {});
        const maxHour = Object.keys(hourCounts).reduce((a, b) => hourCounts[a] > hourCounts[b] ? a : b);
        peakTime = `${maxHour}:00`;
    }
    
    // Calculate trend (comparing last two periods)
    let trend = '0%';
    if (filteredData.length >= 2) {
        const recentAlerts = filteredData[0].alerts + filteredData[1].alerts;
        const olderAlerts = filteredData[2]?.alerts + filteredData[3]?.alerts || recentAlerts;
        const change = ((recentAlerts - olderAlerts) / olderAlerts) * 100;
        trend = `${change >= 0 ? '+' : ''}${Math.round(change)}%`;
        document.getElementById('trendStat').style.color = change < 0 ? '#10b981' : '#ef4444';
    }
    
    // Update UI elements
    document.getElementById('totalSessions').textContent = totalSessions;
    document.getElementById('totalAlertsStat').textContent = totalAlertsCount;
    document.getElementById('avgFocusScore').textContent = avgScore;
    document.getElementById('avgScore').textContent = avgScore;
    document.getElementById('avgDuration').textContent = avgDuration + 'm';
    document.getElementById('trendStat').textContent = trend;
    document.getElementById('peakTime').textContent = peakTime;
    
    // Calculate best streak
    const bestStreak = calculateBestStreak(filteredData);
    document.getElementById('bestStreak').textContent = bestStreak;
}

function filterDataByTimeRange(data, range) {
    const now = new Date();
    let cutoffDate = new Date();
    
    switch(range) {
        case 'week':
            cutoffDate.setDate(now.getDate() - 7);
            break;
        case 'month':
            cutoffDate.setMonth(now.getMonth() - 1);
            break;
        case 'year':
            cutoffDate.setFullYear(now.getFullYear() - 1);
            break;
        case 'all':
        default:
            return data;
    }
    
    return data.filter(session => new Date(session.date) >= cutoffDate);
}

function calculateBestStreak(data) {
    if (data.length === 0) return 0;
    
    let currentStreak = 0;
    let bestStreak = 0;
    let lastDate = null;
    
    const sortedSessions = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    sortedSessions.forEach(session => {
        const sessionDate = new Date(session.date).toDateString();
        
        if (lastDate === null) {
            currentStreak = 1;
        } else {
            const lastDateObj = new Date(lastDate);
            const currentDateObj = new Date(sessionDate);
            const dayDiff = (currentDateObj - lastDateObj) / (1000 * 60 * 60 * 24);
            
            if (dayDiff === 1) {
                currentStreak++;
            } else if (dayDiff > 1) {
                currentStreak = 1;
            }
        }
        
        if (currentStreak > bestStreak) {
            bestStreak = currentStreak;
        }
        
        lastDate = sessionDate;
    });
    
    return bestStreak;
}

function updateHistoryTable() {
    const tableBody = document.getElementById('analyticsHistoryTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (sessionHistory.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 3rem;">
                    <i class="fas fa-history" style="font-size: 2rem; margin-bottom: 1rem; color: #64748b;"></i>
                    <div>No session history yet</div>
                    <div style="font-size: 0.9rem; color: #94a3b8; margin-top: 0.5rem;">
                        Start a journey to see your data here
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    sessionHistory.slice(0, 10).forEach(session => {
        const row = document.createElement('tr');
        const date = new Date(session.date);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const statusClass = 'status-' + session.status;
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${session.duration} min</td>
            <td>${session.score.toFixed(1)}/10</td>
            <td>${session.alerts}</td>
            <td><span class="status-badge ${statusClass}">${session.status.toUpperCase()}</span></td>
            <td>${session.notes}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

function updateAchievements() {
    const achievementsGrid = document.getElementById('achievementsGrid');
    if (!achievementsGrid) return;
    
    achievementsGrid.innerHTML = '';
    
    achievements.forEach(achievement => {
        const isEarned = achievement.condition(sessionHistory);
        const progress = achievement.progress(sessionHistory);
        
        const card = document.createElement('div');
        card.className = `achievement-card ${isEarned ? 'earned' : ''}`;
        card.innerHTML = `
            <div class="achievement-icon ${isEarned ? 'earned' : ''}">
                <i class="fas fa-${achievement.icon}"></i>
            </div>
            <div class="achievement-content">
                <h4>${achievement.name}</h4>
                <p>${achievement.description}</p>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <small>${isEarned ? 'Achievement Unlocked!' : `${Math.round(progress)}% complete`}</small>
            </div>
        `;
        
        achievementsGrid.appendChild(card);
    });
}

function showEncouragementMessage() {
    const messageEl = document.getElementById('encouragementMessage');
    if (!messageEl) return;
    
    if (sessionHistory.length === 0) {
        messageEl.innerHTML = `
            <div class="message-header">
                <i class="fas fa-trophy"></i>
                <h3>Welcome to Drive Guardian AI!</h3>
            </div>
            <p class="message-content">Start your first journey to earn your first achievement</p>
            <p class="message-subtext">Complete a journey to unlock the "First Drive" badge</p>
        `;
        return;
    }
    
    // Find appropriate message based on latest session
    const latestSession = sessionHistory[0];
    let selectedMessage = encouragementMessages[0];
    
    for (const message of encouragementMessages) {
        if (message.condition(sessionHistory)) {
            selectedMessage = message;
            break;
        }
    }
    
    messageEl.innerHTML = `
        <div class="message-header">
            <i class="fas fa-${selectedMessage.icon}"></i>
            <h3>${latestSession.score >= 8 ? 'Great Job!' : 'Stay Focused!'}</h3>
        </div>
        <p class="message-content">${selectedMessage.message}</p>
        <p class="message-subtext">${selectedMessage.subtext}</p>
    `;
    
    // Add animation
    messageEl.style.animation = 'none';
    setTimeout(() => {
        messageEl.style.animation = 'fadeIn 1s ease';
    }, 10);
}

function changeTimeRange(range) {
    // Update active button
    document.querySelectorAll('.date-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Update current range
    currentTimeRange = range;

    // Refresh both analytics and charts
    updateAnalyticsUI();
    updateCharts();
}

function exportHistory() {
    if (sessionHistory.length === 0) {
        alert('No session data to export. Start a journey first.');
        return;
    }

    const dataStr = JSON.stringify(sessionHistory, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `driveguardian-history-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// ===== CHART FUNCTIONS =====

function initializeCharts() {
    if (sessionHistory.length === 0) {
        createEmptyCharts();
        return;
    }

    const filteredData = filterDataByTimeRange(sessionHistory, currentTimeRange);

    // Alert Trend Chart
    const alertTrendCtx = document.getElementById('alertTrendChart')?.getContext('2d');
    if (alertTrendCtx && !chartInstances.alertTrend) {
        chartInstances.alertTrend = new Chart(alertTrendCtx, {
            type: 'line',
            data: getAlertTrendData(filteredData),
            options: getChartOptions('Alerts', 'count')
        });
    }

    // Score Distribution Chart
    const scoreChartCtx = document.getElementById('scoreChart')?.getContext('2d');
    if (scoreChartCtx && !chartInstances.scoreChart) {
        chartInstances.scoreChart = new Chart(scoreChartCtx, {
            type: 'bar',
            data: getScoreDistributionData(filteredData),
            options: getChartOptions('Sessions', 'count')
        });
    }

    // Time Distribution Chart
    const timeChartCtx = document.getElementById('timeChart')?.getContext('2d');
    if (timeChartCtx && !chartInstances.timeChart) {
        chartInstances.timeChart = new Chart(timeChartCtx, {
            type: 'pie',
            data: getTimeDistributionData(filteredData),
            options: getPieChartOptions()
        });
    }

    // Duration Chart
    const durationChartCtx = document.getElementById('durationChart')?.getContext('2d');
    if (durationChartCtx && !chartInstances.durationChart) {
        chartInstances.durationChart = new Chart(durationChartCtx, {
            type: 'line',
            data: getDurationTrendData(filteredData),
            options: getChartOptions('Minutes', 'duration')
        });
    }
}

function createEmptyCharts() {
    const emptyData = {
        labels: ['No data yet'],
        datasets: [{
            data: [1],
            backgroundColor: ['rgba(100, 116, 139, 0.6)']
        }]
    };

    const emptyLineData = {
        labels: ['No data'],
        datasets: [{
            label: 'No data available',
            data: [0],
            borderColor: 'rgba(100, 116, 139, 0.6)',
            backgroundColor: 'rgba(100, 116, 139, 0.1)',
            tension: 0.4,
            fill: true
        }]
    };

    // Alert Trend Chart
    const alertTrendCtx = document.getElementById('alertTrendChart')?.getContext('2d');
    if (alertTrendCtx && !chartInstances.alertTrend) {
        chartInstances.alertTrend = new Chart(alertTrendCtx, {
            type: 'line',
            data: emptyLineData,
            options: getChartOptions('Alerts', 'count')
        });
    }

    // Score Distribution Chart
    const scoreChartCtx = document.getElementById('scoreChart')?.getContext('2d');
    if (scoreChartCtx && !chartInstances.scoreChart) {
        chartInstances.scoreChart = new Chart(scoreChartCtx, {
            type: 'bar',
            data: emptyData,
            options: getChartOptions('Sessions', 'count')
        });
    }

    // Time Distribution Chart
    const timeChartCtx = document.getElementById('timeChart')?.getContext('2d');
    if (timeChartCtx && !chartInstances.timeChart) {
        chartInstances.timeChart = new Chart(timeChartCtx, {
            type: 'pie',
            data: emptyData,
            options: getPieChartOptions()
        });
    }

    // Duration Chart
    const durationChartCtx = document.getElementById('durationChart')?.getContext('2d');
    if (durationChartCtx && !chartInstances.durationChart) {
        chartInstances.durationChart = new Chart(durationChartCtx, {
            type: 'line',
            data: emptyLineData,
            options: getChartOptions('Minutes', 'duration')
        });
    }
}

function getAlertTrendData(data) {
    // Group by day for the last 7 days
    const last7Days = [...Array(7)].map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    }).reverse();

    const alertsByDay = last7Days.map(day => {
        const dayData = data.filter(s => {
            const sessionDay = new Date(s.date).toLocaleDateString('en-US', { weekday: 'short' });
            return sessionDay === day;
        });
        return dayData.reduce((sum, s) => sum + s.alerts, 0);
    });

    return {
        labels: last7Days,
        datasets: [{
            label: 'Daily Alerts',
            data: alertsByDay,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.4,
            fill: true
        }]
    };
}

function getScoreDistributionData(data) {
    const scoreRanges = ['<6', '6-7', '7-8', '8-9', '9-10'];
    const counts = scoreRanges.map(range => {
        const [min, max] = range.split('-').map(Number);
        if (range === '<6') {
            return data.filter(s => s.score < 6).length;
        } else {
            return data.filter(s => s.score >= min && s.score < (max || 11)).length;
        }
    });

    return {
        labels: scoreRanges,
        datasets: [{
            label: 'Sessions',
            data: counts,
            backgroundColor: [
                'rgba(239, 68, 68, 0.6)',
                'rgba(245, 158, 11, 0.6)',
                'rgba(59, 130, 246, 0.6)',
                'rgba(16, 185, 129, 0.6)',
                'rgba(124, 58, 237, 0.6)'
            ]
        }]
    };
}

function getTimeDistributionData(data) {
    const timeSlots = ['Morning (6AM-12PM)', 'Afternoon (12PM-6PM)', 'Evening (6PM-12AM)', 'Night (12AM-6AM)'];
    const counts = [0, 0, 0, 0];

    data.forEach(session => {
        const hour = new Date(session.date).getHours();
        if (hour >= 6 && hour < 12) counts[0]++;
        else if (hour >= 12 && hour < 18) counts[1]++;
        else if (hour >= 18 && hour < 24) counts[2]++;
        else counts[3]++;
    });

    return {
        labels: timeSlots,
        datasets: [{
            data: counts,
            backgroundColor: [
                'rgba(30, 64, 175, 0.6)',
                'rgba(59, 130, 246, 0.6)',
                'rgba(245, 158, 11, 0.6)',
                'rgba(30, 41, 59, 0.6)'
            ]
        }]
    };
}

function getDurationTrendData(data) {
    // Last 5 sessions
    const lastSessions = data.slice(0, 5).reverse();
    const labels = lastSessions.map((s, i) => `Session ${i + 1}`);
    const durations = lastSessions.map(s => s.duration);

    return {
        labels: labels,
        datasets: [{
            label: 'Duration (min)',
            data: durations,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            tension: 0.4,
            fill: true
        }]
    };
}

function getChartOptions(yLabel, dataType) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
                labels: {
                    color: '#94a3b8'
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                    drawBorder: false
                },
                ticks: {
                    color: '#94a3b8',
                    callback: function(value) {
                        return dataType === 'duration' ? value + 'm' : value;
                    }
                }
            },
            x: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                    drawBorder: false
                },
                ticks: { color: '#94a3b8' }
            }
        }
    };
}

function getPieChartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    color: '#94a3b8',
                    font: {
                        size: 12
                    }
                }
            }
        }
    };
}

function updateCharts() {
    // Destroy existing charts
    Object.values(chartInstances).forEach(chart => {
        if (chart) chart.destroy();
    });
    chartInstances = {};

    // Create new charts
    initializeCharts();
}

// ===== LOGIN FUNCTIONS =====

function openLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function updateUserDisplay(email) {
    // Update current user display
    if (currentUser) {
        const displayName = email.split('@')[0];
        currentUser.textContent = displayName;
    }
    
    // Update navigation button
    const navCta = document.querySelector('.nav-cta');
    if (navCta) {
        const displayName = email.split('@')[0];
        navCta.innerHTML = `<i class="fas fa-user"></i> ${displayName}`;
        navCta.onclick = function(e) {
            e.preventDefault();
            handleLogout();
        };
    }
}

function handleLogin(email, provider) {
    isLoggedIn = true;
    currentDriver = email;
    
    // Save login state to localStorage
    localStorage.setItem('driveGuardianLoggedIn', 'true');
    localStorage.setItem('driveGuardianCurrentDriver', email);
    
    // Update UI
    updateUserDisplay(email);
    closeLoginModal();
    
    // Update system status
    updateSystemStatus('ready', `Logged in via ${provider}`);
    
    // Show welcome message
    alert(`Welcome ${email.split('@')[0]}! You're now logged in to Drive Guardian AI.`);
    
    // Update publish section if exists
    loadCommunityPreview();
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        isLoggedIn = false;
        currentDriver = null;
        
        // Clear login state from localStorage
        localStorage.setItem('driveGuardianLoggedIn', 'false');
        localStorage.removeItem('driveGuardianCurrentDriver');
        
        // Update UI
        if (currentUser) {
            currentUser.textContent = 'Guest';
        }
        
        // Update navigation button
        const navCta = document.querySelector('.nav-cta');
        if (navCta) {
            navCta.innerHTML = '<i class="fas fa-user"></i> Driver Login';
            navCta.onclick = function(e) {
                e.preventDefault();
                openLoginModal();
            };
        }
        
        // Update system status
        updateSystemStatus('ready', 'Ready to start detection');
        
        alert('You have been logged out successfully.');
    }
}

function simulateGoogleLogin() {
    const email = `driver${Math.floor(Math.random() * 1000)}@gmail.com`;
    handleLogin(email, 'Google');
}

function simulateMicrosoftLogin() {
    const email = `driver${Math.floor(Math.random() * 1000)}@outlook.com`;
    handleLogin(email, 'Microsoft');
}

function handleEmailLogin(email, password) {
    // In a real app, you would validate credentials with a server
    // For demo purposes, we'll accept any non-empty email and password
    if (email && password) {
        handleLogin(email, 'Email');
    } else {
        alert('Please enter both email and password');
    }
}

// ===== EVENT LISTENERS AND INITIALIZATION =====

document.addEventListener('DOMContentLoaded', async () => {
    await initializeEverything();
    
    // Set up event listeners
    pauseBtn.addEventListener('click', togglePause);
    calibrateBtn.addEventListener('click', resetCalibration);
    
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('loginEmail')?.value;
            const password = document.getElementById('loginPassword')?.value;
            
            if (email && password) {
                handleEmailLogin(email, password);
            }
        });
    }
    
    // Social login buttons
    const googleLoginBtn = document.querySelector('[onclick*="simulateGoogleLogin"]');
    if (googleLoginBtn) {
        googleLoginBtn.onclick = function(e) {
            e.preventDefault();
            simulateGoogleLogin();
        };
    }
    
    const microsoftLoginBtn = document.querySelector('[onclick*="simulateMicrosoftLogin"]');
    if (microsoftLoginBtn) {
        microsoftLoginBtn.onclick = function(e) {
            e.preventDefault();
            simulateMicrosoftLogin();
        };
    }
    
    // Close modal when clicking outside
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.addEventListener('click', function(event) {
            if (event.target === this) {
                closeLoginModal();
            }
        });
    }
    
    // Close modal with escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && loginModal.style.display === 'flex') {
            closeLoginModal();
        }
    });
    
    updateSystemStatus('ready', 'System initialized and ready');
    updateStatus('warning');
    statusText.textContent = 'Ready to start detection';
});

function togglePause() {
    isPaused = !isPaused;
    
    if (isPaused) {
        isDetectionActive = false;
        pauseBtn.innerHTML = '<i class="fas fa-play"></i> Resume Detection';
        updateSystemStatus('paused', 'Detection paused');
        triggerAlert(false);
        statusText.textContent = 'Detection Paused';
        updateStatus('warning');
    } else {
        isDetectionActive = true;
        pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause Detection';
        updateSystemStatus('monitoring', 'Journey monitoring active');
        statusText.textContent = 'Monitoring Active';
        updateStatus('safe');
        requestAnimationFrame(processFrame);
    }
}

// FAB start detection
function startDetectionFromFab() {
    if (!isLoggedIn) {
        openLoginModal();
        return;
    }
    
    if (startBtn.style.display !== 'none') {
        startDetection();
    } else {
        scrollToDemo();
    }
}

// Scroll to demo
function scrollToDemo() {
    document.querySelector('.demo-section').scrollIntoView({ behavior: 'smooth' });
}

// Animated counters for statistics
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-count'));
        const isLarge = target > 1000;
        const suffix = isLarge ? 'K' : '';
        const displayTarget = isLarge ? Math.floor(target / 1000) : target;
        
        let current = 0;
        const increment = displayTarget / 100;
        const timer = setInterval(() => {
            current += increment;
            if (current >= displayTarget) {
                current = displayTarget;
                clearInterval(timer);
            }
            counter.textContent = Math.floor(current) + suffix;
        }, 20);
    });
}

// Start counters when in view
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateCounters();
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

document.querySelector('.stats-section')?.querySelectorAll('.stat-item').forEach(item => {
    observer.observe(item);
});

// Parallax effect for background particles
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const rate = scrolled * -0.3;
    document.querySelector('.bg-particles').style.transform = `translate3d(0, ${rate}px, 0)`;
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const target = document.querySelector(targetId);
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Make functions globally available
window.startDetectionFromFab = startDetectionFromFab;
window.scrollToDemo = scrollToDemo;
window.changeTimeRange = changeTimeRange;
window.exportHistory = exportHistory;
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.simulateGoogleLogin = simulateGoogleLogin;
window.simulateMicrosoftLogin = simulateMicrosoftLogin;
window.publishLastJourney = publishLastJourney;
window.viewPublishedJourneys = viewPublishedJourneys;