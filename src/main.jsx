import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Search, MapPin, Navigation, Wind, Droplets, Thermometer, Sun, CloudSun, Cloud, CloudRain, CloudSnow, CloudLightning, Eye, Sunrise, Sunset, LocateFixed, ChevronDown, LoaderCircle, RefreshCw, CalendarDays, Gauge, X, Clock3 } from 'lucide-react';
import './styles.css';

const DEFAULT_CITY = { name: 'London', country: 'United Kingdom', admin1: 'England', latitude: 51.5072, longitude: -0.1276, timezone: 'Europe/London' };
const weatherInfo = (code) => {
  if (code === 0) return ['Clear sky', 'sun'];
  if ([1, 2].includes(code)) return ['Mostly clear', 'partly'];
  if (code === 3) return ['Overcast', 'cloud'];
  if ([45, 48].includes(code)) return ['Foggy', 'fog'];
  if ([51, 53, 55, 56, 57].includes(code)) return ['Drizzle', 'rain'];
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return ['Rain showers', 'rain'];
  if ([71, 73, 75, 77, 85, 86].includes(code)) return ['Snowfall', 'snow'];
  if ([95, 96, 99].includes(code)) return ['Thunderstorm', 'storm'];
  return ['Partly cloudy', 'partly'];
};
function WeatherGlyph({ code, size = 36, className = '' }) {
  const [, kind] = weatherInfo(code);
  const props = { size, strokeWidth: 1.65, className: `weather-glyph ${className}` };
  if (kind === 'sun') return <Sun {...props} />;
  if (kind === 'partly') return <CloudSun {...props} />;
  if (kind === 'cloud' || kind === 'fog') return <Cloud {...props} />;
  if (kind === 'rain') return <CloudRain {...props} />;
  if (kind === 'snow') return <CloudSnow {...props} />;
  return <CloudLightning {...props} />;
}
const round = (n) => Math.round(n);
function App() {
  const [place, setPlace] = useState(DEFAULT_CITY);
  const [weather, setWeather] = useState(null);
  const [unit, setUnit] = useState('C');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);
  const temp = useCallback((c) => unit === 'C' ? round(c) : round(c * 9 / 5 + 32), [unit]);
  const wind = useCallback((kmh) => unit === 'C' ? round(kmh / 3.6) : round(kmh / 1.609344), [unit]);
  const unitLabel = unit === 'C' ? '°C' : '°F';
  const windLabel = unit === 'C' ? 'm/s' : 'mph';

  const loadWeather = useCallback(async (selectedPlace, showLoader = true) => {
    if (!selectedPlace) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController(); abortRef.current = controller;
    if (showLoader) setLoading(true);
    setRefreshing(true); setError(''); setNotice('');
    try {
      const params = new URLSearchParams({ latitude: selectedPlace.latitude, longitude: selectedPlace.longitude, current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m', hourly: 'temperature_2m,precipitation_probability,weather_code', daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max', timezone: selectedPlace.timezone || 'auto', forecast_days: '7', wind_speed_unit: 'kmh', temperature_unit: 'celsius' });
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: controller.signal });
      if (!response.ok) throw new Error('Weather data is temporarily unavailable. Please try again.');
      const data = await response.json();
      if (!data.current || !data.daily) throw new Error('We could not find weather data for this location. Try another city.');
      setWeather(data); setPlace(selectedPlace); setLastUpdated(new Date());
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message || 'Could not connect to the weather service. Check your connection and try again.');
    } finally { if (!controller.signal.aborted) { setLoading(false); setRefreshing(false); } }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          if (cancelled) return;
          try {
            const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&language=en&format=json`;
            const res = await fetch(url); const data = await res.json(); const p = data.results?.[0];
            const currentPlace = p ? { ...p, name: p.name, latitude: pos.coords.latitude, longitude: pos.coords.longitude, timezone: p.timezone || 'auto' } : { name: 'Your location', latitude: pos.coords.latitude, longitude: pos.coords.longitude, timezone: 'auto' };
            loadWeather(currentPlace);
          } catch { loadWeather(DEFAULT_CITY); setNotice('Location lookup failed, so London is shown instead.'); }
        }, () => { if (!cancelled) { loadWeather(DEFAULT_CITY); setNotice('Location access is off. Showing London by default.'); } }, { timeout: 7000, maximumAge: 300000 });
      } else loadWeather(DEFAULT_CITY);
    };
    start(); return () => { cancelled = true; if (debounceRef.current) clearTimeout(debounceRef.current); if (abortRef.current) abortRef.current.abort(); };
  }, [loadWeather]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setSuggestions([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`);
        if (!res.ok) throw new Error('search');
        const data = await res.json(); setSuggestions(data.results || []); setSearchOpen(true);
      } catch { setSuggestions([]); }
      finally { setSearching(false); }
    }, 280);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    const close = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false); };
    document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close);
  }, []);

  const selectPlace = (p) => {
    const selected = { ...p, timezone: p.timezone || 'auto' };
    setPlace(selected); setQuery(''); setSuggestions([]); setSearchOpen(false); loadWeather(selected);
  };
  const doSearch = async (e) => {
    e?.preventDefault();
    if (suggestions.length) { selectPlace(suggestions[0]); return; }
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=1&language=en&format=json`);
      const data = await res.json();
      if (data.results?.[0]) selectPlace(data.results[0]); else { setError('We couldn’t find that place. Check the spelling or try a city or postal code.'); setSearchOpen(false); }
    } catch { setError('Search is unavailable right now. Check your connection and try again.'); }
    finally { setSearching(false); }
  };
  const locateMe = () => {
    if (!navigator.geolocation) { setNotice('Location is not supported by this browser.'); return; }
    setLoading(true); setNotice('');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      let p = { name: 'Your location', latitude: pos.coords.latitude, longitude: pos.coords.longitude, timezone: 'auto' };
      try { const r = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${p.latitude}&longitude=${p.longitude}&language=en&format=json`); const d = await r.json(); if (d.results?.[0]) p = { ...d.results[0], latitude: p.latitude, longitude: p.longitude, timezone: d.results[0].timezone || 'auto' }; } catch {}
      loadWeather(p);
    }, () => { setLoading(false); setNotice('Could not access your location. Check browser permissions.'); }, { timeout: 7000 });
  };
  const current = weather?.current;
  const daily = weather?.daily;
  const hourly = weather?.hourly;
  const hourlyIndices = useMemo(() => {
    if (!hourly || !current) return [];
    const now = new Date(current.time).getTime();
    let start = hourly.time.findIndex(t => new Date(t).getTime() >= now - 3600000);
    if (start < 0) start = 0;
    return Array.from({ length: 8 }, (_, i) => start + i).filter(i => i < hourly.time.length);
  }, [hourly, current]);
  const chart = useMemo(() => {
    if (!hourlyIndices.length || !hourly) return null;
    const vals = hourlyIndices.map(i => hourly.temperature_2m[i]); const min = Math.min(...vals) - 2; const max = Math.max(...vals) + 2; const range = Math.max(1, max - min);
    const pts = vals.map((v, i) => ({ x: 14 + i * (272 / Math.max(1, vals.length - 1)), y: 76 - ((v - min) / range) * 55, v }));
    return { pts, path: pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' '), area: `M ${pts[0].x} 88 ${pts.map(p => `L ${p.x} ${p.y}`).join(' ')} L ${pts[pts.length - 1].x} 88 Z` };
  }, [hourly, hourlyIndices]);
  const localTime = () => {
    try { return new Intl.DateTimeFormat('en', { timeZone: weather?.timezone || place.timezone || 'auto', hour: 'numeric', minute: '2-digit' }).format(new Date()); } catch { return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
  };
  const localDate = () => {
    try { return new Intl.DateTimeFormat('en', { timeZone: weather?.timezone || place.timezone || 'auto', weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()); } catch { return new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }); }
  };
  const dayName = (date, index) => index === 0 ? 'Today' : new Date(`${date}T12:00:00`).toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' });
  const sunrise = daily?.sunrise?.[0] ? new Date(daily.sunrise[0]).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '--';
  const sunset = daily?.sunset?.[0] ? new Date(daily.sunset[0]).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '--';
  const backgroundKind = current ? weatherInfo(current.weather_code)[1] : 'partly';

  return <main className={`app-shell theme-${backgroundKind}`}>
    <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
    <header className="topbar">
      <a className="brand" href="#top" aria-label="SkyCast home"><span className="brand-mark"><CloudSun size={24}/></span><span>skycast<span className="brand-dot">.</span></span></a>
      <div className="header-caption"><span className="live-dot"/> LIVE WEATHER <span className="caption-divider">/</span> YOUR WORLD, AT A GLANCE</div>
      <div className="header-actions">
        <button className="icon-button locate-button" onClick={locateMe} aria-label="Use my location" title="Use my location"><LocateFixed size={18}/></button>
        <div className="unit-switch" aria-label="Temperature units"><button className={unit === 'C' ? 'selected' : ''} onClick={() => setUnit('C')}>°C</button><span>/</span><button className={unit === 'F' ? 'selected' : ''} onClick={() => setUnit('F')}>°F</button></div>
      </div>
    </header>

    <section className="intro-row" id="top">
      <div><p className="eyebrow">WEATHER, WITHOUT THE GUESSWORK</p><h1>A little more <span>in the know.</span></h1><p className="intro-copy">The forecast for wherever life takes you.</p></div>
      <div className="search-wrap" ref={searchRef}>
        <form className="search-box" onSubmit={doSearch}><Search size={19}/><input aria-label="Search city or postal code" value={query} onChange={e => { setQuery(e.target.value); setSearchOpen(true); }} onFocus={() => query.length > 1 && setSearchOpen(true)} placeholder="Search city or postal code..."/><button type="submit" aria-label="Search" disabled={searching}>{searching ? <LoaderCircle className="spin" size={18}/> : <span className="search-enter">↵</span>}</button></form>
        {searchOpen && query.trim().length > 1 && <div className="suggestions">{searching && <div className="suggestion-muted"><LoaderCircle className="spin" size={16}/> Finding places...</div>}{!searching && suggestions.length === 0 && <div className="suggestion-muted">No matching places yet</div>}{suggestions.map((p, i) => <button key={`${p.id}-${i}`} className="suggestion" onClick={() => selectPlace(p)}><MapPin size={16}/><span><strong>{p.name}</strong><small>{[p.admin1, p.country].filter(Boolean).join(', ')}</small></span><span className="suggestion-arrow">↗</span></button>)}</div>}
      </div>
    </section>

    {error && <div className="alert error-alert" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}
    {notice && <div className="alert notice-alert"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss notice"><X size={16}/></button></div>}

    <section className="dashboard-grid" aria-label="Weather dashboard">
      <article className="card hero-card">
        <div className="card-topline"><span className="section-label"><span className="tiny-sun">✳</span> CURRENT CONDITIONS</span><button className="refresh-button" onClick={() => loadWeather(place, false)} title="Refresh weather" aria-label="Refresh weather"><RefreshCw size={15} className={refreshing ? 'spin' : ''}/><span>Refresh</span></button></div>
        {loading && !current ? <div className="loading-state"><LoaderCircle size={28} className="spin"/><span>Reading the skies...</span></div> : current ? <>
          <div className="hero-location"><div><h2>{place.name || 'Your location'}{place.admin1 && place.name !== place.admin1 ? <span className="place-separator">, {place.admin1}</span> : null}</h2><p><MapPin size={14}/>{place.country || 'Local conditions'} <span className="location-dot">·</span> <Clock3 size={13}/> {localTime()} local</p></div><div className="hero-date">{localDate()}</div></div>
          <div className="current-weather"><div className="temperature-block"><div className="temperature">{temp(current.temperature_2m)}<span>{unitLabel}</span></div><div className="feels-like">Feels like {temp(current.apparent_temperature)}{unitLabel}</div><div className="condition-text">{weatherInfo(current.weather_code)[0]}</div></div><div className={`hero-weather-art art-${backgroundKind}`}><div className="art-halo"/><WeatherGlyph code={current.weather_code} size={102}/><div className="art-spark spark-one">✦</div><div className="art-spark spark-two">·</div><div className="art-spark spark-three">✧</div></div></div>
          <div className="hero-footer"><span><span className="live-dot"/> Live conditions</span><span>Updated {lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></div>
        </> : <div className="loading-state"><CloudSun size={28}/><span>Weather will appear here.</span></div>}
      </article>

      <article className="card stats-card"><div className="card-topline"><span className="section-label">AT A GLANCE</span><span className="muted-tag">RIGHT NOW</span></div><div className="stats-list">
        <div className="stat-row"><span className="stat-icon humidity"><Droplets size={19}/></span><div className="stat-copy"><span>Humidity</span><strong>{current ? `${current.relative_humidity_2m}%` : '--'}</strong></div><div className="stat-visual"><div className="mini-meter"><span style={{ width: `${current?.relative_humidity_2m || 0}%` }}/></div><small>Relative air moisture</small></div></div>
        <div className="stat-row"><span className="stat-icon wind"><Wind size={19}/></span><div className="stat-copy"><span>Wind speed</span><strong>{current ? wind(current.wind_speed_10m) : '--'} <small>{windLabel}</small></strong></div><div className="stat-visual wind-visual"><div className="wind-lines"><i/><i/><i/></div><small>{current?.wind_speed_10m > 25 ? 'Breezy conditions' : 'Gentle breeze'}</small></div></div>
        <div className="stat-row"><span className="stat-icon feels"><Thermometer size={19}/></span><div className="stat-copy"><span>Feels like</span><strong>{current ? `${temp(current.apparent_temperature)}${unitLabel}` : '--'}</strong></div><div className="stat-visual"><span className="feels-note">{current && current.apparent_temperature < current.temperature_2m - 2 ? 'Cooler than it looks' : current && current.apparent_temperature > current.temperature_2m + 2 ? 'Warmer than it looks' : 'Close to actual'}</span></div></div>
        <div className="stat-row"><span className="stat-icon uv"><Sun size={19}/></span><div className="stat-copy"><span>UV index</span><strong>{daily ? round(daily.uv_index_max[0]) : '--'} <small>/ 11</small></strong></div><div className="stat-visual"><div className="uv-meter"><span style={{ width: `${Math.min(100, (daily?.uv_index_max?.[0] || 0) / 11 * 100)}%` }}/></div><small>{daily ? daily.uv_index_max[0] < 3 ? 'Low exposure' : daily.uv_index_max[0] < 6 ? 'Moderate exposure' : 'High exposure' : 'UV exposure'}</small></div></div>
      </div></article>

      <article className="card hourly-card"><div className="card-topline"><div><span className="section-label">THE NEXT FEW HOURS</span><h3>Hourly outlook</h3></div><span className="subtle-label">TEMPERATURE</span></div>
        {hourly && chart ? <><div className="chart-wrap"><svg className="temperature-chart" viewBox="0 0 300 102" role="img" aria-label="Hourly temperature trend"><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8d9eff" stopOpacity=".24"/><stop offset="100%" stopColor="#8d9eff" stopOpacity="0"/></linearGradient></defs><path d={chart.area} fill="url(#chartFill)"/><path d={chart.path} fill="none" stroke="#9caeff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>{chart.pts.map((p, i) => <g key={i}><circle cx={p.x} cy={p.y} r="3.5" fill="#dbe2ff" stroke="#7b8cff" strokeWidth="1.5"/><text x={p.x} y={p.y - 11} textAnchor="middle" className="chart-value">{temp(p.v)}°</text></g>)}</svg></div><div className="hourly-ticks">{hourlyIndices.map(i => <div key={hourly.time[i]} className="hour-tick"><span>{i === hourlyIndices[0] ? 'Now' : new Date(hourly.time[i]).toLocaleTimeString([], { hour: 'numeric' }).replace(' ', '')}</span><WeatherGlyph code={hourly.weather_code[i]} size={17}/><small>{hourly.precipitation_probability?.[i] ? `${hourly.precipitation_probability[i]}%` : '—'}</small></div>)}</div><div className="chart-legend"><span><i/> Temperature</span><span><Droplets size={12}/> Rain chance</span></div></> : <div className="skeleton-line"/>}
      </article>

      <article className="card sun-card"><div className="card-topline"><span className="section-label">DAYLIGHT</span><span className="muted-tag">TODAY</span></div><div className="sun-arc"><div className="arc-line"/><div className="arc-sun"><Sun size={24}/></div><span className="arc-horizon"/></div><div className="sun-times"><div><span className="sun-icon sunrise"><Sunrise size={18}/></span><div><small>Sunrise</small><strong>{sunrise}</strong></div></div><div className="sunset-time"><span className="sun-icon sunset"><Sunset size={18}/></span><div><small>Sunset</small><strong>{sunset}</strong></div></div></div><p className="sun-caption">Make the most of the daylight.</p></article>

      <article className="card forecast-card"><div className="card-topline"><div><span className="section-label">PLAN AHEAD</span><h3>7-day forecast</h3></div><span className="forecast-unit">High / Low · {unitLabel}</span></div><div className="forecast-list">{daily ? daily.time.map((date, i) => <div className={`forecast-row ${i === 0 ? 'today-row' : ''}`} key={date}><span className="forecast-day">{dayName(date, i)}</span><WeatherGlyph code={daily.weather_code[i]} size={22}/><span className="forecast-condition">{weatherInfo(daily.weather_code[i])[0]}</span><div className="forecast-range"><strong>{temp(daily.temperature_2m_max[i])}°</strong><div className="range-track"><span style={{ left: `${Math.max(0, Math.min(85, (daily.temperature_2m_min[i] + 5) / 50 * 100))}%`, width: `${Math.max(15, Math.min(100, (daily.temperature_2m_max[i] - daily.temperature_2m_min[i]) / 40 * 100))}%` }}/></div><span>{temp(daily.temperature_2m_min[i])}°</span></div></div>) : <div className="loading-state small"><LoaderCircle size={20} className="spin"/>Loading forecast...</div>}</div></article>
    </section>
    <footer className="footer"><div className="footer-brand"><CloudSun size={17}/> <strong>skycast<span>.</span></strong><span>Weather that makes sense.</span></div><div className="footer-right"><span>Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a></span><span className="footer-separator">·</span><span>Last checked {lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></div></footer>
    <p className="disclaimer">Forecasts are estimates and may differ from local conditions. Location access is optional and handled by your browser.</p>
  </main>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
