import localforage from 'localforage';
import { shallowRef } from 'vue';

/** Persisted blob state (IndexedDB via localforage); `set` updates the ref and persists. */
export function useLocalStorageBlob<T extends Blob | null>(key: string, initialValue: T) {
  const value = shallowRef<T>(initialValue);

  localforage
    .getItem<T>(key)
    .then((item) => {
      if (item !== null) value.value = item;
    })
    .catch((error) => console.error(error));

  function set(next: T) {
    value.value = next;
    localforage.setItem(key, next).catch((error) => console.error(error));
  }

  return { value, set };
}
