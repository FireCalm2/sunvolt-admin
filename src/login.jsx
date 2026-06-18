import { useState, useEffect } from 'react';
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

const ALLOWED_EMAILS = [
  "firecalm2@gmail.com",
  "syauqiakmal137@gmail.com",
  "fattaha.rasyad@gmail.com",
];

function Login({ setUser }) {
  const [loginError, setLoginError] = useState("");

  // Check browser memory for an error surviving a component reload
  useEffect(() => {
    const savedError = sessionStorage.getItem("authError");
    if (savedError) {
      setLoginError(savedError);
      sessionStorage.removeItem("authError"); // Clear it so it doesn't show forever
    }
  }, []);

  const handleLogin = async () => {
    try {
      setLoginError(""); 
      const result = await signInWithPopup(auth, googleProvider);
      
      // Convert to lowercase to prevent accidental capitalization lockouts
      const email = result.user.email.toLowerCase(); 

      if (ALLOWED_EMAILS.includes(email)) {
        setUser(result.user);
      } else {
        // Save the error to browser memory before kicking them out
        sessionStorage.setItem("authError", `Akses Ditolak: ${email} tidak terdaftar di sistem.`);
        await signOut(auth);
        
        // Fallback state update just in case the parent doesn't unmount it
        setLoginError(`Akses Ditolak: ${email} tidak terdaftar di sistem.`);
      }
    } catch (error) {
      console.error("Login error:", error);
      // Cleanly handle the error if a user closes the Google popup window manually
      if (error.code === 'auth/popup-closed-by-user') {
        setLoginError("Login dibatalkan oleh pengguna.");
      } else {
        setLoginError("Terjadi kesalahan jaringan atau autentikasi.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1115] flex flex-col items-center justify-center p-4 font-sans">
      
      {/* Kartu Login */}
      <div className="bg-[#1a1d24] p-8 rounded-3xl border border-slate-800/80 text-center max-w-sm w-full shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        
        {/* Header Kartu dengan Logo & Teks */}
        <div className="mb-8 flex flex-col items-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            
            {/* Logo SunVolt */}
            <img 
              src="/Logo_SunVolt.png" 
              alt="SunVolt Logo" 
              className="w-10 h-10 object-contain drop-shadow-md" 
            />
            
            {/* Teks dengan Warna Terpisah */}
            <h1 className="text-4xl font-black tracking-wide">
              <span className="text-emerald-500">SUN</span>
              <span className="text-yellow-400">VOLT</span>
            </h1>
            
          </div>
          <p className="text-slate-400 text-xs tracking-widest uppercase font-semibold">
            Secure Admin Access
          </p>
        </div>
        
        {/* Tombol Berwarna */}
        <button 
          onClick={handleLogin}
          className="w-full bg-white text-slate-900 font-bold py-3 px-4 rounded-xl hover:bg-slate-200 transition-all duration-200 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 shadow-lg"
        >
          {/* Logo SVG Google */}
          <img 
            src="https://www.svgrepo.com/show/475656/google-color.svg" 
            className="w-5 h-5" 
            alt="Google Logo" 
          />
          Continue with Google
        </button>

        {/* Notifikasi Error (Hanya muncul jika loginError ada isinya) */}
        {loginError && (
          <div className="mt-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs text-left leading-relaxed">
            <span className="font-bold">⚠️ Security Alert:</span><br/>
            {loginError}
          </div>
        )}

      </div>
    </div>
  );
}

export default Login;