import { DiagnosticError } from '../../shared/diagnosticError';
import { createContext, useContext, useState, useRef } from 'react';
import type { ReactNode, Dispatch, SetStateAction } from 'react';
const OverlayContext = createContext<{
  container: HTMLDivElement | null;
  setContainer: (element: HTMLDivElement | null) => void;
  beginPointerGesture: () => void;
  suppressShellClick: () => void;
  consumeShellClick: () => boolean;
  openId: string | null;
  setOpenId: Dispatch<SetStateAction<string | null>>;
} | null>(null);
export function OverlayProvider({ children }: { children: ReactNode }) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const dismissedByPointer = useRef(false);
  const beginPointerGesture = () => {
    dismissedByPointer.current = false;
  };
  const suppressShellClick = () => {
    dismissedByPointer.current = true;
  };
  const consumeShellClick = () => {
    const suppressed = dismissedByPointer.current;
    dismissedByPointer.current = false;
    return suppressed;
  };
  return (
    <OverlayContext.Provider
      value={{
        container,
        setContainer,
        openId,
        setOpenId,
        beginPointerGesture,
        suppressShellClick,
        consumeShellClick,
      }}
    >
      {children}
    </OverlayContext.Provider>
  );
}
export function useOverlay() {
  const context = useContext(OverlayContext);
  if (!context) throw new DiagnosticError('OverlayProvider is missing');
  return context;
}
