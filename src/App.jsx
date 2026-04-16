import { useState, useEffect } from 'react';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

function App() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [data, setData] = useState({
    batteryLevel: 0,
    pvVoltage: 0,
    pvCurrent: 0,
    status: "Connecting...",
    user: "student@telkom.edu",
    bmsTemp: 34,
    boostTemp: 45
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "stations", "station_01"), (doc) => {
      if (doc.exists()) {
        setData(prev => ({ ...prev, ...doc.data() }));
      }
    });
    return () => unsub();
  }, []);

  const solarPower = (data.pvVoltage * data.pvCurrent).toFixed(0);

  return (
    <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-4 font-sans text-slate-200">
      
      {/* 1. RESPONSIVE CONTAINER: max-w-md on mobile, expands to max-w-4xl on PC */}
      <div className="w-full max-w-md md:max-w-4xl bg-[#1a1d24] rounded-3xl overflow-hidden shadow-2xl border border-slate-800/50 flex flex-col h-[750px] md:h-[600px]">
        
        {/* GLOBAL HEADER */}
        <div className="flex justify-between items-end px-6 pt-6 pb-4 border-b border-slate-800">
          <h1 className="text-xl font-semibold text-white tracking-wide">SunVolt Hub</h1>
          <div className="flex gap-4 text-xs font-medium tracking-wider text-slate-400">
            <div className="flex flex-col items-end">
              <span>BATTERY</span>
              <span className="text-white text-sm">{data.batteryLevel}%</span>
            </div>
            <div className="flex flex-col items-end hidden md:flex"> {/* Hidden on mobile, visible on PC */}
              <span>SOLAR</span>
              <span className="text-white text-sm">{solarPower}W</span>
            </div>
            <div className="flex flex-col items-end">
              <span>STATUS</span>
              <span className="text-emerald-400 text-sm font-bold uppercase">{data.status}</span>
            </div>
          </div>
        </div>

        {/* DYNAMIC CONTENT AREA */}
        <div className="flex-1 p-5 overflow-y-auto bg-[#14161a]">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'Overview' && (
            /* 2. RESPONSIVE LAYOUT: Stacks vertically on mobile, side-by-side on PC */
            <div className="h-full flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
              
              {/* Big Battery Graphic */}
              <div className="w-48 h-56 rounded-2xl border-4 border-slate-700 relative overflow-hidden bg-slate-800/50 flex items-end shrink-0">
                <div 
                  className="w-full bg-emerald-400 transition-all duration-1000 ease-out absolute bottom-0 flex items-center justify-center"
                  style={{ height: `${data.batteryLevel}%` }}
                >
                </div>
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <span className="text-4xl font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                    {data.batteryLevel}%
                  </span>
                </div>
              </div>

              {/* Active Session Card - Expands on PC */}
              <div className="bg-[#1a1d24] p-6 rounded-xl border border-slate-700/50 w-full md:w-auto flex-1">
                <div className="text-xs text-slate-400 mb-4 uppercase tracking-wider font-semibold">🔌 Active Session</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Port Status</div>
                    <div className="text-emerald-400 font-bold text-lg">OPEN</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Current Flow</div>
                    <div className="text-white font-bold text-lg">{data.pvCurrent}A</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">User Identification</div>
                    <div className="text-white font-bold text-sm truncate" title={data.user}>{data.user}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DIAGNOSTICS */}
          {activeTab === 'Diagnostics' && (
            /* 3. RESPONSIVE GRID: 2 columns on mobile, 4 columns on PC */
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 h-full content-start">
              <div className="bg-[#1a1d24] p-4 rounded-xl border border-slate-700/50">
                <div className="text-xs text-slate-400 mb-3 uppercase tracking-wider font-semibold">☀️ Solar</div>
                <div className="space-y-2">
                  <div><div className="text-[10px] text-slate-500">Voltage</div><div className="font-bold">{data.pvVoltage} V</div></div>
                  <div><div className="text-[10px] text-slate-500">Current</div><div className="font-bold">{data.pvCurrent} A</div></div>
                </div>
              </div>
              
              <div className="bg-[#1a1d24] p-4 rounded-xl border border-slate-700/50">
                <div className="text-xs text-slate-400 mb-3 uppercase tracking-wider font-semibold">🔋 BMS</div>
                <div className="space-y-2">
                  <div><div className="text-[10px] text-slate-500">Voltage</div><div className="font-bold">52.1 V</div></div>
                  <div><div className="text-[10px] text-slate-500">Internal Temp</div><div className={`font-bold transition-colors ${data.bmsTemp >= 50 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{data.bmsTemp} °C</div></div>
                </div>
              </div>

              <div className="bg-[#1a1d24] p-4 rounded-xl border border-slate-700/50">
                <div className="text-xs text-slate-400 mb-3 uppercase tracking-wider font-semibold">⚡ Booster</div>
                <div className="space-y-2">
                  <div><div className="text-[10px] text-slate-500">Boost V</div><div className="font-bold">54.6 V</div></div>
                  <div><div className="text-[10px] text-slate-500">Heatsink</div><div className={`font-bold transition-colors ${data.boostTemp >= 65 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{data.boostTemp} °C</div></div>
                </div>
              </div>

              <div className="bg-[#1a1d24] p-4 rounded-xl border border-slate-700/50 flex flex-col justify-between">
                <div>
                  <div className="text-xs text-slate-400 mb-3 uppercase tracking-wider font-semibold">📡 Net</div>
                  <div className="space-y-2">
                    <div><div className="text-[10px] text-slate-500">RSSI</div><div className="font-bold">-65 dBm</div></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LOGS & ANALYTICS */}
          {activeTab === 'Logs' && (
            <div className="h-full flex flex-col gap-4">
              <div className="bg-[#1a1d24] p-4 rounded-xl border border-slate-700/50 flex justify-between">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Generated</div>
                  <div className="text-emerald-400 font-bold text-xl md:text-3xl">1.25 kWh</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase">Dispensed</div>
                  <div className="text-blue-400 font-bold text-xl md:text-3xl">0.80 kWh</div>
                </div>
              </div>
              <div className="flex-1 bg-[#0b0c0f] rounded-xl border border-slate-800 p-3 font-mono text-[10px] md:text-xs text-slate-500 overflow-y-auto space-y-1">
                <p>[12:08:19 AM] Voltage Stable</p>
                <p>[12:08:22 AM] Heartbeat: OK</p>
                <p className="text-emerald-400">[12:08:40 AM] Firebase Sync Success</p>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER CONTROLS */}
        <div className="bg-[#1a1d24] p-4 border-t border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Dropdown for Mobile, Horizontal Tabs for PC */}
          <div className="w-full md:w-auto">
            <select 
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full md:hidden bg-[#0f1115] border border-slate-700 text-white text-sm rounded-lg p-2"
            >
              <option value="Overview">Overview</option>
              <option value="Diagnostics">Diagnostics</option>
              <option value="Logs">Logs & Analytics</option>
            </select>
            
            <div className="hidden md:flex gap-2">
              {['Overview', 'Diagnostics', 'Logs'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:bg-slate-800 border border-transparent'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <button className="w-full md:w-auto px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium py-2 rounded-lg transition-colors border border-slate-700">
            Simulate Reboot
          </button>
        </div>

      </div>
    </div>
  );
}

export default App;