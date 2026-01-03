
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---
interface WeatherData {
  temp: number;
  condition: string;
  high: number;
  low: number;
  humidity: number;
  windSpeed: number;
  airQuality: string;
  weekly: { day: string; low: number; high: number; condition: string; }[];
  sources?: { uri: string; title?: string }[];
}

interface BiorhythmData {
  physical: number;
  emotional: number;
  intellectual: number;
  overall: number;
  insight: string;
  trend: { day: string; p: number; e: number; i: number; }[];
}

// --- Icons Helper ---
const ICON_MAP: Record<string, string> = {
  '맑음': 'wb_sunny',
  '흐림': 'cloud',
  '구름': 'partly_cloudy_day',
  '비': 'rainy',
  '눈': 'ac_unit',
  '번개': 'thunderstorm',
  '안개': 'foggy'
};

const getIcon = (condition: string) => {
  const match = Object.keys(ICON_MAP).find(key => condition.includes(key));
  return match ? ICON_MAP[match] : 'wb_sunny';
};

// --- API Client ---
const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const fetchWeatherData = async (): Promise<WeatherData> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "대한민국 충청남도 서산시의 현재 날씨와 이번 주 예보를 한국어 JSON으로 알려줘. 기온, 상태, 습도, 풍속, 대기질을 포함해야 해.",
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

  const data = JSON.parse(response.text || '{}');
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (chunks) {
    data.sources = chunks.map((c: any) => c.web ? { uri: c.web.uri, title: c.web.title } : null).filter(Boolean);
  }
  return data;
};

