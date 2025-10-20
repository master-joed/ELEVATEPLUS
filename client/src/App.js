// src/App.js
import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

// --- Import MUI Styling ---
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';

import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import AgentDashboard from './components/AgentDashboard';

// Define the custom branded theme
const lightTheme = createTheme({
  palette: {
    mode: 'light', 
    primary: {
      main: '#007BFF', 
      light: '#4C9CFF',
      dark: '#0056b3',
      contrastText: '#FFFFFF', 
    },
    secondary: {
      main: '#495057', 
      light: '#6c757d',
      dark: '#343a40',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#f8f9fa', 
      paper: '#ffffff',    
    },
    success: {
        main: '#28a745',
    }
  },
  typography: {
    allVariants: {
      color: '#333333',
    },
  },
});

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        const userDocRef = doc(db, "users", authUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUser({ ...authUser, uid: authUser.uid, ...userDoc.data() }); 
        } else {
            setUser({ ...authUser, role: 'Unassigned', uid: authUser.uid });
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
      return <p style={{ color: '#333' }}>Loading...</p>;
    }
    
    if (!user) {
      return <LoginPage />;
    }

    switch (user.role) {
      case 'Super Admin': // <-- NEW ROLE
      case 'Admin':
        return <AdminDashboard user={user} onLogout={handleLogout} />;
      case 'Manager':
        return <ManagerDashboard user={user} onLogout={handleLogout} />;
      case 'Agent':
        return <AgentDashboard user={user} onLogout={handleLogout} />;
      default:
        return (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p style={{ color: '#333' }}>Access Restricted. Your account is pending role assignment from an administrator.</p>
            <button onClick={handleLogout}>Logout</button>
          </div>
        );
    }
  };

  return (
    <ThemeProvider theme={lightTheme}>
      <CssBaseline /> 
      <div className="App" style={{ minHeight: '100vh', backgroundColor: lightTheme.palette.background.default }}>
        {renderContent()}
      </div>
    </ThemeProvider>
  );
}

export default App;