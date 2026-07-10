import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  projectId: "semiotic-particle-j7c1c",
  appId: "1:649030206931:web:6ac41f24aab9adbf119b26",
  apiKey: "AIzaSyAnYixCv685zyY_gaxrmtd8sV738lmY5dw",
  authDomain: "semiotic-particle-j7c1c.firebaseapp.com",
  storageBucket: "semiotic-particle-j7c1c.firebasestorage.app",
  messagingSenderId: "649030206931",
  firestoreDatabaseId: "ai-studio-ic3lms-1878ba81-d83e-464c-9cd6-2f63243b2865"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const COLLECTIONS = {
  USERS: "users",
  STUDENTS: "students",
  TEACHERS: "teachers",
  CLASSES: "classes",
  QUESTIONS: "questions",
  TESTS: "tests",
  SCORES: "scores",
  REWARDS: "rewards",
  NOTIFICATIONS: "notifications"
};

export const IC3_DB_CLOUD = {
  async getAll(collectionName: string) {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  },

  async getById(collectionName: string, id: string) {
    const docRef = doc(db, collectionName, id);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } : null;
  },

  async set(collectionName: string, id: string, data: any) {
    const docRef = doc(db, collectionName, id);
    await setDoc(docRef, data, { merge: true });
  },

  async delete(collectionName: string, id: string) {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  },

  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await this.getById(COLLECTIONS.USERS, email);
      if (userDoc) {
        localStorage.setItem("ic3_current_user", JSON.stringify(userDoc));
        return { success: true, user: userDoc };
      }
      return { success: false, message: "User data not found in cloud." };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  logout() {
    signOut(auth);
    localStorage.removeItem("ic3_current_user");
  },

  getCurrentUser() {
    const user = localStorage.getItem("ic3_current_user");
    return user ? JSON.parse(user) : null;
  }
};
