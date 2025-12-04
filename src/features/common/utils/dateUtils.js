/**
 * Date Utilities - Relative date parsing and normalization
 * Converts relative date expressions (FR/EN) to ISO format
 */

/**
 * Day name mappings (English and French)
 */
const DAY_NAMES = {
    // English
    'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
    'friday': 5, 'saturday': 6, 'sunday': 0,
    // French
    'lundi': 1, 'mardi': 2, 'mercredi': 3, 'jeudi': 4,
    'vendredi': 5, 'samedi': 6, 'dimanche': 0
};

/**
 * Parse a relative date string and return an ISO date string
 * @param {string} dateStr - Relative date string (e.g., "vendredi", "next week", "demain")
 * @param {Date} referenceDate - Reference date (default: now)
 * @returns {string|null} ISO date string or null if unparseable
 */
function parseRelativeDate(dateStr, referenceDate = new Date()) {
    if (!dateStr || typeof dateStr !== 'string') {
        return null;
    }

    const normalized = dateStr.toLowerCase().trim();

    // Skip already valid ISO dates or timestamps
    if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
        return dateStr; // Already ISO format
    }

    // Skip TBD/Flexible markers
    if (normalized === 'tbd' || normalized === 'flexible' || normalized === 'n/a') {
        return null;
    }

    const today = new Date(referenceDate);
    today.setHours(23, 59, 59, 999); // End of day

    // Today patterns
    if (/^(today|aujourd'hui|ce jour)$/i.test(normalized)) {
        return today.toISOString();
    }

    // Tomorrow patterns
    if (/^(tomorrow|demain)$/i.test(normalized)) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString();
    }

    // Tonight/Ce soir
    if (/^(tonight|ce soir)$/i.test(normalized)) {
        return today.toISOString();
    }

    // This week patterns
    if (/^(this week|cette semaine)$/i.test(normalized)) {
        const endOfWeek = new Date(today);
        const daysUntilSunday = 7 - endOfWeek.getDay();
        endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday);
        return endOfWeek.toISOString();
    }

    // Next week patterns
    if (/^(next week|la semaine prochaine|semaine prochaine)$/i.test(normalized)) {
        const nextWeek = new Date(today);
        const daysUntilNextSunday = 7 - nextWeek.getDay() + 7;
        nextWeek.setDate(nextWeek.getDate() + daysUntilNextSunday);
        return nextWeek.toISOString();
    }

    // Next month patterns
    if (/^(next month|le mois prochain|mois prochain)$/i.test(normalized)) {
        const nextMonth = new Date(today);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(0); // Last day of next month
        return nextMonth.toISOString();
    }

    // Day names (find next occurrence)
    for (const [dayName, dayIndex] of Object.entries(DAY_NAMES)) {
        if (normalized.includes(dayName)) {
            const targetDate = getNextDayOfWeek(today, dayIndex);
            return targetDate.toISOString();
        }
    }

    // "in X days/weeks/months" patterns (EN)
    const inDaysMatch = normalized.match(/^in\s+(\d+)\s+(day|days|jour|jours)$/i);
    if (inDaysMatch) {
        const days = parseInt(inDaysMatch[1], 10);
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + days);
        return targetDate.toISOString();
    }

    const inWeeksMatch = normalized.match(/^in\s+(\d+)\s+(week|weeks|semaine|semaines)$/i);
    if (inWeeksMatch) {
        const weeks = parseInt(inWeeksMatch[1], 10);
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + (weeks * 7));
        return targetDate.toISOString();
    }

    // "dans X jours/semaines" patterns (FR)
    const dansDaysMatch = normalized.match(/^dans\s+(\d+)\s+(jour|jours)$/i);
    if (dansDaysMatch) {
        const days = parseInt(dansDaysMatch[1], 10);
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + days);
        return targetDate.toISOString();
    }

    const dansWeeksMatch = normalized.match(/^dans\s+(\d+)\s+(semaine|semaines)$/i);
    if (dansWeeksMatch) {
        const weeks = parseInt(dansWeeksMatch[1], 10);
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + (weeks * 7));
        return targetDate.toISOString();
    }

    // "le X" or "the Xth" (day of current/next month)
    const dayOfMonthMatch = normalized.match(/(?:le|the)\s*(\d{1,2})(?:st|nd|rd|th)?$/i);
    if (dayOfMonthMatch) {
        const targetDay = parseInt(dayOfMonthMatch[1], 10);
        const targetDate = new Date(today);

        // If the day has passed this month, go to next month
        if (targetDay <= today.getDate()) {
            targetDate.setMonth(targetDate.getMonth() + 1);
        }
        targetDate.setDate(targetDay);
        return targetDate.toISOString();
    }

    // "fin + month" patterns (e.g., "fin novembre")
    const endOfMonthMatch = normalized.match(/^fin\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)$/i);
    if (endOfMonthMatch) {
        const monthName = endOfMonthMatch[1].toLowerCase();
        const monthIndex = getMonthIndex(monthName);
        if (monthIndex !== -1) {
            const targetDate = new Date(today);
            targetDate.setMonth(monthIndex + 1);
            targetDate.setDate(0); // Last day of the month
            // If month has passed, go to next year
            if (targetDate < today) {
                targetDate.setFullYear(targetDate.getFullYear() + 1);
            }
            return targetDate.toISOString();
        }
    }

    // ASAP/Urgent = today
    if (/^(asap|urgent|immédiatement|immediately|right away|tout de suite)$/i.test(normalized)) {
        return today.toISOString();
    }

    // Cannot parse - return null
    return null;
}

