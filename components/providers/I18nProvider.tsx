'use client'

import { createContext, useContext } from 'react'

const Context = createContext<any>(undefined)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  return (
    <Context.Provider value={{}}>
      {children}
    </Context.Provider>
  )
}

export const useI18n = () => {
  const context = useContext(Context)
  return context
}
