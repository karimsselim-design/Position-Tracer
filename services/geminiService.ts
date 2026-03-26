
import { GoogleGenAI, Type } from "@google/genai";

export interface AnalysisResult {
  scenario: string;
  support: string[];
  resistance: string[];
  bias: string;
  confidence: number;
  signal: {
    entry: string;
    sl: string;
    tp: string;
  };
}

export interface AnalysisResponse {
  data: AnalysisResult | null;
  error?: {
    code: number;
    message: string;
    isQuotaExceeded: boolean;
  };
}

function extractJsonFromText(text: string): any {
  const cleanText = text.trim();
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    const jsonMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch (e2) {}
    }
    const start = cleanText.indexOf('{');
    const end = cleanText.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      try {
        return JSON.parse(cleanText.substring(start, end + 1));
      } catch (e3) {}
    }
    throw new Error("Terminal was unable to parse the AI signal cluster.");
  }
}

function parseGeminiError(error: any) {
  let code = 500;
  let message = error.message || "Institutional AI Cluster Error";
  let isQuotaExceeded = false;
  const errorStr = JSON.stringify(error).toLowerCase();
  const msgStr = (error.message || "").toLowerCase();

  if (errorStr.includes('429') || errorStr.includes('resource_exhausted') || errorStr.includes('quota')) {
    code = 429;
    message = "Public Terminal Quota Exhausted. Node cluster locked for 60s.";
    isQuotaExceeded = true;
  }
  return { code, message, isQuotaExceeded };
}

export async function getMarketAnalysisFromImages(images: string[], context: string, thinkingBudget: number = 32768): Promise<AnalysisResponse> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const imageParts = images.map(base64 => ({
    inlineData: {
      data: base64.split(',')[1] || base64,
      mimeType: 'image/png',
    },
  }));

  const textPart = {
    text: `Act as a senior institutional technical analyst. Your task is to analyze the provided chart screenshots for ${context}. 
    
    1. MARKET STRUCTURE: Deeply analyze current trend, order blocks, and liquidity pools.
    2. LEVELS: Provide 3 levels of support and resistance.
    3. TRADE SIGNAL: Provide a specific Entry, Stop Loss, and Take Profit.
    4. BIAS: State clearly if Bullish, Bearish, or Neutral.
    
    MANDATORY: Return ONLY valid JSON that matches the following schema exactly.`
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: { parts: [...imageParts, textPart] },
      config: {
        thinkingConfig: { thinkingBudget: thinkingBudget },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scenario: { type: Type.STRING, description: "Detailed market context and reasoning" },
            support: { type: Type.ARRAY, items: { type: Type.STRING } },
            resistance: { type: Type.ARRAY, items: { type: Type.STRING } },
            bias: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            signal: {
              type: Type.OBJECT,
              properties: {
                entry: { type: Type.STRING },
                sl: { type: Type.STRING },
                tp: { type: Type.STRING }
              },
              required: ["entry", "sl", "tp"]
            }
          },
          required: ["scenario", "support", "resistance", "bias", "confidence", "signal"]
        }
      }
    });
    
    if (response && response.text) {
      return { data: extractJsonFromText(response.text) as AnalysisResult };
    }
  } catch (error: any) {
    const parsed = parseGeminiError(error);
    return { data: null, error: parsed };
  }

  return { data: null, error: { code: 500, message: "AI Node Connection Failure", isQuotaExceeded: false } };
}
