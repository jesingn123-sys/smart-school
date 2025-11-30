import { GoogleGenAI, Type } from '@google/genai';
import { OCRResult, Student } from '../types';
import { OCR_PROMPT } from '../constants';

/**
 * Converts a Blob or File object to a Base64 string.
 * @param blob The Blob or File to convert.
 * @returns A Promise that resolves with the Base64 string.
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result.split(',')[1]); // Extract base64 part
      } else {
        reject(new Error('Failed to read blob as string'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Performs OCR on an image using the Gemini Vision model to extract student details.
 * @param imageDataUrl The Data URL (Base64 string) of the image.
 * @param mimeType The MIME type of the image (e.g., 'image/jpeg', 'image/png').
 * @returns A Promise that resolves with the extracted OCRResult.
 */
export const performOcr = async (imageDataUrl: string, mimeType: string): Promise<OCRResult> => {
  // Ensure the API key is present before initializing
  if (!process.env.API_KEY) {
    throw new Error("Gemini API Key is not configured. Please set process.env.API_KEY.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: OCR_PROMPT },
          {
            inlineData: {
              mimeType: mimeType,
              data: imageDataUrl.split(',')[1], // Remove "data:image/jpeg;base64," prefix
            },
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            father_name: { type: Type.STRING },
            school_name: { type: Type.STRING },
            class: { type: Type.STRING },
            section: { type: Type.STRING },
            roll_number: { type: Type.STRING },
            gender: { type: Type.STRING },
          },
        },
      },
    });

    const jsonStr = response.text.trim();
    const result: OCRResult = JSON.parse(jsonStr);

    // Basic validation and fallback for nulls
    return {
      name: result.name || null,
      father_name: result.father_name || null,
      school_name: result.school_name || null,
      class: result.class || null,
      section: result.section || null,
      roll_number: result.roll_number || null,
      gender: result.gender || null,
    };
  } catch (error) {
    console.error('OCR failed:', error);
    // Return nulls if OCR completely fails or parsing fails
    return {
      name: null,
      father_name: null,
      school_name: null,
      class: null,
      section: null,
      roll_number: null,
      gender: null,
    };
  }
};