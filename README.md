Drive Guardian AI 🛡️

Intelligent Driver Safety & Drowsiness Detection System

Drive Guardian AI is a high-performance safety solution engineered to combat driver fatigue and distraction. By utilizing real-time computer vision and facial landmark tracking, the system acts as an intelligent co-pilot, alerting drivers to potential hazards before they occur.

🚀 Core Capabilities

1. High-Precision Drowsiness Detection

AI Face Mesh Tracking: Powered by MediaPipe to monitor 468 distinct facial landmarks via webcam with millimeter-level precision.

Mathematical EAR Modeling: Calculates the Eye Aspect Ratio (EAR) using Euclidean distance between eyelid landmarks to determine fatigue levels scientifically.

Smart Calibration: A personalized 5-second adaptive calibration phase that establishes a unique "open-eye" baseline for every user, accounting for different facial structures.

Instant Alert Engine: Triggers high-visibility visual warnings ("DROWSINESS DETECTED") and synchronized audible alarms when thresholds are breached.

Performance HUD: A live dashboard showing real-time EAR values, tracking confidence intervals, and active session timers.

2. Analytics & Journey Insights

Comprehensive Logging: Automatically tracks alert frequency, total drive duration, and calculated cumulative safety scores.

Visual Data Trends: Integrated Chart.js modules to render historical performance and identify specific times of day where fatigue peaks.

System Status HUD: Live indicators for "Calibrating," "Active," and "Warning" states to keep the driver informed of system health.

Data Portability: Allows users to export their complete journey history as standardized JSON files for external review or insurance logging.

3. Community Ecosystem

Journey Publishing: Share safety sessions with the community, including vehicle-specific tags (Car, Truck, Motorcycle) and personal notes.

Global Safety Insights: Dedicated analytics visualizing community safety score distributions and daily publication trends.

Smart Discovery: A robust filtering system to sort and analyze community safety data by vehicle type or safety rating.

🎨 User Experience

Glassmorphism Design: A premium, modern interface featuring translucent layers, blurred backgrounds, and animated background particles.

Unified Control Center: A Floating Action Button (FAB) provides instant access to start, stop, and pause functions without obstructing the camera view.

Secure Auth Integration: Professional-grade login simulations for Google and Microsoft OAuth, providing a familiar and secure entry point.

🛠️ Technical Roadmap

Phase 1: Multi-Metric Detection

MAR (Mouth Aspect Ratio): Integrate lip-tracking to detect yawning patterns.

Yawn Pattern Analytics: Predictive alerts based on yawning frequency over a 5-minute rolling window.

Blink Rate Monitoring: Identifying abnormal "staring" or erratic blinking patterns that precede microsleep.

Phase 2: Advanced Distraction Monitoring

Gaze Tracking: Monitor iris position to detect when a driver’s attention leaves the road for more than 2 seconds.

Head Pose Estimation: Calculate Pitch, Yaw, and Roll to identify "head slumping" or nodding off.

Microsleep Capture: Specific detection logic for 1–3 second eye-closure windows that differ from standard blinks.

Phase 3: Environmental Adaptations

Low-Light Optimization: Automated stream brightness checks and histogram equalization for night-time driving.

Web Extension: A background monitoring tool that stays active while the user focuses on navigation apps (Google Maps/Waze).

Hardware Support: Compatibility with secondary Infrared (IR) camera peripherals for detection in total darkness.


📄 License & Versioning

Release Version: 1.0.0

Project Status: Active Development

Last Updated: February 6, 2026

Drive Guardian AI — Ensuring safety is never an afterthought.
