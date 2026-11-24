import { useEffect, useState } from 'preact/hooks';
import type { Session } from '../session/session.ts';

/** Překreslí komponentu při každé změně stavu pískoviště. */
export function useSession(s: Session): number {
  const [version, setVersion] = useState(0);
  useEffect(() => s.subscribe(() => setVersion((v) => v + 1)), [s]);
  return version;
}
