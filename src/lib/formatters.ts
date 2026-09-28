/**
 * Indian Rupee and Date/Time Formatting Utilities
 * Timezone: Asia/Kolkata
 */

/**
 * Formats a number to Indian Rupee currency format (e.g., ₹5,000, ₹50,000, ₹1,00,000, ₹10,00,000)
 */
export function formatINR(amount: number | null | undefined, includeSymbol: boolean = true): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return includeSymbol ? '₹0' : '0';
  }

  // Exact 2 decimal or whole number rounding
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  // Format using Indian Numbering System
  const parts = absAmount.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  let result = '';
  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    result = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  } else {
    result = integerPart;
  }

  // Drop .00 if whole number, else keep decimals
  if (decimalPart && decimalPart !== '00') {
    result += '.' + decimalPart;
  }

  const formatted = (isNegative ? '-' : '') + result;
  return includeSymbol ? `₹${formatted}` : formatted;
}

/**
 * Formats a number for PDF documents using 'Rs.' to guarantee 100% PDF font compatibility
 * without Unicode missing glyphs or corrupt characters.
 */
export function formatPDFCurrency(amount: number | null | undefined, prefix: string = 'Rs. '): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return `${prefix}0`;
  }
  const formattedRaw = formatINR(amount, false);
  return `${prefix}${formattedRaw}`;
}

/**
 * Formats a date string (YYYY-MM-DD or ISO) into Indian format: e.g. "26 Sep 2026"
 */
export function formatIndianDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';

  try {
    let dateObj: Date;
    if (typeof dateInput === 'string') {
      // If YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        const [year, month, day] = dateInput.split('-').map(Number);
        dateObj = new Date(year, month - 1, day);
      } else {
        dateObj = new Date(dateInput);
      }
    } else {
      dateObj = dateInput;
    }

    if (isNaN(dateObj.getTime())) return '—';

    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    }).format(dateObj);
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats time into Indian format: e.g. "8:42 PM"
 */
export function formatIndianTime(timeInput: string | Date | null | undefined): string {
  if (!timeInput) return '—';

  try {
    if (typeof timeInput === 'string') {
      // If already in 12hr format with AM/PM
      if (timeInput.includes('AM') || timeInput.includes('PM') || timeInput.includes('am') || timeInput.includes('pm')) {
        return timeInput;
      }
      // If HH:mm or HH:mm:ss
      if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timeInput)) {
        const [h, m] = timeInput.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        const displayHour = h % 12 === 0 ? 12 : h % 12;
        const displayMin = m.toString().padStart(2, '0');
        return `${displayHour}:${displayMin} ${period}`;
      }
      const d = new Date(timeInput);
      if (!isNaN(d.getTime())) {
        return new Intl.DateTimeFormat('en-IN', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata',
        }).format(d);
      }
    } else if (timeInput instanceof Date) {
      return new Intl.DateTimeFormat('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      }).format(timeInput);
    }
    return String(timeInput);
  } catch {
    return String(timeInput);
  }
}

/**
 * Returns current date in India timezone as YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

/**
 * Returns current time in India timezone as HH:mm A (e.g. 08:42 PM)
 */
export function getCurrentTimeString(): string {
  const now = new Date();
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(now);
}
