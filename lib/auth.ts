import { auth } from "./firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "firebase/auth";

export const login    = (e: string, p: string) => signInWithEmailAndPassword(auth, e, p);
export const register = (e: string, p: string) => createUserWithEmailAndPassword(auth, e, p);
export const logout   = () => signOut(auth);
