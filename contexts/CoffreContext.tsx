import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Folder {
  id: string;
  name: string;
}

export interface CoffreNote {
  id: string;
  folderId: string;
  title: string;
  content: string;
  updatedAt: string;
}

interface CoffreState {
  folders: Folder[];
  notes: CoffreNote[];
}

interface CoffreContextValue {
  folders: Folder[];
  notes: CoffreNote[];
  addFolder: (name: string) => Folder;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  saveNote: (data: { id?: string; folderId: string; title: string; content: string }) => CoffreNote;
  deleteNote: (id: string) => void;
  getNotesInFolder: (folderId: string) => CoffreNote[];
}

export const SANS_DOSSIER_ID = 'f_sans_dossier';

const DEFAULT_FOLDERS: Folder[] = [
  { id: 'f_default_1', name: 'Projets personnels' },
  { id: 'f_default_2', name: 'Films et séries à voir' },
  { id: 'f_default_3', name: 'Travail' },
  { id: 'f_default_4', name: 'Idées' },
];

const STORAGE_KEY = 'adhd_coffre_v1';

const CoffreContext = createContext<CoffreContextValue>({} as CoffreContextValue);

export function CoffreProvider({ children }: { children: React.ReactNode }) {
  const [coffreState, setCoffreState] = useState<CoffreState>({
    folders: DEFAULT_FOLDERS,
    notes: [],
  });
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const data = JSON.parse(raw) as CoffreState;
          setCoffreState({
            folders: data.folders?.length ? data.folders : DEFAULT_FOLDERS,
            notes: data.notes || [],
          });
        } catch {}
      }
      loaded.current = true;
    });
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(coffreState));
  }, [coffreState]);

  const addFolder = useCallback((name: string): Folder => {
    const folder: Folder = { id: `f_${Date.now()}`, name };
    setCoffreState(prev => ({ ...prev, folders: [...prev.folders, folder] }));
    return folder;
  }, []);

  const renameFolder = useCallback((id: string, name: string) => {
    setCoffreState(prev => ({
      ...prev,
      folders: prev.folders.map(f => (f.id === id ? { ...f, name } : f)),
    }));
  }, []);

  const deleteFolder = useCallback((id: string) => {
    setCoffreState(prev => ({
      folders: prev.folders.filter(f => f.id !== id),
      notes: prev.notes.filter(n => n.folderId !== id),
    }));
  }, []);

  const saveNote = useCallback(
    (data: { id?: string; folderId: string; title: string; content: string }): CoffreNote => {
      const now = new Date().toISOString();
      const note: CoffreNote = {
        id: data.id || `n_${Date.now()}`,
        folderId: data.folderId,
        title: data.title,
        content: data.content,
        updatedAt: now,
      };
      setCoffreState(prev => {
        const exists = data.id && prev.notes.some(n => n.id === data.id);
        return {
          ...prev,
          notes: exists
            ? prev.notes.map(n => (n.id === data.id ? note : n))
            : [...prev.notes, note],
        };
      });
      return note;
    },
    [],
  );

  const deleteNote = useCallback((id: string) => {
    setCoffreState(prev => ({ ...prev, notes: prev.notes.filter(n => n.id !== id) }));
  }, []);

  const getNotesInFolder = useCallback(
    (folderId: string): CoffreNote[] =>
      coffreState.notes.filter(n => n.folderId === folderId),
    [coffreState.notes],
  );

  return (
    <CoffreContext.Provider
      value={{
        folders: coffreState.folders,
        notes: coffreState.notes,
        addFolder,
        renameFolder,
        deleteFolder,
        saveNote,
        deleteNote,
        getNotesInFolder,
      }}>
      {children}
    </CoffreContext.Provider>
  );
}

export function useCoffre() {
  return useContext(CoffreContext);
}
