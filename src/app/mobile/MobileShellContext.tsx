import { createContext, useContext, type ReactNode } from "react";

interface MobileShellContextValue {
  isMobileShell: boolean;
}

const MobileShellContext = createContext<MobileShellContextValue>({
  isMobileShell: false,
});

export function MobileShellProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: MobileShellContextValue;
}) {
  return <MobileShellContext.Provider value={value}>{children}</MobileShellContext.Provider>;
}

export function useMobileShell() {
  return useContext(MobileShellContext);
}
