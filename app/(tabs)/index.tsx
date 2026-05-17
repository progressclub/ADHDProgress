import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TASKS_KEY = 'adhd_tasks_v1';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  emoji: string;
}

const INITIAL_TASKS: Task[] = [
  { id: '1', title: 'Méditer 5 minutes', completed: false, emoji: '🧘' },
  { id: '2', title: 'Prendre mes médicaments', completed: false, emoji: '💊' },
  { id: '3', title: "Faire 10 min d'exercice", completed: false, emoji: '🏃' },
  { id: '4', title: "Boire de l'eau (2L)", completed: false, emoji: '💧' },
  { id: '5', title: 'Pomodoro de 25 minutes', completed: false, emoji: '🍅' },
  { id: '6', title: 'Ranger mon espace', completed: false, emoji: '✨' },
];

const C = {
  bg: '#F5F3FF',
  card: '#FFFFFF',
  primary: '#7C6CF2',
  primaryLight: '#EDE9FE',
  primaryMuted: '#C4B9FB',
  text: '#1C1B33',
  textSub: '#6B7280',
  textMuted: '#B0B8C1',
  border: '#F0EDF8',
};

function motivationFor(ratio: number, done: number): string {
  if (done === 0) return 'Commençons cette journée ! 🌟';
  if (ratio < 0.3) return 'Super départ, continue ! 💪';
  if (ratio < 0.6) return 'Tu es en bonne voie ! 🔥';
  if (ratio < 1) return 'Presque fini, encore un effort ! 🚀';
  return 'Incroyable ! Toutes les tâches complétées ! 🎉';
}

export default function HomeScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [loaded, setLoaded] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem(TASKS_KEY)
      .then(raw => { if (raw) setTasks(JSON.parse(raw)); })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }, [tasks, loaded]);

  const completedCount = tasks.filter(t => t.completed).length;
  const total = tasks.length;
  const ratio = total > 0 ? completedCount / total : 0;

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: ratio,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  }, [ratio]);

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const raw = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const dateStr = raw.charAt(0).toUpperCase() + raw.slice(1);

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />

      {/* Fixed header */}
      <View style={styles.header}>
        <Text style={styles.logo}>ADHD<Text style={styles.logoAccent}>Progress</Text></Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}>

        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>Bonjour Aron 👋</Text>
          <Text style={styles.date}>{dateStr}</Text>
        </View>

        {/* Routine button */}
        <TouchableOpacity
          style={styles.routineBtn}
          onPress={() => router.push('/routine')}
          activeOpacity={0.85}>
          <Text style={styles.routineBtnText}>Ma routine adaptée</Text>
          <Text style={styles.routineBtnArrow}>→</Text>
        </TouchableOpacity>

        {/* Progress card */}
        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Progression du jour</Text>
            <Text style={styles.progressCount}>{completedCount}/{total}</Text>
          </View>
          <View style={styles.barBg}>
            <Animated.View style={[styles.barFill, { width: barWidth }]} />
          </View>
          <Text style={styles.progressPct}>{Math.round(ratio * 100)}% complété</Text>
          <Text style={styles.motivation}>{motivationFor(ratio, completedCount)}</Text>
        </View>

        {/* Task list */}
        <Text style={styles.sectionTitle}>Tâches du jour</Text>
        <View style={styles.taskList}>
          {tasks.map(task => (
            <TouchableOpacity
              key={task.id}
              style={[styles.taskItem, task.completed && styles.taskItemDone]}
              onPress={() => toggleTask(task.id)}
              activeOpacity={0.7}>
              <View style={[styles.checkbox, task.completed && styles.checkboxDone]}>
                {task.completed && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.taskEmoji}>{task.emoji}</Text>
              <Text style={[styles.taskTitle, task.completed && styles.taskTitleDone]}>
                {task.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {completedCount > 0
              ? `${completedCount} tâche${completedCount > 1 ? 's' : ''} accomplie${completedCount > 1 ? 's' : ''} aujourd'hui`
              : 'Appuie sur une tâche pour la compléter'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1, backgroundColor: C.bg },
  container: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 48 },

  // Fixed header
  header: {
    height: 52,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  logo: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
  },
  logoAccent: { color: C.primary },

  // Greeting
  greeting: { marginBottom: 20 },
  greetingText: {
    fontSize: 30,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
  },
  date: { fontSize: 15, color: C.textSub, marginTop: 4 },

  // Routine button
  routineBtn: {
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  routineBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  routineBtnArrow: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },

  // Progress card
  progressCard: {
    backgroundColor: C.primary,
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressLabel: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  progressCount: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  barBg: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  barFill: { height: '100%', backgroundColor: '#FFFFFF', borderRadius: 8 },
  progressPct: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  motivation: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },

  // Tasks
  sectionTitle: { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 16 },
  taskList: { gap: 12 },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  taskItemDone: { backgroundColor: '#FAFAF8', borderColor: '#EBEBEB', opacity: 0.72 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: C.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxDone: { backgroundColor: C.primary, borderColor: C.primary },
  checkmark: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  taskEmoji: { fontSize: 20, marginRight: 12 },
  taskTitle: { flex: 1, fontSize: 16, fontWeight: '500', color: C.text },
  taskTitleDone: { color: C.textMuted, textDecorationLine: 'line-through' },

  // Footer
  footer: { alignItems: 'center', marginTop: 32 },
  footerText: { fontSize: 14, color: C.textSub, textAlign: 'center' },
});
