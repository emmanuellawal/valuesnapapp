/**
 * eBay Search URL Utilities
 * 
 * Provides functions to build eBay search URLs for manual fallback
 * when AI identification fails.
 */

const EBAY_SEARCH_BASE_URL = 'https://www.ebay.com/sch/i.html';

/**
 * Build an eBay search URL with optional query parameters.
 * 
 * @param query - Optional search query to pre-fill
 * @returns eBay search URL
 * 
 * @example
 * ```typescript
 * // Basic search page
 * buildEbaySearchUrl(); // "https://www.ebay.com/sch/i.html"
 * 
 * // Pre-filled search
 * buildEbaySearchUrl("Canon AE-1"); // "https://www.ebay.com/sch/i.html?_nkw=Canon+AE-1"
 * ```
 */
export function buildEbaySearchUrl(query?: string): string {
  if (!query || query.trim() === '') {
    return EBAY_SEARCH_BASE_URL;
  }
  
  // Encode the query for URL safety
  const encodedQuery = encodeURIComponent(query.trim());
  
  return `${EBAY_SEARCH_BASE_URL}?_nkw=${encodedQuery}`;
}

/**
 * Build an eBay sold items search URL.
 * Useful for users who want to see recent sold prices manually.
 * 
 * @param query - Optional search query to pre-fill
 * @returns eBay sold items search URL
 * 
 * @example
 * ```typescript
 * buildEbaySoldSearchUrl("vintage camera"); 
 * // "https://www.ebay.com/sch/i.html?_nkw=vintage+camera&LH_Complete=1&LH_Sold=1"
 * ```
 */
export function buildEbaySoldSearchUrl(query?: string): string {
  const baseUrl = buildEbaySearchUrl(query);
  
  // Add sold/completed filters
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}LH_Complete=1&LH_Sold=1`;
}
