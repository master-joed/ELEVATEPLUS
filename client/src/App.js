import React, { useState } from 'react';
import './App.css';

// Import the components you just created
import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import AgentDashboard from './components/AgentDashboard';

function App() {
  // The 'user' state will hold the logged-in user's data
  const [user, setUser] = useState(null);

  const handleLogout = () => {
    setUser(null); // Clear the user state to log out
  };

  // This function decides which component to show
  const renderContent = () => {
    if (!user) {
      // If no one is logged in, show the login page
      return <LoginPage onLoginSuccess={setUser} />;
    }

    // If a user is logged in, check their role and show the correct dashboard
    switch (user.role) {
      case 'Admin':
        return <AdminDashboard user={user} onLogout={handleLogout} />;
      case 'Manager':
        return <ManagerDashboard user={user} onLogout={handleLogout} />;
      case 'Agent':
        return <AgentDashboard user={user} onLogout={handleLogout} />;
      default:
        // If the role is unknown, log them out
        return <LoginPage onLoginSuccess={setUser} />;
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