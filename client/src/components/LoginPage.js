import React, { useState } from 'react';

function LoginPage({ onLoginSuccess }) {
  const [error, setError] = useState('');

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    const username = event.target.username.value;
    const password = event.target.password.value;
    const apiUrl = '/api/login';

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Login failed!');
      }
      onLoginSuccess(data.user); // Send the user data back to App.js
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1>ELEVATEPLUS Login</h1>
      <form onSubmit={handleLogin}>
        <div>
          <input type="text" name="username" placeholder="Username" required />
        </div>
        <div>
          <input type="password" name="password" placeholder="Password" required />
        </div>
        <button type="submit">Login</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default LoginPage;