import ExcelJS from 'exceljs';
import Chart from 'react-apexcharts';
import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "./firebase";

function App({ user }) {
  const [logs, setLogs] = useState([]);
  const [history, setHistory] = useState({ voltage: [], current: [], timestamps: [] });
  const [activeTab, setActiveTab] = useState('Overview');
  
  // --- UPDATED STATES FOR 2 RELAYS ---
  const [relayACState, setRelayACState] = useState("OFF"); // Motorcycle
  const [relayDCState, setRelayDCState] = useState("OFF"); // E-Bike
  const [fanState, setFanState] = useState(0); 

  const [data, setData] = useState({
    pvVoltage: 0,
    pvCurrent: 0,
    status: "Connecting...",
    boostTemp: 45
  });

  useEffect(() => {
      if (!user) return;

      const unsub = onSnapshot(doc(db, "stations", "station_01"), (docSnap) => {
        if (docSnap.exists()) {
          const newData = docSnap.data();

          setData((prev) => {
            if (newData.status && prev.status !== newData.status) {
              const timestamp = new Date().toLocaleTimeString();
              setLogs(prevLogs => [
                `[${timestamp}] Status: ${newData.status}`,
                ...prevLogs
              ].slice(0, 50));
            }            
            
            // --- SYNC BOTH RELAYS CORRECTLY (1-TO-1) ---
            if (newData.relayState !== undefined) {
              setRelayACState(newData.relayState);   // AC = relayState
            }
            if (newData.relayState2 !== undefined) {
              setRelayDCState(newData.relayState2);  // DC = relayState2
            }
            if (newData.fanState !== undefined) {
              setFanState(newData.fanState);
            }

            return { ...prev, ...newData };
          });

          if (newData.pvVoltage !== undefined) {
            setHistory(prev => ({
              voltage: [...prev.voltage, newData.pvVoltage].slice(-24),
              current: [...prev.current, newData.pvCurrent].slice(-24),
              timestamps: [...prev.timestamps, newData.timestamp || new Date().toLocaleTimeString()].slice(-24)
            }));
          }
        }
      });

      return () => unsub();
    }, [user]);

  const solarPower = (data.pvVoltage * data.pvCurrent).toFixed(0);

  const chartOptions = {
    chart: { id: 'voltage-chart', toolbar: { show: false }, animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 1000 } } },
    xaxis: { categories: history.timestamps, labels: { style: { colors: '#64748b', fontSize: '10px' } } },
    stroke: { curve: 'smooth', colors: ['#10b981'] },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1 } },
    grid: { borderColor: '#334155', strokeDashArray: 4 },
    dataLabels: { enabled: false },
    theme: { mode: 'dark' }
  };

  const chartSeries = [{ name: 'Voltage', data: history.voltage }];

  const exportToExcel = async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('SunVolt Data');

      sheet.columns = [
        { header: 'Timestamp', key: 'time', width: 20 },
        { header: 'Voltage (V)', key: 'voltage', width: 15 },
        { header: 'Current (A)', key: 'current', width: 15 }
      ];

      sheet.getRow(1).font = { bold: true };

      history.timestamps.forEach((time, index) => {
        sheet.addRow({
          time: time,
          voltage: history.voltage[index],
          current: history.current[index]
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `SunVolt_Full_Log_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

  // --- AC RELAY TOGGLE (MOTORCYCLE) ---
  const handleToggleRelayAC = async () => {
    const newState = relayACState === "ON" ? "OFF" : "ON";
    const stationRef = doc(db, "stations", "station_01");
    try {
      await updateDoc(stationRef, { relayState: newState });
      const timestamp = new Date().toLocaleTimeString();
      setLogs(prev => [`[${timestamp}] Command: AC Motor Port ${newState}`, ...prev].slice(0, 50));
    } catch (error) { console.error("Gagal mengubah AC relay:", error); }
  };

  // --- DC RELAY TOGGLE (E-BIKE) ---
  const handleToggleRelayDC = async () => {
    const newState = relayDCState === "ON" ? "OFF" : "ON";
    const stationRef = doc(db, "stations", "station_01");
    try {
      await updateDoc(stationRef, { relayState2: newState });
      const timestamp = new Date().toLocaleTimeString();
      setLogs(prev => [`[${timestamp}] Command: DC Bike Port ${newState}`, ...prev].slice(0, 50));
    } catch (error) { console.error("Gagal mengubah DC relay:", error); }
  };

  // --- EMERGENCY KILL SWITCH ---
  const handleEmergencyStop = async () => {
    const stationRef = doc(db, "stations", "station_01");
    try {
      await updateDoc(stationRef, { 
        relayState: "OFF", 
        relayState2: "OFF",
        fanState: 0 
      });
      const timestamp = new Date().toLocaleTimeString();
      setLogs(prev => [`[${timestamp}] 🚨 EMERGENCY STOP ACTIVATED 🚨`, ...prev].slice(0, 50));
    } catch (error) { 
      console.error("Emergency Stop Failed:", error); 
    }
  };

  const handleFanSliderChange = async (e) => {
    const targetSpeed = Number(e.target.value);
    setFanState(targetSpeed); 

    const stationRef = doc(db, "stations", "station_01");
    try {
      await updateDoc(stationRef, { fanState: targetSpeed });
      const timestamp = new Date().toLocaleTimeString();
      setLogs(prevLogs => [`[${timestamp}] Command: Set Fan Speed to ${targetSpeed}%`, ...prevLogs].slice(0, 50));
    } catch (error) {
      console.error("Gagal mengubah kecepatan fan:", error);
    }
  };

  // --- EMAIL OBFUSCATOR ---
  const obfuscateEmail = (email) => {
    if (!email) return "";
    const parts = email.split("@");
    if (parts.length !== 2) return email; // Failsafe if not a valid email format
    
    const username = parts[0];
    const domain = parts[1];
    
    // Calculate half the length to remain visible
    const visibleLength = Math.ceil(username.length / 2);
    const visiblePart = username.substring(0, visibleLength);
    const hiddenPart = "*".repeat(username.length - visibleLength);
    
    return `${visiblePart}${hiddenPart}@${domain}`;
  };

  return (
    <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-4 font-sans text-slate-200">
      <div className="w-full max-w-md md:max-w-4xl bg-[#1a1d24] rounded-3xl overflow-hidden shadow-2xl border border-slate-800/50 flex flex-col h-[750px] md:h-[600px]">
        
        {/* HEADER */}
        <div className="flex justify-between items-end px-6 pt-6 pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-xl font-semibold text-white tracking-wide">SunVolt Dashboard</h1>
            <div className="flex items-center gap-3">
              <p className="text-xs text-emerald-500">{obfuscateEmail(user?.email)}</p>
              <button 
                onClick={() => signOut(auth)}
                className="text-[10px] text-slate-500 hover:text-red-400 transition-colors uppercase font-bold tracking-tighter"
              >
                • Sign Out
              </button>
            </div>
          </div>
          <div className="flex gap-6 text-xs font-medium tracking-wider text-slate-400">
            <div className="flex flex-col items-end">
              <span>INVERTER</span>
              <span className="text-white text-sm">{solarPower}W</span>
            </div>
            <div className="flex flex-col items-end">
              <span>STATUS</span>
              <span className="text-emerald-400 text-sm font-bold uppercase">{data.status}</span>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 p-5 overflow-y-auto bg-[#14161a]">
          {activeTab === 'Overview' && (
            <div className="h-full flex flex-col items-center justify-center gap-6">
              <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">System Overview</div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
                
                {/* Port Status Centerpiece */}
                <div className="bg-[#1a1d24] p-8 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-amber-500 to-blue-500 opacity-50"></div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-6">Active Ports</div>
                  
                  <div className="flex w-full justify-around items-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium">AC Motor</span>
                      <span className={`text-3xl font-black ${relayACState === 'ON' ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-slate-600'}`}>
                        {relayACState}
                      </span>
                    </div>
                    
                    <div className="h-12 w-[1px] bg-slate-700/50"></div>
                    
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium">DC Bike</span>
                      <span className={`text-3xl font-black ${relayDCState === 'ON' ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]' : 'text-slate-600'}`}>
                        {relayDCState}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Inverter Draw Centerpiece */}
                <div className="bg-[#1a1d24] p-8 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 w-full h-1 bg-emerald-500 opacity-50"></div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-4">Inverter Draw</div>
                  
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black text-white tracking-tighter">{data.pvCurrent}</span>
                    <span className="text-xl font-bold text-slate-500">A</span>
                  </div>
                  
                  <div className="mt-3 px-4 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                    <span className="text-emerald-400 text-xs font-bold">{solarPower} Watts</span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'Diagnostics' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full content-start text-left">
              
              <div className="bg-[#1a1d24] p-4 rounded-xl border border-slate-700/50">
                <div className="text-xs text-slate-400 mb-3 uppercase tracking-wider font-semibold">AC Inverter</div>
                <div className="space-y-2">
                  <div><div className="text-[10px] text-slate-500">Voltage</div><div className="font-bold">{data.pvVoltage} V</div></div>
                  <div><div className="text-[10px] text-slate-500">Current</div><div className="font-bold">{data.pvCurrent} A</div></div>
                </div>
              </div>

              <div className="bg-[#1a1d24] p-4 rounded-xl border border-slate-700/50">
                <div className="text-xs text-slate-400 mb-3 uppercase tracking-wider font-semibold">Booster</div>
                <div className="space-y-2">
                  <div><div className="text-[10px] text-slate-500">Boost V</div><div className="font-bold">54.6 V</div></div>
                  <div><div className="text-[10px] text-slate-500">Heatsink</div><div className={`font-bold ${data.boostTemp >= 65 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{data.boostTemp} °C</div></div>
                </div>
              </div>

              <div className="bg-[#1a1d24] p-4 rounded-xl border border-slate-700/50">
                <div className="text-xs text-slate-400 mb-3 uppercase tracking-wider font-semibold">Net</div>
                <div><div className="text-[10px] text-slate-500">RSSI</div><div className="font-bold">-65 dBm</div></div>
              </div>

              <div className="col-span-full bg-[#1a1d24] p-4 rounded-xl border border-slate-700/50 mt-2">
                <div className="text-xs text-slate-400 mb-4 uppercase tracking-wider font-semibold">
                  Voltage Trend (Live)
                </div>
                <div className="overflow-x-auto pb-2 scrollbar-hide">
                  <div className="min-w-[800px]">
                    <Chart 
                      options={chartOptions} 
                      series={chartSeries} 
                      type="area" 
                      height={250} 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Logs' && (
            <div className="h-full flex flex-col gap-4">
              <div className="bg-[#1a1d24] p-4 rounded-xl border border-slate-700/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
                <div className="flex gap-8 w-full md:w-auto justify-between md:justify-start">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Generated</div>
                    <div className="text-emerald-400 font-bold text-xl md:text-3xl">1.25 kWh</div>
                  </div>
                  <div className="text-right md:text-left">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Dispensed</div>
                    <div className="text-blue-400 font-bold text-xl md:text-3xl">0.80 kWh</div>
                  </div>
                </div>

                <button 
                  onClick={exportToExcel}
                  className="w-full md:w-auto px-5 py-2 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-emerald-500/20 transition-all active:scale-95"
                >
                  Export Data (.xlsx)
                </button>
              </div>

              <div className="flex-1 bg-[#0b0c0f] rounded-xl border border-slate-800 p-3 font-mono text-[11px] overflow-y-auto space-y-1 shadow-inner">
                {logs.map((log, index) => (
                  <p 
                    key={index} 
                    className={index === 0 ? "text-emerald-400 animate-pulse" : "text-slate-500"}
                  >
                    {log}
                  </p>
                ))}
                {logs.length === 0 && (
                  <p className="text-slate-700 italic text-center mt-4">No system events recorded.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="bg-[#1a1d24] p-4 border-t border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full md:w-auto">
            <select 
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full md:hidden bg-[#0f1115] border border-slate-700 text-white text-sm rounded-lg p-2"
            >
              <option value="Overview">Overview</option>
              <option value="Diagnostics">Diagnostics</option>
              <option value="Logs">Logs</option>
            </select>
            
            <div className="hidden md:flex gap-2">
              {['Overview', 'Diagnostics', 'Logs'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm ${activeTab === tab ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

            {/* UI CONTROLS: FAN & DUAL RELAYS + EMERGENCY STOP */}
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
              
              {/* Fan Control Slider */}
              <div className="flex flex-col justify-center bg-slate-800/40 border border-slate-700/40 p-2 px-4 rounded-xl min-w-[180px]">
                <div className="flex justify-between w-full text-[10px] text-emerald-400 font-bold tracking-widest uppercase mb-1">
                  <span>❄️ Fan</span>
                  <span>{fanState}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" 
                  value={fanState} onChange={handleFanSliderChange}
                  className="w-full accent-emerald-500 bg-slate-900 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Stacked Relay Buttons & Emergency Stop */}
              <div className="flex flex-col gap-2 w-full md:w-auto">
                <div className="flex gap-2 w-full md:w-auto">
                  <button 
                    onClick={handleToggleRelayAC}
                    className={`flex-1 md:flex-none md:w-32 py-2 px-2 text-xs text-center font-bold rounded-xl border transition-all ${
                      relayACState === "ON" 
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]" 
                        : "bg-[#14161a] text-slate-400 border-slate-700 hover:bg-slate-800"
                    }`}
                  >
                    AC Motor: {relayACState}
                  </button>

                  <button 
                    onClick={handleToggleRelayDC}
                    className={`flex-1 md:flex-none md:w-32 py-2 px-2 text-xs text-center font-bold rounded-xl border transition-all ${
                      relayDCState === "ON" 
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]" 
                        : "bg-[#14161a] text-slate-400 border-slate-700 hover:bg-slate-800"
                    }`}
                  >
                    DC Bike: {relayDCState}
                  </button>
                </div>
                
                {/* 🚨 THE EMERGENCY BUTTON 🚨 */}
                <button 
                  onClick={handleEmergencyStop}
                  className="w-full px-4 py-2 text-[10px] md:text-xs font-black tracking-widest uppercase rounded-xl border border-red-600 bg-red-600/20 text-red-500 hover:bg-red-600/40 hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all"
                >
                  ⚠ Emergency Cutoff ⚠
                </button>
              </div>

            </div>
        </div>
      </div>
    </div>
  );
}

export default App;