/**
 * Get the next occurrence of a day of the week
 * @param {Date} fromDate - Starting date
 * @param {number} targetDay - Target day (0=Sunday, 1=Monday, etc.)
 * @returns {Date} Next occurrence of that day
 */
function getNextDayOfWeek(fromDate, targetDay) {
    const result = new Date(fromDate);
    const currentDay = result.getDay();

    // Calculate days until target day
    let daysUntil = targetDay - currentDay;

    // If target day is today or in the past, go to next week
    if (daysUntil <= 0) {
        daysUntil += 7;
    }

    result.setDate(result.getDate() + daysUntil);
    result.setHours(23, 59, 59, 999); // End of day
    return result;
}

/**
 * Get month index from French month name
 * @param {string} monthName - French month name
 * @returns {number} Month index (0-11) or -1 if not found
 */
function getMonthIndex(monthName) {
    const months = {
        'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3,
        'mai': 4, 'juin': 5, 'juillet': 6, 'août': 7,
        'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11,
        // English
        'january': 0, 'february': 1, 'march': 2, 'april': 3,
        'may': 4, 'june': 5, 'july': 6, 'august': 7,
        'september': 8, 'october': 9, 'november': 10, 'december': 11
    };
    return months[monthName.toLowerCase()] ?? -1;
}

/**
 * Check if a deadline string represents an overdue date
 * @param {string} deadlineStr - Deadline string (relative or ISO)
 * @param {Date} referenceDate - Reference date (default: now)
 * @returns {boolean} True if overdue
 */
function isOverdue(deadlineStr, referenceDate = new Date()) {
    if (!deadlineStr || deadlineStr === 'TBD' || deadlineStr === 'Flexible') {
        return false;
    }

    // Try to parse as ISO date first
    let deadline = new Date(deadlineStr);

    // If invalid, try relative parsing
    if (isNaN(deadline.getTime())) {
        const isoDate = parseRelativeDate(deadlineStr, referenceDate);
        if (!isoDate) {
            return false; // Cannot parse, not overdue
        }
        deadline = new Date(isoDate);
    }

    return deadline < referenceDate;
}

/**
 * Check if a deadline string represents a date within the next N days
 * @param {string} deadlineStr - Deadline string (relative or ISO)
 * @param {number} days - Number of days to look ahead
 * @param {Date} referenceDate - Reference date (default: now)
 * @returns {boolean} True if deadline is within the specified days
 */
function isWithinDays(deadlineStr, days, referenceDate = new Date()) {
    if (!deadlineStr || deadlineStr === 'TBD' || deadlineStr === 'Flexible') {
        return false;
    }

    // Try to parse as ISO date first
    let deadline = new Date(deadlineStr);

    // If invalid, try relative parsing
    if (isNaN(deadline.getTime())) {
        const isoDate = parseRelativeDate(deadlineStr, referenceDate);
        if (!isoDate) {
            return false;
        }
        deadline = new Date(isoDate);
    }

    const futureDate = new Date(referenceDate);
    futureDate.setDate(futureDate.getDate() + days);

    return deadline >= referenceDate && deadline <= futureDate;
}

/**
 * Format a date string for display
 * @param {string} dateStr - Date string (relative or ISO)
 * @param {string} locale - Locale for formatting (default: 'fr-FR')
 * @returns {string} Formatted date string
 */
function formatDateForDisplay(dateStr, locale = 'fr-FR') {
    if (!dateStr || dateStr === 'TBD' || dateStr === 'Flexible') {
        return dateStr || 'TBD';
    }

    // Try to parse
    let date = new Date(dateStr);

    if (isNaN(date.getTime())) {
        const isoDate = parseRelativeDate(dateStr);
        if (!isoDate) {
            return dateStr; // Return original if unparseable
        }
        date = new Date(isoDate);
    }

    return date.toLocaleDateString(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    });
}

module.exports = {
    parseRelativeDate,
    getNextDayOfWeek,
    getMonthIndex,
    isOverdue,
    isWithinDays,
    formatDateForDisplay
};
