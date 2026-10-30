"use client";

import { createContext, useContext, useMemo, useState } from "react";

const PortalAccountContext = createContext(null);

export function PortalAccountProvider({
  children,
  initialAccount,
}) {
  const [account, setAccount] = useState(initialAccount);
  const value = useMemo(
    () => ({ account, setAccount }),
    [account],
  );

  return (
    <PortalAccountContext.Provider value={value}>
      {children}
    </PortalAccountContext.Provider>
  );
}

export function usePortalAccount() {
  const context = useContext(PortalAccountContext);
  if (!context)
    throw new Error(
      "usePortalAccount must be used within PortalAccountProvider",
    );
  return context;
}
