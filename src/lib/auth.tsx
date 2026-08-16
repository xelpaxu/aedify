'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { 
  auth, 
  signInWithEmailAndPassword, 
  firebaseSignOut, 
  onAuthStateChanged,
  FirebaseUser
} from './firebase'

export type Role =
  | 'lgu-admin'
  | 'brgy-calumpang'
  | 'brgy-sanjuan'
  | 'brgy-southfundidor'
  | 'sys-admin'

export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
  role: Role | null
}

interface AuthContextType {
  user: AuthUser | null
  firebaseUser: FirebaseUser | null
  role: Role | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  role: null,
  isLoading: true,
  login: async () => false,
  logout: async () => {},
})

// Map Firebase emails to roles (hardcoded for now)
const ROLE_MAP: { [email: string]: Role } = {
  'lgu@aedify.com': 'lgu-admin',
  'calumpang@aedify.com': 'brgy-calumpang',
  'sanjuan@aedify.com': 'brgy-sanjuan',
  'southfundidor@aedify.com': 'brgy-southfundidor',
  'admin@aedify.com': 'sys-admin',
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Listen to Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('🔥 Firebase auth state changed:', firebaseUser?.email)
      setFirebaseUser(firebaseUser)
      
      if (firebaseUser) {
        // Build user from Firebase data
        const email = firebaseUser.email || ''
        const role = ROLE_MAP[email] || null
        
        const authUser: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '',
          role: role,
        }
        setUser(authUser)
        console.log('👤 User role:', role)
      } else {
        setUser(null)
      }
      
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Login with Firebase
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('🔐 Logging in with Firebase:', email)
      await signInWithEmailAndPassword(auth, email, password)
      console.log('✅ Firebase login successful')
      return true
    } catch (error: any) {
      console.error('❌ Firebase login error:', error)
      return false
    }
  }

  // Logout
  const logout = async () => {
    try {
      await firebaseSignOut(auth)
      setUser(null)
      console.log('🚪 Logged out')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const value = {
    user,
    firebaseUser,
    role: user?.role || null,
    isLoading,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)