// Entry point for the bundled Firebase SDK (public/js/vendor/firebase.js).
// Built by `npm run build`; only the functions the site uses are exported.
export { initializeApp } from 'firebase/app';
export {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  connectAuthEmulator,
} from 'firebase/auth';
export {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
