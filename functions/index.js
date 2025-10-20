// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.createUser = functions.https.onCall(async (data, context) => {
  // Check if the request is made by an authenticated user
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to create a user."
    );
  }

  const { email, password, fullName, role } = data;

  try {
    // 1. Create the user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: fullName,
    });

    // 2. Create the user document in Firestore to store their role
    await admin.firestore().collection("users").doc(userRecord.uid).set({
      fullName: fullName,
      email: email,
      role: role,
    });

    return { result: `Successfully created user ${email}` };
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});