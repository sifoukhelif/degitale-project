'use client'
import { createContext } from 'react'
const Context = createContext<any>(undefined)
export default function I18nProvider({ children }: { children: React.ReactNode }) {
  return <Context.Provider value={{}}>{children}</Context.Provider>
}