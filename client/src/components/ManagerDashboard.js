import React from 'react';

function ManagerDashboard({ user, onLogout }) {
  return (
    <div>
      <h1>Manager Dashboard</h1>
      <h2>Welcome, {user.fullName}!</h2>
      <p>Here you can view your team's scores and add coaching logs.</p>
      <button onClick={onLogout}>Logout</button>
    </div>
  );
}

export default ManagerDashboard;