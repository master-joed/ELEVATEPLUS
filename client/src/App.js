import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import './App.css';

import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import AgentDashboard from './components/AgentDashboard';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        const userDocRef = doc(db, "users", authUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUser({ ...authUser, ...userDoc.data() });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    auth.signOut();
  };

  const renderContent = () => {
    if (loading) {
      return <p>Loading...</p>;
    }
    if (!user) {
      return <LoginPage />;
    }
    switch (user.role) {
      case 'Admin':
        return <AdminDashboard user={user} onLogout={handleLogout} />;
      case 'Manager':
        return <ManagerDashboard user={user} onLogout={handleLogout} />;
      case 'Agent':
        return <AgentDashboard user={user} onLogout={handleLogout} />;
      default:
        return (
          <div>
            <p>Waiting for role assignment. Please contact an admin.</p>
            <button onClick={handleLogout}>Logout</button>
          </div>
        );
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        {renderContent()}
      </header>
    </div>
  );
}

export default App;