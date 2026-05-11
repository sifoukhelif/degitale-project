'use client'
import { createContext, useContext } from 'react'
const Context = createContext<any>(undefined)
export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  return <Context.Provider value={{}}>{children}</Context.Provider>
}