// src/components/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase'; // Import auth and db
import { createUserWithEmailAndPassword } from "firebase/auth"; // Import the function to create users
import { collection, getDocs, setDoc, doc } from "firebase/firestore";

function AdminDashboard({ user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ fullName: '', email: '', password: '', role: 'Agent' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch all users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      const usersCollection = await getDocs(collection(db, "users"));
      setUsers(usersCollection.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchUsers();
  }, []);

  const handleInputChange = (e) => {
    setNewUser({ ...newUser, [e.target.name]: e.target.value });
  };

  // --- NEW LOGIC TO ADD USER ---
  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      // 1. Create the new user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, newUser.email, newUser.password);
      
      // 2. Create the user document in Firestore to store their role
      await setDoc(doc(db, "users", userCredential.user.uid), {
        fullName: newUser.fullName,
        role: newUser.role,
        email: newUser.email,
      });

      // 3. IMPORTANT: Sign the new user out immediately
      await auth.signOut();
      
      // We can't refresh the user list because the admin is now logged out.
      // We will show a success message before the page redirects to login.
      setSuccess("User created successfully! You will now be logged out.");

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <h2>Welcome, {user.fullName}!</h2>
      
      <hr />

      <h3>Add New User</h3>
      <form onSubmit={handleAddUser}>
        <input type="text" name="fullName" placeholder="Full Name" value={newUser.fullName} onChange={handleInputChange} required />
        <input type="email" name="email" placeholder="Email" value={newUser.email} onChange={handleInputChange} required />
        <input type="password" name="password" placeholder="Password" value={newUser.password} onChange={handleInputChange} required />
        <select name="role" value={newUser.role} onChange={handleInputChange}>
          <option value="Agent">Agent</option>
          <option value="Manager">Manager</option>
          <option value="Admin">Admin</option>
        </select>
        <button type="submit">Add User</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      <hr />

      <h3>Manage Users</h3>
      <table style={{ width: '100%', textAlign: 'left' }}>
        <thead>
          <tr>
            <th>Full Name</th>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.fullName}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={onLogout} style={{ marginTop: '20px' }}>Logout</button>
    </div>
  );
}

export default AdminDashboard;