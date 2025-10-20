import React from 'react';

function AgentDashboard({ user, onLogout }) {
  return (
    <div>
      <h1>Agent Dashboard</h1>
      <h2>Welcome, {user.fullName}!</h2>
      <p>Here you can view your performance scores and coaching history.</p>
      <button onClick={onLogout}>Logout</button>
    </div>
  );
}

export default AgentDashboard;