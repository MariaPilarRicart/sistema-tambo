import { useEffect, type DependencyList } from 'react';
import { DATA_CHANGED_EVENT } from '../services/apiClient';

export function useDataChangedRefresh(refresh: () => void | Promise<void>, deps: DependencyList) {
  useEffect(() => {
    function handleDataChanged() {
      void refresh();
    }

    window.addEventListener(DATA_CHANGED_EVENT, handleDataChanged);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, handleDataChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
