import firebase_admin
from firebase_admin import credentials, firestore
import time
import math
import random

# Inisialisasi Firebase (Gunakan file JSON kamu)
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

doc_ref = db.collection("stations").document("station_01")

def simulate_day():
    print("🌞 Memulai Simulasi Siklus 24 Jam (Time-Warp Mode)...")
    
    battery = 20.0  # Mulai dari 20% di pagi hari
    
    # Loop dari jam 0 sampai 23
    for hour in range(24):
        # Logika Matahari: Muncul jam 6 (6) sampai jam 18 (18)
        if 6 <= hour <= 18:
            # Kurva Sinus untuk radiasi matahari (puncak di jam 12)
            # Menggunakan math.sin agar voltase naik perlahan lalu turun
            rad = math.sin(math.pi * (hour - 6) / 12)
            pv_voltage = round(30 + (15 * rad), 1) # 30V - 45V
            pv_current = round(10 * rad, 1)        # 0A - 10A
            status = "CHARGING"
            battery = min(100, battery + (pv_current * 0.8)) # Baterai terisi
        else:
            # Malam hari
            pv_voltage = round(random.uniform(0.1, 2.0), 1)
            pv_current = 0.0
            status = "IDLE"
            battery = max(0, battery - 0.5) # Baterai berkurang dikit (self-discharge/idle)

        data = {
            "pvVoltage": pv_voltage,
            "pvCurrent": pv_current,
            "batteryLevel": int(battery),
            "status": status,
            "timestamp": f"{hour:02d}:00" # Untuk label di log nanti
        }

        doc_ref.update(data)
        print(f"⏰ Jam {hour:02d}:00 -> {pv_voltage}V | {battery}% | {status}")
        
        # Jeda 2 detik = 1 jam simulasi
        time.sleep(2)

    print("✅ Simulasi Selesai!")

if __name__ == "__main__":
    simulate_day()