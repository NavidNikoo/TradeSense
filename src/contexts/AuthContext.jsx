import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth'
import { auth } from '../firebase/config'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        await currentUser.reload()
        setUser({ ...currentUser })
      } else {
        setUser(null)
      }
      setAuthReady(true)
    })

    return unsubscribe
  }, [])

  const value = useMemo(
    () => ({
      user,
      authReady,
      signUp: async (email, password, fname, lname) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(userCredential.user, {
          displayName: `${fname} ${lname}`,
        })
        setUser({ ...userCredential.user })
        return userCredential
      },
      signIn: (email, password) => signInWithEmailAndPassword(auth, email, password),
      signOutUser: () => signOut(auth),
    }),
    [user, authReady],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}