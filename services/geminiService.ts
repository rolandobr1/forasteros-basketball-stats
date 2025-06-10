

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Ensure API_KEY is accessed from environment variables
// In a real deployed app, this would be set on the server or build environment.
// For client-side, this is often a placeholder or requires a backend proxy for security.
// For this exercise, we assume process.env.API_KEY is available as per instructions.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("Gemini API key not found. Please set the API_KEY environment variable.");
  // Potentially disable AI features or show a warning to the user in a real app
}

const ai = new GoogleGenAI({ apiKey: API_KEY || "MISSING_API_KEY" }); // Fallback to prevent crash if undefined

// AI Summary functionality has been removed.
// The generateGameSummary function and its helpers were deleted from here.
// Keeping GoogleGenAI client initialization in case other AI features are added later.