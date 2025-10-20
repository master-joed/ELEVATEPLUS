import React from 'react';

function AdminDashboard({ user, onLogout }) {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <h2>Welcome, {user.fullName}!</h2>
      <p>Here you can manage users, campaigns, and KPIs.</p>
      <button onClick={onLogout}>Logout</button>
    </div>
  );
}

export default AdminDashboard;