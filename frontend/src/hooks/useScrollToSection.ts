import { useEffect } from 'react';

export function useScrollToSection(sectionId: string | null | undefined, deps: unknown[] = []) {
  useEffect(() => {
    if (!sectionId) return;

    const timeoutId = window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 120);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId, ...deps]);
}
