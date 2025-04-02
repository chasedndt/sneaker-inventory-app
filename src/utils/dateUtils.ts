// src/utils/dateUtils.ts

/**
 * Format a date according to the specified format
 * @param date - Date to format
 * @param format - Format to use (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD)
 * @returns Formatted date string
 */
export const formatDate = (
    date: Date | string,
    format: string = 'MM/DD/YYYY'
  ): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(d.getTime())) {
      console.error('Invalid date provided to formatDate:', date);
      return 'Invalid date';
    }
    
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    
    switch (format) {
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      default:
        console.warn(`Unknown date format: ${format}, defaulting to MM/DD/YYYY`);
        return `${month}/${day}/${year}`;
    }
  };
  
  /**
   * Parse a date string into a Date object based on the format
   * @param dateString - Date string to parse
   * @param format - Format the string is in
   * @returns Date object
   */
  export const parseDate = (
    dateString: string,
    format: string = 'MM/DD/YYYY'
  ): Date => {
    // Check if dateString is empty
    if (!dateString) {
      console.error('Empty date string provided to parseDate');
      return new Date();
    }
  
    let day: number, month: number, year: number;
    
    switch (format) {
      case 'MM/DD/YYYY': {
        const parts = dateString.split('/');
        if (parts.length !== 3) {
          console.error('Invalid date string format:', dateString);
          return new Date();
        }
        month = parseInt(parts[0], 10) - 1; // Months are 0-indexed in JS
        day = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);
        break;
      }
      case 'DD/MM/YYYY': {
        const parts = dateString.split('/');
        if (parts.length !== 3) {
          console.error('Invalid date string format:', dateString);
          return new Date();
        }
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        year = parseInt(parts[2], 10);
        break;
      }
      case 'YYYY-MM-DD': {
        const parts = dateString.split('-');
        if (parts.length !== 3) {
          console.error('Invalid date string format:', dateString);
          return new Date();
        }
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        day = parseInt(parts[2], 10);
        break;
      }
      default:
        console.warn(`Unknown date format: ${format}, defaulting to MM/DD/YYYY`);
        const parts = dateString.split('/');
        if (parts.length !== 3) {
          console.error('Invalid date string format:', dateString);
          return new Date();
        }
        month = parseInt(parts[0], 10) - 1;
        day = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);
    }
    
    const date = new Date(year, month, day);
    
    if (isNaN(date.getTime())) {
      console.error('Error creating Date object from:', { day, month, year });
      return new Date();
    }
    
    return date;
  };
  
  /**
   * Get today's date formatted according to the specified format
   * @param format - Format to use
   * @returns Today's date as a formatted string
   */
  export const getFormattedToday = (format: string = 'MM/DD/YYYY'): string => {
    return formatDate(new Date(), format);
  };
  
  /**
   * Calculate the difference in days between two dates
   * @param date1 - First date
   * @param date2 - Second date (defaults to today)
   * @returns Number of days between the dates
   */
  export const getDaysDifference = (
    date1: Date | string,
    date2: Date | string = new Date()
  ): number => {
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
    
    // Check if dates are valid
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
      console.error('Invalid date(s) provided to getDaysDifference:', { date1, date2 });
      return 0;
    }
    
    // Set time to beginning of day to get accurate day count
    const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
    
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    return Math.floor((utc2 - utc1) / MS_PER_DAY);
  };