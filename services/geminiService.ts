
import { GoogleGenAI, Type } from "@google/genai";
import { WeatherData } from "../types";

// Initialize Gemini API client using the environment variable directly as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fetchSeosanWeather = async (): Promise<WeatherData> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "대한민국 충청남도 서산시의 현재 날씨, 향후 6시간 시간별 예보, 그리고 향후 5일간의 주간 예보를 가져와줘. 모든 텍스트(상태, 요일 등)는 한국어로 작성해줘. JSON 구조로 반환해.",
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          temp: { type: Type.NUMBER },
          condition: { type: Type.STRING },
          high: { type: Type.NUMBER },
          low: { type: Type.NUMBER },
          humidity: { type: Type.NUMBER },
          windSpeed: { type: Type.NUMBER },
          airQuality: { type: Type.STRING },
          hourly: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.STRING },
                temp: { type: Type.NUMBER },
                condition: { type: Type.STRING }
              }
            }
          },
          weekly: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.STRING },
                low: { type: Type.NUMBER },
                high: { type: Type.NUMBER },
                condition: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });

  try {
    const data = JSON.parse(response.text || '{}');
    // Extract grounding citations as required by Google Search tool guidelines
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
      data.sources = groundingChunks
        .map((chunk: any) => chunk.web ? { uri: chunk.web.uri, title: chunk.web.title } : null)
        .filter(Boolean);
    }
    return data;
  } catch (e) {
    console.error("Failed to parse Gemini weather response", e);
    return getFallbackData();
  }
};

export const getBiorhythmInsight = async (scores: { physical: number, emotional: number, intellectual: number }): Promise<string> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `다음 바이오리듬 점수(신체: ${scores.physical}%, 감성: ${scores.emotional}%, 지성: ${scores.intellectual}%)를 바탕으로 사용자에게 격려가 되는 짧은 한마디(최대 2문장)를 한국어로 작성해줘.`,
  });
  return response.text.trim();
};

// Fixed missing icon properties by removing them from the interface since icons are derived from condition in the UI
const getFallbackData = (): WeatherData => ({
  temp: 24,
  condition: "맑음",
  high: 26,
  low: 18,
  humidity: 45,
  windSpeed: 3,
  airQuality: "좋음",
  hourly: [
    { time: "지금", temp: 24, condition: "맑음" },
    { time: "오후 1시", temp: 25, condition: "맑음" },
    { time: "오후 2시", temp: 25, condition: "흐림" },
    { time: "오후 3시", temp: 24, condition: "흐림" },
    { time: "오후 4시", temp: 23, condition: "구름조금" }
  ],
  weekly: [
    { day: "오늘", low: 18, high: 26, condition: "맑음" },
    { day: "화", low: 17, high: 24, condition: "흐림" },
    { day: "수", low: 15, high: 20, condition: "비" },
    { day: "목", low: 16, high: 23, condition: "구름조금" },
    { day: "금", low: 18, high: 27, condition: "맑음" }
  ]
});
