import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { auth } from './firebase' // Make sure this is imported
import { onAuthStateChanged } from 'firebase/auth'

import App from './App.jsx'
import Login from './login.jsx'

function Root() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This "Observer" listens for any sign-in or sign-out events
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false); // Stop loading once we know the status
    });

    return () => unsubscribe(); // Clean up the listener
  }, []);

  // Show a dark screen while checking if you're logged in
  if (loading) {
    return <div className="min-h-screen bg-[#0f1115]"></div>;
  }

  return user
    ? <App user={user} />
    : <Login setUser={setUser} />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)