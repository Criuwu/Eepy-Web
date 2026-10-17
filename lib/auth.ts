import { auth } from "./firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut
} from "firebase/auth";

export const login = (e: string, p: string) => signInWithEmailAndPassword(auth, e, p);

export const register = async (e: string, p: string, username?: string) => {
  const cred = await createUserWithEmailAndPassword(auth, e, p);
  if (username && cred.user) {
    try {
      await updateProfile(cred.user, { displayName: username });
    } catch {
      // Ignore profile update error if any
    }
  }
  return cred;
};

export const logout = async () => {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("eepy_demo_mode");
    localStorage.removeItem("eepy_demo_mode");
  }
  try {
    await signOut(auth);
  } catch {
    // Ignore sign out errors
  }
  if (typeof window !== "undefined") {
    window.location.href = "/";
  }
};
