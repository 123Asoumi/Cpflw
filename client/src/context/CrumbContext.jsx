import { createContext, useContext, useEffect, useState } from 'react';

const Ctx = createContext({ title: null, setTitle: () => {} });

export function CrumbProvider({ children }) {
  const [title, setTitle] = useState(null);
  return <Ctx.Provider value={{ title, setTitle }}>{children}</Ctx.Provider>;
}

export const useCrumbTitle = () => useContext(Ctx).title;

/** Detail pages call useCrumb('Algorithmique avancée') to name the last breadcrumb. */
export function useCrumb(title) {
  const { setTitle } = useContext(Ctx);
  useEffect(() => {
    setTitle(title || null);
    return () => setTitle(null);
  }, [title, setTitle]);
}
