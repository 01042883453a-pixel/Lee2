
import React, { useState, useEffect } from 'react';
import { WeatherData, BiorhythmData, BiorhythmPoint } from './types';
import { fetchSeosanWeather, getBiorhythmInsight } from './services/geminiService';
import { getIconForCondition } from './constants';

const App: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [birthDate, setBirthDate] = useState<string>('1990-01-01');
  const [biorhythm, setBiorhythm] = useState<BiorhythmData>({
    physical: 0,
    emotional: 0,
    intellectual: 0,
    overall: 0,
    insight: "",
    weeklyTrend: []
  });

  const calculateScores = (diffDays: number) => {
    const physical = Math.round((Math.sin(2 * Math.PI * diffDays / 23) + 1) * 50);
    const emotional = Math.round((Math.sin(2 * Math.PI * diffDays / 28) + 1) * 50);
    const intellectual = Math.round((Math.sin(2 * Math.PI * diffDays / 33) + 1) * 50);
    return { physical, emotional, intellectual };
  };

  const calculateBiorhythms = (birthday: string): BiorhythmData => {
    const birth = new Date(birthday).getTime();
    const todayDate = new Date();
    const todayStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate()).getTime();
    
    const weeklyTrend: BiorhythmPoint[] = [];
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

    for (let i = 0; i < 7; i++) {
      const targetDate = new Date(todayStart + (i * 1000 * 60 * 60 * 24));
      const diffDays = Math.floor((targetDate.getTime() - birth) / (1000 * 60 * 60 * 24));
      const scores = calculateScores(diffDays);
      weeklyTrend.push({
        day: i === 0 ? "오늘" : dayNames[targetDate.getDay()],
        ...scores
      });
    }

    const todayScores = weeklyTrend[0];
    const overall = Math.round((todayScores.physical + todayScores.emotional + todayScores.intellectual) / 3);

    return {
      ...todayScores,
      overall,
      insight: "",
      weeklyTrend
    };
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const weatherData = await fetchSeosanWeather();
        setWeather(weatherData);
        
        const bioBase = calculateBiorhythms(birthDate);
        const insight = await getBiorhythmInsight({
          physical: bioBase.physical,
          emotional: bioBase.emotional,
          intellectual: bioBase.intellectual
        });
        
        setBiorhythm({
          ...bioBase,
          insight: insight || "오늘도 활기찬 하루 되세요!"
        });
      } catch (error) {
        console.error("Error loading app data", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [birthDate]);

  if (loading || !weather) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm font-medium animate-pulse italic">서산의 날씨를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center min-h-screen bg-slate-950">
      <div className="relative flex w-full max-w-md flex-col bg-background overflow-x-hidden shadow-2xl">
        
        {/* Header */}
        <header className="flex items-center p-4 pt-10 pb-4 justify-between sticky top-0 z-50 bg-background/80 backdrop-blur-md">
          <button className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-[24px]">near_me</span>
          </button>
          <div className="flex flex-col items-center text-center">
            <h2 className="text-lg font-bold leading-tight">충청남도 서산시</h2>
            <span className="text-xs font-medium text-slate-400">대한민국</span>
          </div>
          <button className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto no-scrollbar pb-10 space-y-6">
          
          {/* Hero Weather Section */}
          <section className="px-4">
            <div className="relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] min-h-[360px] shadow-2xl bg-gradient-to-b from-primary/60 to-background p-6">
              <div className="flex justify-end">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-2 border border-white/20">
                  <span className="material-symbols-outlined text-primary text-[18px]">bolt</span>
                  <span className="text-xs font-extrabold text-white">에너지: {biorhythm.overall}%</span>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center gap-2 pb-6">
                <span className="material-symbols-outlined text-white text-[84px] drop-shadow-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {getIconForCondition(weather.condition)}
                </span>
                <div className="flex flex-col items-center">
                  <h1 className="text-white text-[80px] font-extrabold leading-none tracking-tighter drop-shadow-lg">
                    {Math.round(weather.temp)}°
                  </h1>
                  <p className="text-white text-2xl font-bold mt-2">{weather.condition}</p>
                  <div className="flex items-center gap-3 mt-2 text-slate-200 font-semibold">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">arrow_upward</span> {weather.high}°</span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">arrow_downward</span> {weather.low}°</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Stats */}
          <section className="grid grid-cols-3 gap-3 px-4">
            <StatCard icon="water_drop" label="습도" value={`${weather.humidity}%`} fill />
            <StatCard icon="air" label="풍속" value={`${weather.windSpeed} m/s`} />
            <StatCard icon="blur_on" label="대기질" value={weather.airQuality} color="text-green-400" />
          </section>

          {/* Hourly */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-5">
              <h3 className="text-lg font-extrabold">시간별 예보</h3>
              <button className="text-primary text-sm font-bold">전체보기</button>
            </div>
            <div className="flex overflow-x-auto gap-3 px-4 pb-2 no-scrollbar snap-x">
              {weather.hourly.map((item, idx) => (
                <div 
                  key={idx}
                  className={`snap-start flex flex-col items-center justify-between min-w-[75px] h-[120px] p-4 rounded-3xl border transition-all ${idx === 0 ? 'bg-primary border-primary shadow-lg shadow-primary/20 text-white' : 'bg-surface border-white/5 text-slate-400'}`}
                >
                  <span className={`text-[11px] font-bold ${idx === 0 ? 'text-white' : 'text-slate-400'}`}>{item.time}</span>
                  <span className={`material-symbols-outlined text-[28px] ${idx === 0 ? 'text-white' : 'text-white'}`} style={idx === 0 ? { fontVariationSettings: "'FILL' 1" } : {}}>
                    {getIconForCondition(item.condition)}
                  </span>
                  <span className="text-lg font-black text-white">{Math.round(item.temp)}°</span>
                </div>
              ))}
            </div>
          </section>

          {/* Weekly */}
          <section className="px-4 space-y-4">
            <h3 className="text-lg font-extrabold">주간 예보</h3>
            <div className="bg-surface rounded-[2rem] p-6 border border-white/5 space-y-6">
              {weather.weekly.map((day, idx) => (
                <div key={idx} className="grid grid-cols-[4rem_2rem_1fr] items-center gap-4">
                  <span className="font-bold text-white text-sm">{day.day}</span>
                  <div className="flex justify-center">
                    <span className="material-symbols-outlined text-[24px] text-yellow-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {getIconForCondition(day.condition)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 w-full">
                    <span className="text-xs font-bold text-slate-500 w-6 text-right">{day.low}°</span>
                    <div className="relative flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="absolute h-full rounded-full bg-gradient-to-r from-primary to-orange-400" style={{ left: '20%', right: '15%' }}></div>
                    </div>
                    <span className="text-xs font-bold text-white w-6 text-right">{day.high}°</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Biorhythm Section with Chart */}
          <section className="px-4">
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#1e1b4b] to-[#312e81] p-6 shadow-xl border border-white/5">
              <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-300">바이오리듬 리포트</p>
                    <h3 className="text-xl font-extrabold text-white mt-1">오늘의 컨디션 가이드</h3>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm">
                    <span className="material-symbols-outlined text-white text-[24px]">insights</span>
                  </div>
                </div>
                
                <p className="text-sm font-medium text-indigo-100 leading-relaxed bg-white/5 p-4 rounded-2xl italic border border-white/5">
                  "{biorhythm.insight}"
                </p>

                {/* Weekly Trend Line Chart (SVG) */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-indigo-300">주간 변동 추이</p>
                    <div className="flex gap-3">
                      <LegendItem color="bg-rose-400" label="신체" />
                      <LegendItem color="bg-cyan-400" label="감성" />
                      <LegendItem color="bg-amber-400" label="지성" />
                    </div>
                  </div>
                  <div className="w-full h-32 relative pt-2">
                    <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                      {/* Grid Lines */}
                      <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4" />
                      
                      {/* Physical Line */}
                      <polyline
                        fill="none"
                        stroke="#fb7185"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={biorhythm.weeklyTrend.map((p, i) => `${i * 50},${100 - p.physical}`).join(' ')}
                      />
                      {/* Emotional Line */}
                      <polyline
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={biorhythm.weeklyTrend.map((p, i) => `${i * 50},${100 - p.emotional}`).join(' ')}
                      />
                      {/* Intellectual Line */}
                      <polyline
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={biorhythm.weeklyTrend.map((p, i) => `${i * 50},${100 - p.intellectual}`).join(' ')}
                      />
                    </svg>
                    <div className="flex justify-between mt-2">
                      {biorhythm.weeklyTrend.map((p, i) => (
                        <span key={i} className={`text-[10px] font-bold ${i === 0 ? 'text-white' : 'text-indigo-300'}`}>
                          {p.day}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <p className="text-[10px] font-bold text-indigo-300 mb-2">생년월일 변경</p>
                  <input 
                    type="date" 
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
              </div>
              
              <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-[80px]"></div>
            </div>
          </section>

          {/* Grounding Sources - Mandatory for Google Search tool transparency */}
          {weather.sources && weather.sources.length > 0 && (
            <section className="px-4 space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">출처 및 관련 정보</h4>
              <div className="flex flex-wrap gap-2">
                {weather.sources.map((source, idx) => (
                  <a 
                    key={idx} 
                    href={source.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] bg-surface hover:bg-white/10 border border-white/5 rounded-full px-3 py-1.5 text-slate-300 transition-colors inline-block"
                  >
                    {source.title || '출처 ' + (idx + 1)}
                  </a>
                ))}
              </div>
            </section>
          )}

        </main>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: string; label: string; value: string; color?: string; fill?: boolean }> = ({ icon, label, value, color = "text-white", fill = false }) => (
  <div className="flex flex-col gap-3 rounded-[2rem] p-4 bg-surface border border-white/5 shadow-sm">
    <div className="flex items-center gap-2 text-primary">
      <span className="material-symbols-outlined text-[18px]" style={fill ? { fontVariationSettings: "'FILL' 1" } : {}}>{icon}</span>
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">{label}</p>
    </div>
    <p className={`text-base font-black leading-tight ${color}`}>{value}</p>
  </div>
);

const LegendItem: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div className="flex items-center gap-1.5">
    <div className={`w-1.5 h-1.5 rounded-full ${color}`}></div>
    <span className="text-[10px] font-bold text-indigo-200">{label}</span>
  </div>
);

export default App;
