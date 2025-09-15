/**
 * Converts Persian text to a URL-friendly SKU format
 * Replaces spaces and special characters with dashes while keeping Persian characters
 */
export function generateSKU(name: string, brand?: string): string {
  // Clean text while preserving Persian characters
  const cleanText = (text: string): string => {
    return text
      .trim()
      .replace(
        /[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\w\s-]/g,
        ""
      ) // Keep Persian/Arabic chars, word chars, spaces, and dashes
      .replace(/\s+/g, "-") // Replace spaces with dashes
      .replace(/-+/g, "-") // Replace multiple dashes with single dash
      .replace(/^-|-$/g, ""); // Remove leading/trailing dashes
  };

  // Generate SKU parts
  const namePart = cleanText(name);
  const brandPart = brand ? cleanText(brand) : "";

  // Combine name and brand with dash
  if (brandPart) {
    return `${namePart}-${brandPart}`;
  }

  return namePart;
}

/**
 * Generates a unique SKU by appending a number if needed
 */
export async function generateUniqueSKU(
  name: string,
  brand: string | undefined,
  existingSKUs: string[],
  baseSKU?: string
): Promise<string> {
  const base = baseSKU || generateSKU(name, brand);
  let sku = base;
  let counter = 1;

  while (existingSKUs.includes(sku)) {
    sku = `${base}-${counter}`;
    counter++;
  }

  return sku;
}
