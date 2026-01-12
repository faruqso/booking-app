/**
 * Google Fonts List
 * Popular fonts available via Google Fonts API
 */

export interface GoogleFont {
  name: string;
  family: string;
  category: string;
  weights: string[];
}

export const POPULAR_GOOGLE_FONTS: GoogleFont[] = [
  {
    name: "Inter",
    family: "Inter",
    category: "Sans-serif",
    weights: ["400", "500", "600", "700"],
  },
  {
    name: "Roboto",
    family: "Roboto",
    category: "Sans-serif",
    weights: ["400", "500", "700"],
  },
  {
    name: "Open Sans",
    family: "Open Sans",
    category: "Sans-serif",
    weights: ["400", "600", "700"],
  },
  {
    name: "Lato",
    family: "Lato",
    category: "Sans-serif",
    weights: ["400", "700"],
  },
  {
    name: "Montserrat",
    family: "Montserrat",
    category: "Sans-serif",
    weights: ["400", "600", "700"],
  },
  {
    name: "Poppins",
    family: "Poppins",
    category: "Sans-serif",
    weights: ["400", "500", "600", "700"],
  },
  {
    name: "Raleway",
    family: "Raleway",
    category: "Sans-serif",
    weights: ["400", "600", "700"],
  },
  {
    name: "Playfair Display",
    family: "Playfair Display",
    category: "Serif",
    weights: ["400", "700"],
  },
  {
    name: "Merriweather",
    family: "Merriweather",
    category: "Serif",
    weights: ["400", "700"],
  },
  {
    name: "Source Sans Pro",
    family: "Source Sans Pro",
    category: "Sans-serif",
    weights: ["400", "600", "700"],
  },
];

/**
 * Get Google Fonts URL for a font family
 */
export function getGoogleFontsUrl(fontFamily: string): string {
  const font = POPULAR_GOOGLE_FONTS.find((f) => f.family === fontFamily);
  if (!font) {
    return "";
  }
  
  const weights = font.weights.join(";");
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    fontFamily
  )}:wght@${weights}&display=swap`;
}

