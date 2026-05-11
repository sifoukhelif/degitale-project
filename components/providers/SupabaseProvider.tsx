'use client'

import { createContext, useContext } from 'react'

const Context = createContext<any>(undefined)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  return (
    <Context.Provider value={{}}>
      {children}
    </Context.Provider>
  )
}

export const useSupabase = () => {
  const context = useContext(Context)
  return context
}
