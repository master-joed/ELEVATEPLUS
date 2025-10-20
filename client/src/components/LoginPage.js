import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";

function LoginPage() {
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const email = event.target.email.value;
    const password = event.target.password.value;

    try {
      if (isRegistering) {
        const fullName = event.target.fullName.value;
        const role = event.target.role.value;
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", userCredential.user.uid), {
          fullName: fullName,
          role: role,
          email: email
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1>{isRegistering ? 'Register for ELEVATEPLUS' : 'ELEVATEPLUS Login'}</h1>
      <form onSubmit={handleSubmit}>
        {isRegistering && (
          <>
            <input type="text" name="fullName" placeholder="Full Name" required />
            <select name="role" required>
              <option value="Agent">Agent</option>
              <option value="Manager">Manager</option>
              <option value="Admin">Admin</option>
            </select>
          </>
        )}
        <input type="email" name="email" placeholder="Email" required />
        <input type="password" name="password" placeholder="Password" required />
        <button type="submit">{isRegistering ? 'Register' : 'Login'}</button>
      </form>
      <button onClick={() => setIsRegistering(!isRegistering)}>
        {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default LoginPage;