import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Priority = 'haute' | 'normale' | 'basse';

export interface DayTask {
  id: string;
  title: string;
  priority: Priority;
  deadline?: string;
  completed: boolean;
}

const DAY_TASKS_PREFIX = 'adhd_day_tasks_';

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayKey(): string {
  return `${DAY_TASKS_PREFIX}${toISO(new Date())}`;
}

interface DayTasksContextValue {
  todayTasks: DayTask[];
  persistTodayTasks: (tasks: DayTask[]) => void;
}

const DayTasksContext = createContext<DayTasksContextValue>({
  todayTasks: [],
  persistTodayTasks: () => {},
});

export function DayTasksProvider({ children }: { children: React.ReactNode }) {
  const [todayTasks, setTodayTasks] = useState<DayTask[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(todayKey()).then(raw => {
      if (raw) setTodayTasks(JSON.parse(raw));
    });
  }, []);

  const persistTodayTasks = useCallback((tasks: DayTask[]) => {
    setTodayTasks(tasks);
    AsyncStorage.setItem(todayKey(), JSON.stringify(tasks));
  }, []);

  return (
    <DayTasksContext.Provider value={{ todayTasks, persistTodayTasks }}>
      {children}
    </DayTasksContext.Provider>
  );
}

export function useDayTasks() {
  return useContext(DayTasksContext);
}
