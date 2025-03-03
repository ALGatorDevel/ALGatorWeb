(function() {
    if (window._trackedIntervals) {
        console.warn("Interval tracker is already running.");
        return;
    }

    const originalSetInterval = window.setInterval;
    const originalClearInterval = window.clearInterval;

    window._trackedIntervals = new Set();

    // Override setInterval to track IDs
    window.setInterval = function(callback, delay, ...args) {
        const id = originalSetInterval(callback, delay, ...args);
        window._trackedIntervals.add(id);
        console.log(`🔄 setInterval started (ID: ${id}, Delay: ${delay}ms)`);
        return id;
    };

    // Override clearInterval to track removals
    window.clearInterval = function(id) {
        if (window._trackedIntervals.has(id)) {
            console.log(`🛑 setInterval cleared (ID: ${id})`);
            window._trackedIntervals.delete(id);
        }
        return originalClearInterval(id);
    };

    // Utility function to list all active intervals
    window.listIntervals = function() {
        console.log(`⏳ Active setIntervals:`, Array.from(window._trackedIntervals));
    };

    // Utility function to remove all active intervals
    window.clearAllIntervals = function() {
        window._trackedIntervals.forEach(id => clearInterval(id));
        console.log("🚫 All setIntervals cleared.");
    };

    console.log("✅ Interval tracker activated. Use listIntervals() to see active timers or clearAllIntervals() to stop all.");
})();
