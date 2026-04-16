import ExcelJS from 'exceljs';
import Chart from 'react-apexcharts';
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "./firebase";
function App({ user }) {
  const [logs, setLogs] = useState([]);
  const [history, setHistory] = useState({ voltage: [], current: [], battery: [], timestamps: [] });
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
      if (!user) return;

      const unsub = onSnapshot(doc(db, "stations", "station_01"), (docSnap) => {
        if (docSnap.exists()) {
          const newData = docSnap.data();

          // LOGIKA UPDATE DATA & LOGS
          setData((prev) => {
            // Hanya tambah log kalau statusnya BENAR-BENAR berubah
            if (newData.status && prev.status !== newData.status) {
              const timestamp = new Date().toLocaleTimeString();
              setLogs(prevLogs => [
                `[${timestamp}] Status: ${newData.status}`,
                ...prevLogs
              ].slice(0, 50));
            }
            // WAJIB ADA RETURN INI! Kalau hilang, web jadi putih.
            return { ...prev, ...newData };
          });

          // UPDATE HISTORY CHART
          if (newData.pvVoltage !== undefined) {
            setHistory(prev => ({
              voltage: [...prev.voltage, newData.pvVoltage].slice(-24),
              current: [...prev.current, newData.pvCurrent].slice(-24),     // REKAM ARUS
              battery: [...prev.battery, newData.batteryLevel].slice(-24), // REKAM BATERAI
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
      // 1. Buat File Excel Baru
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('SunVolt Data');

      // 2. Atur Kolom dan Lebarnya (Auto-Width)
      sheet.columns = [
        { header: 'Timestamp', key: 'time', width: 15 },
        { header: 'Voltage (V)', key: 'voltage', width: 15 },
        { header: 'Current (A)', key: 'current', width: 15 },
        { header: 'Battery (%)', key: 'battery', width: 15 }
      ];

      // Bikin Header baris pertama jadi Cetak Tebal (Bold)
      sheet.getRow(1).font = { bold: true };

      // 3. Masukkan Data dari History
      history.timestamps.forEach((time, index) => {
        sheet.addRow({
          time: time,
          voltage: history.voltage[index],
          current: history.current[index],
          battery: history.battery[index]
        });
      });

      // 4. Generate dan Download File
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

  return (
    <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-4 font-sans text-slate-200">
      
      <div className="w-full max-w-md md:max-w-4xl bg-[#1a1d24] rounded-3xl overflow-hidden shadow-2xl border border-slate-800/50 flex flex-col h-[750px] md:h-[600px]">
        
        {/* HEADER */}
        <div className="flex justify-between items-end px-6 pt-6 pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-xl font-semibold text-white tracking-wide">SunVolt Hub</h1>
            <div className="flex items-center gap-3">
              <p className="text-xs text-emerald-500">{user?.email}</p>
              {/* Tombol Logout Kecil & Clean */}
              <button 
                onClick={() => signOut(auth)}
                className="text-[10px] text-slate-500 hover:text-red-400 transition-colors uppercase font-bold tracking-tighter"
              >
                • Sign Out
              </button>
            </div>
          </div>
          <div className="flex gap-4 text-xs font-medium tracking-wider text-slate-400">
            <div className="flex flex-col items-end">
              <span>BATTERY</span>
              <span className="text-white text-sm">{data.batteryLevel}%</span>
            </div>
            <div className="flex flex-col items-end hidden md:flex">
              <span>SOLAR</span>
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
            <div className="h-full flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
              
              <div className="w-48 h-56 rounded-2xl border-4 border-slate-700 relative overflow-hidden bg-slate-800/50 flex items-end shrink-0">
                <div 
                  className="w-full bg-emerald-400 transition-all duration-1000 ease-out absolute bottom-0"
                  style={{ height: `${data.batteryLevel}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <span className="text-4xl font-black text-white">
                    {data.batteryLevel}%
                  </span>
                </div>
              </div>

              <div className="bg-[#1a1d24] p-6 rounded-xl border border-slate-700/50 w-full md:w-auto flex-1">
                <div className="text-xs text-slate-400 mb-4 uppercase tracking-wider font-semibold">Active Session</div>
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
                    <div className="text-white font-bold text-sm truncate">{data.user}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Diagnostics' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 h-full content-start text-left">
              {/* Solar Card */}
              <div className="bg-[#1a1d24] p-4 rounded-xl border border-slate-700/50">
                <div className="text-xs text-slate-400 mb-3 uppercase tracking-wider font-semibold">Solar</div>
                <div className="space-y-2">
                  <div><div className="text-[10px] text-slate-500">Voltage</div><div className="font-bold">{data.pvVoltage} V</div></div>
                  <div><div className="text-[10px] text-slate-500">Current</div><div className="font-bold">{data.pvCurrent} A</div></div>
                </div>
              </div>
              
              {/* BMS Card */}
              <div className="bg-[#1a1d24] p-4 rounded-xl border border-slate-700/50">
                <div className="text-xs text-slate-400 mb-3 uppercase tracking-wider font-semibold">BMS</div>
                <div className="space-y-2">
                  <div><div className="text-[10px] text-slate-500">Voltage</div><div className="font-bold">52.1 V</div></div>
                  <div><div className="text-[10px] text-slate-500">Internal Temp</div><div className={`font-bold ${data.bmsTemp >= 50 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{data.bmsTemp} °C</div></div>
                </div>
              </div>

              {/* Booster Card */}
              <div className="bg-[#1a1d24] p-4 rounded-xl border border-slate-700/50">
                <div className="text-xs text-slate-400 mb-3 uppercase tracking-wider font-semibold">Booster</div>
                <div className="space-y-2">
                  <div><div className="text-[10px] text-slate-500">Boost V</div><div className="font-bold">54.6 V</div></div>
                  <div><div className="text-[10px] text-slate-500">Heatsink</div><div className={`font-bold ${data.boostTemp >= 65 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{data.boostTemp} °C</div></div>
                </div>
              </div>

              {/* Net Card */}
              <div className="bg-[#1a1d24] p-4 rounded-xl border border-slate-700/50">
                <div className="text-xs text-slate-400 mb-3 uppercase tracking-wider font-semibold">Net</div>
                <div><div className="text-[10px] text-slate-500">RSSI</div><div className="font-bold">-65 dBm</div></div>
              </div>

              {/* CHART AREA - Dengan Fitur Horizontal Scroll */}
              <div className="col-span-full bg-[#1a1d24] p-4 rounded-xl border border-slate-700/50 mt-2">
                <div className="text-xs text-slate-400 mb-4 uppercase tracking-wider font-semibold">
                  Voltage Trend (Live)
                </div>
                
                {/* Scroll Wrapper */}
                <div className="overflow-x-auto pb-2 scrollbar-hide">
                  {/* min-w ini yang memaksa grafik tetap lebar agar bisa di-scroll */}
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
              
              {/* Header Stats & Actions */}
              <div className="bg-[#1a1d24] p-4 rounded-xl border border-slate-700/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
                
                {/* Container Stats (Kiri) */}
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

                {/* Tombol Export (Kanan) */}
                <button 
                  onClick={exportToExcel}
                  className="w-full md:w-auto px-5 py-2 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-emerald-500/20 transition-all active:scale-95"
                >
                  Export Data (.csv)
                </button>
              </div>

              {/* Dynamic Terminal Logs */}
              <div className="flex-1 bg-[#0b0c0f] rounded-xl border border-slate-800 p-3 font-mono text-[11px] overflow-y-auto space-y-1 shadow-inner">
                {logs.map((log, index) => (
                  <p 
                    key={index} 
                    className={index === 0 ? "text-emerald-400 animate-pulse" : "text-slate-500"}
                  >
                    {log}
                  </p>
                ))}

                {/* Tampilkan pesan jika log masih kosong */}
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

          <button className="px-6 bg-slate-800 text-slate-300 text-sm py-2 rounded-lg border border-slate-700">
            Simulate Reboot
          </button>
        </div>

      </div>
    </div>
  );
}

export default App;