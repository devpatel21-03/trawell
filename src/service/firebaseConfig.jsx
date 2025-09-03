import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection 
} from "firebase/firestore";

// ✅ Use environment variables from .env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "trawell-b4b4f.firebaseapp.com",
  projectId: "trawell-b4b4f",
  storageBucket: "trawell-b4b4f.appspot.com",
  messagingSenderId: "300736026560",
  appId: "1:300736026560:web:737c7ce62b60000dc29a25"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

//
// 🔹 Retry wrapper for saving data
//
async function saveDataWithRetry(collectionName, docId, data, retries = 3) {
  try {
    if (!docId || typeof docId !== "string") {
      throw new Error(`❌ Invalid docId: ${docId}`);
    }

    const ref = doc(db, collectionName, docId);
    await setDoc(ref, data);

    console.log("✅ Data saved successfully!");
  } catch (error) {
    if (retries > 0) {
      console.warn("⚠️ Retrying save...", retries, error);
      return saveDataWithRetry(collectionName, docId, data, retries - 1);
    } else {
      console.error("❌ Save failed after retries:", error);
      throw error;
    }
  }
}

//
// 🔹 Retry wrapper for reading data
//
async function readDataWithRetry(collectionName, docId, retries = 3) {
  try {
    if (!docId || typeof docId !== "string") {
      throw new Error(`❌ Invalid docId: ${docId}`);
    }

    const ref = doc(db, collectionName, docId);
    const snapshot = await getDoc(ref);

    if (snapshot.exists()) {
      return snapshot.data();
    } else {
      throw new Error("❌ Document does not exist");
    }
  } catch (error) {
    if (retries > 0) {
      console.warn("⚠️ Retrying read...", retries, error);
      return readDataWithRetry(collectionName, docId, retries - 1);
    } else {
      console.error("❌ Read failed after retries:", error);
      throw error;
    }
  }
}

//
// 🔹 Connection test helper
//
async function testFirestoreConnection() {
  try {
    await getDocs(collection(db, "AITrips"));
    console.log("✅ Firestore connection successful");
    return true;
  } catch (error) {
    console.error("❌ Firestore connection test failed:", error);
    return false;
  }
}

// ✅ Export everything properly
export { app, db, saveDataWithRetry, readDataWithRetry, testFirestoreConnection };
