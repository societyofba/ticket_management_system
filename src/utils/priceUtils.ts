/**
 * Price utility functions for CBA Forum Ticket Management
 */

/**
 * Extracts numeric digits from a price string that may contain currency symbols, commas, or descriptive text.
 * Examples:
 *   - "LKR 3,500" -> 3500
 *   - "Rs. 5,000 (VIP)" -> 5000
 *   - "USD 50" -> 50
 *   - "Complimentary" -> 0 (contains no digits)
 *   - "Free Ticket" -> 0
 *   - null / undefined / "" -> 0
 * 
 * @param priceStr The raw price string entered by admin or from DB
 * @returns The extracted integer, or 0 if no digits or empty
 */
export function extractPriceNumber(priceStr: string | null | undefined): number {
  if (!priceStr || !priceStr.trim()) return 0
  const digitsOnly = priceStr.replace(/[^0-9]/g, '')
  if (!digitsOnly) return 0
  const val = parseInt(digitsOnly, 10)
  return isNaN(val) ? 0 : val
}

/**
 * Formats a raw number as a display string with thousands separators.
 * e.g. 3500 -> "3,500"
 */
export function formatAmount(amount: number): string {
  return amount.toLocaleString()
}