// --- Main App ---
const App = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [birthDate, setBirthDate] = useState('1995-01-01');
  const [insight, setInsight] = useState("데이터를 분석 중입니다...");

  // Biorhythm Calculation
  const biorhythm = useMemo((): BiorhythmData | null => {
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return null;

    const bTime = birth.getTime();
    const now = new Date().setHours(0, 0, 0, 0);
    const trend = [];
    const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];

    for (let j = 0; j < 7; j++) {
      const target = now + (j * 86400000);
      const diff = Math.floor((target - bTime) / 86400000);
      
      const p = Math.round((Math.sin(2 * Math.PI * diff / 23) + 1) * 50);
      const e = Math.round((Math.sin(2 * Math.PI * diff / 28) + 1) * 50);
      const i = Math.round((Math.sin(2 * Math.PI * diff / 33) + 1) * 50);
      
      trend.push({
        day: j === 0 ? "오늘" : dayLabels[new Date(target).getDay()],
        p, e, i
      });
    }

    const today = trend[0];
    const overall = Math.round((today.p + today.e + today.i) / 3);
    return { ...today, overall, insight, trend, physical: today.p, emotional: today.e, intellectual: today.i };
  }, [birthDate, insight]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const w = await fetchWeatherData();
        setWeather(w);

        // Generate AI Insight
        if (biorhythm) {
          const ai = getAIClient();
          const res = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `사용자의 오늘 바이오리듬(신체:${biorhythm.physical}%, 감성:${biorhythm.emotional}%, 지성:${biorhythm.intellectual}%)과 현재 서산 날씨(${w.condition}, ${w.temp}도)를 종합해서 오늘을 어떻게 보내면 좋을지 한국어로 아주 짧고 다정하게 한마디 해줘.`
          });
          setInsight(res.text || "오늘도 당신의 하루를 응원합니다!");
        }
      } catch (err: any) {
        console.error(err);
        if (!process.env.API_KEY) {
          setError("API 키가 설정되지 않았습니다. 환경 설정을 확인해주세요.");
        } else {
          setError("데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [birthDate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-white">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-lg font-bold animate-pulse">서산의 기운을 읽는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-white p-8">
        <div className="max-w-xs text-center space-y-6">
          <span className="material-symbols-outlined text-6xl text-rose-500">warning</span>
          <p className="font-bold text-xl leading-tight">{error}</p>
          <p className="text-slate-400 text-sm">메모장에서 실행 중이라면 코드를 열어 API 키가 올바르게 입력되었는지 확인하세요.</p>
          <button onClick={() => window.location.reload()} className="w-full py-3 bg-primary rounded-2xl font-black">다시 시도</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center min-h-screen bg-slate-950 font-sans text-white overflow-x-hidden selection:bg-primary/30">
      <div className="w-full max-w-md bg-background min-h-screen p-6 space-y-8 relative no-scrollbar">
        
        {/* Header */}
        <header className="flex justify-between items-center px-2">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Live Report</span>
            <h1 className="text-2xl font-black tracking-tighter">서산시, 충남</h1>
          </div>
          <div className="bg-surface p-2.5 rounded-2xl border border-white/5">
            <span className="material-symbols-outlined text-primary">location_on</span>
          </div>
        </header>

        {/* Hero Card */}
        {weather && biorhythm && (
          <section className="relative rounded-[3rem] bg-gradient-to-br from-primary via-blue-600 to-indigo-900 p-8 shadow-[0_20px_50px_rgba(19,164,236,0.3)] overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <div className="flex items-baseline">
                  <span className="text-7xl font-black tracking-tighter">{Math.round(weather.temp)}</span>
                  <span className="text-3xl font-bold ml-1">°</span>
                </div>
                <p className="text-xl font-bold mt-1 opacity-90">{weather.condition}</p>
                <div className="flex gap-4 mt-4 text-xs font-black bg-black/10 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
                  <span>H: {weather.high}°</span>
                  <span>L: {weather.low}°</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[100px] leading-none drop-shadow-2xl animate-float" style={{ fontVariationSettings: "'FILL' 1" }}>
                {getIcon(weather.condition)}
              </span>
            </div>
            
            <div className="mt-10 pt-6 border-t border-white/10 flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">오늘의 에너지 지수</p>
                <p className="text-2xl font-black">{biorhythm.overall}%</p>
              </div>
              <div className="h-12 w-12 rounded-full border-4 border-white/20 border-t-white flex items-center justify-center animate-spin-slow">
                <span className="material-symbols-outlined text-sm">bolt</span>
              </div>
            </div>
          </section>
        )}

        {/* Stats Grid */}
        {weather && (
          <section className="grid grid-cols-3 gap-3">
            <StatCard icon="water_drop" label="습도" value={`${weather.humidity}%`} />
            <StatCard icon="air" label="풍속" value={`${weather.windSpeed}m/s`} />
            <StatCard icon="blur_on" label="대기질" value={weather.airQuality} />
          </section>
        )}

        {/* Biorhythm Section */}
        {biorhythm && (
          <section className="bg-surface rounded-[2.5rem] p-7 border border-white/5 space-y-8 shadow-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-black tracking-tight">바이오리듬 분석</h2>
              <div className="flex gap-2.5">
                <Legend dot="bg-rose-400" text="신체" />
                <Legend dot="bg-cyan-400" text="감성" />
                <Legend dot="bg-amber-400" text="지성" />
              </div>
            </div>

            {/* SVG Chart */}
            <div className="h-40 w-full relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4" />
                {/* Physical */}
                <polyline fill="none" stroke="#fb7185" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" 
                  points={biorhythm.trend.map((t, i) => `${i * 50},${100 - t.p}`).join(' ')} className="drop-shadow-[0_4px_10px_rgba(251,113,133,0.3)]" />
                {/* Emotional */}
                <polyline fill="none" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" 
                  points={biorhythm.trend.map((t, i) => `${i * 50},${100 - t.e}`).join(' ')} className="drop-shadow-[0_4px_10px_rgba(34,211,238,0.3)]" />
                {/* Intellectual */}
                <polyline fill="none" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" 
                  points={biorhythm.trend.map((t, i) => `${i * 50},${100 - t.i}`).join(' ')} className="drop-shadow-[0_4px_10px_rgba(251,191,36,0.3)]" />
              </svg>
              <div className="flex justify-between mt-4">
                {biorhythm.trend.map((t, i) => (
                  <span key={i} className={`text-[10px] font-black ${i === 0 ? 'text-primary' : 'text-slate-500'}`}>{t.day}</span>
                ))}
              </div>
            </div>

            {/* AI Insight Box */}
            <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/10 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-primary group-hover:w-2 transition-all"></div>
              <p className="text-[13px] leading-relaxed text-blue-100 font-medium italic">
                "{biorhythm.insight}"
              </p>
            </div>

            {/* Date Picker */}
            <div className="pt-4 space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">나의 생일 설정</label>
              <input 
                type="date" 
                value={birthDate} 
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-slate-900 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer" 
              />
            </div>
          </section>
        )}

        {/* Weekly Forecast */}
        {weather && (
          <section className="space-y-4 px-2">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Weekly Forecast</h3>
            <div className="bg-surface rounded-[2.5rem] border border-white/5 overflow-hidden">
              {weather.weekly.map((day, i) => (
                <div key={i} className="flex items-center justify-between p-5 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                  <span className="text-sm font-black w-14">{day.day}</span>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {getIcon(day.condition)}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 w-16 truncate">{day.condition}</span>
                  </div>
                  <div className="flex gap-4 w-24 justify-end">
                    <span className="text-sm font-black">{day.high}°</span>
                    <span className="text-sm font-bold text-slate-500">{day.low}°</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Sources & Footer */}
        {weather?.sources && (
          <footer className="opacity-20 hover:opacity-100 transition-opacity duration-500 pt-8 pb-12 px-2">
            <p className="text-[10px] font-black uppercase tracking-widest mb-3">Data Verified By</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {weather.sources.map((s, i) => (
                <a key={i} href={s.uri} target="_blank" className="text-[9px] underline font-bold hover:text-primary transition-colors">
                  {s.title || 'Weather Data'}
                </a>
              ))}
            </div>
          </footer>
        )}
      </div>
      
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-spin-slow { animation: spin 8s linear infinite; }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <div className="bg-surface p-5 rounded-[2rem] border border-white/5 flex flex-col items-center gap-2.5 transition-transform hover:scale-105">
    <span className="material-symbols-outlined text-primary">{icon}</span>
    <div className="text-center">
      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">{label}</p>
      <p className="text-xs font-black">{value}</p>
    </div>
  </div>
);

const Legend = ({ dot, text }: { dot: string; text: string }) => (
  <div className="flex items-center gap-1.5">
    <div className={`w-2 h-2 rounded-full ${dot} shadow-sm`}></div>
    <span className="text-[10px] font-black text-slate-400">{text}</span>
  </div>
);

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
