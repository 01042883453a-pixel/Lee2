
export interface HourlyForecast {
  time: string;
  temp: number;
  condition: string;
  // icon property removed as it is derived from condition in the component
}

export interface DailyForecast {
  day: string;
  low: number;
  high: number;
  condition: string;
  // icon property removed as it is derived from condition in the component
}

export interface WeatherData {
  temp: number;
  condition: string;
  high: number;
  low: number;
  humidity: number;
  windSpeed: number;
  airQuality: string;
  hourly: HourlyForecast[];
  weekly: DailyForecast[];
  // Added optional sources for grounding citations as required by Google Search tool guidelines
  sources?: { uri: string; title?: string }[];
}

export interface BiorhythmPoint {
  day: string;
  physical: number;
  emotional: number;
  intellectual: number;
}

export interface BiorhythmData {
  physical: number;
  emotional: number;
  intellectual: number;
  overall: number;
  insight: string;
  weeklyTrend: BiorhythmPoint[];
}
