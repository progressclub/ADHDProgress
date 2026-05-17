import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

// ─── Types ───────────────────────────────────────────────────────────────────

type Priority = 'haute' | 'normale' | 'basse';

interface DayTask {
  id: string;
  title: string;
  priority: Priority;
  deadline?: string;
  completed: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

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

const PRIORITY_COLOR: Record<Priority, string> = {
  haute: '#EF4444',
  normale: '#F97316',
  basse: '#22C55E',
};

const PRIORITY_BG: Record<Priority, string> = {
  haute: '#FEF2F2',
  normale: '#FFF7ED',
  basse: '#F0FDF4',
};

const PRIORITY_LABEL: Record<Priority, string> = {
  haute: 'Haute',
  normale: 'Normale',
  basse: 'Basse',
};

// Width of the revealed delete zone
const DELETE_W = 88;

// Spring config: tight enough to feel snappy, gentle enough to feel natural
const SPRING = { damping: 20, stiffness: 220, mass: 0.9 };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function storageKey(date: Date): string {
  return `adhd_day_tasks_${toISO(date)}`;
}

function formatDay(date: Date): string {
  const raw = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function shiftDay(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isToday(date: Date): boolean {
  return toISO(date) === toISO(new Date());
}

// ─── SwipeableTaskRow ────────────────────────────────────────────────────────
//
// Layout principle (mimics iOS Mail):
//   ┌─────────────────────────────────────────┐  ← container, overflow:hidden
//   │  [DELETE BUTTON — absolute right: 0   ] │  ← always rendered, behind
//   │  [     WHITE ROW — slides left        ] │  ← covers delete, moves on swipe
//   └─────────────────────────────────────────┘
//
// As the row slides left by DELETE_W, it progressively exposes the red zone.
// On release: springs to -DELETE_W (open) or 0 (closed) depending on velocity/distance.

interface RowProps {
  task: DayTask;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function SwipeableTaskRow({ task, onToggle, onDelete }: RowProps) {
  const x = useSharedValue(0);

  const pan = Gesture.Pan()
    // Only activate for clearly horizontal movement
    .activeOffsetX([-8, 8])
    .failOffsetY([-14, 14])
    .onUpdate(e => {
      // Allow only left swipe, capped at DELETE_W
      x.value = Math.max(-DELETE_W, Math.min(0, e.translationX));
    })
    .onEnd(e => {
      const pastHalf = x.value < -(DELETE_W / 2);
      const fastSwipe = e.velocityX < -600;
      x.value = withSpring(pastHalf || fastSwipe ? -DELETE_W : 0, SPRING);
    });

  // The white row slides left, revealing the red zone underneath
  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  // The "Supprimer" text fades in progressively as the row opens
  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(-x.value, [0, DELETE_W * 0.5, DELETE_W], [0, 0.5, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateX: interpolate(
          -x.value,
          [0, DELETE_W],
          [10, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  // Tapping an open row closes it before toggling
  const handleRowPress = () => {
    if (x.value < 0) {
      x.value = withSpring(0, SPRING);
    }
    onToggle(task.id);
  };

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.swipeContainer}>
        {/* ── Delete zone — always behind the white row ── */}
        <View style={styles.deleteZone}>
          <TouchableOpacity
            style={styles.deleteInner}
            onPress={() => onDelete(task.id)}
            activeOpacity={0.85}>
            <Animated.Text style={[styles.deleteText, textStyle]}>Supprimer</Animated.Text>
          </TouchableOpacity>
        </View>

        {/* ── White row — slides left to reveal delete zone ── */}
        <Animated.View style={[styles.taskRowWrap, rowStyle]}>
          <TouchableOpacity style={styles.taskRow} onPress={handleRowPress} activeOpacity={0.7}>
            <View style={[styles.checkbox, task.completed && styles.checkboxDone]}>
              {task.completed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLOR[task.priority] }]} />
            <Text style={[styles.taskTitle, task.completed && styles.taskTitleDone]} numberOfLines={2}>
              {task.title}
            </Text>
            <View style={styles.taskRight}>
              {task.deadline && <Text style={styles.deadlineText}>{task.deadline}</Text>}
              <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_BG[task.priority] }]}>
                <Text style={[styles.priorityBadgeText, { color: PRIORITY_COLOR[task.priority] }]}>
                  {PRIORITY_LABEL[task.priority]}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function TachesScreen() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<DayTask[]>([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('normale');
  const [deadlineEnabled, setDeadlineEnabled] = useState(false);
  const [deadlineTime, setDeadlineTime] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(storageKey(currentDate)).then(raw => {
      setTasks(raw ? JSON.parse(raw) : []);
    });
  }, [currentDate]);

  const persistTasks = useCallback(
    (next: DayTask[]) => {
      setTasks(next);
      AsyncStorage.setItem(storageKey(currentDate), JSON.stringify(next));
    },
    [currentDate],
  );

  const toggleTask = (id: string) =>
    persistTasks(tasks.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)));

  const deleteTask = (id: string) =>
    persistTasks(tasks.filter(t => t.id !== id));

  const openModal = () => {
    setTitle('');
    setPriority('normale');
    setDeadlineEnabled(false);
    setDeadlineTime('');
    setModalVisible(true);
  };

  const addTask = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    persistTasks([
      ...tasks,
      {
        id: Date.now().toString(),
        title: trimmed,
        priority,
        deadline: deadlineEnabled && deadlineTime.trim() ? deadlineTime.trim() : undefined,
        completed: false,
      },
    ]);
    setModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        <Text style={styles.pageTitle}>Mes tâches</Text>

        <View style={styles.card}>
          {/* ── Date navigation ── */}
          <View style={styles.dateBar}>
            <TouchableOpacity style={styles.arrowBtn} onPress={() => setCurrentDate(d => shiftDay(d, -1))} hitSlop={8}>
              <Text style={styles.arrowText}>←</Text>
            </TouchableOpacity>
            <View style={styles.dateLabelWrap}>
              <Text style={styles.dateLabel}>{formatDay(currentDate)}</Text>
              {isToday(currentDate) && (
                <View style={styles.todayBadge}>
                  <Text style={styles.todayBadgeText}>aujourd'hui</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.arrowBtn} onPress={() => setCurrentDate(d => shiftDay(d, 1))} hitSlop={8}>
              <Text style={styles.arrowText}>→</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* ── Add row ── */}
          <TouchableOpacity style={styles.addRow} onPress={openModal} activeOpacity={0.7}>
            <Text style={styles.addRowText}>Ajouter une nouvelle tâche</Text>
            <View style={styles.addIconWrap}>
              <Text style={styles.addIcon}>+</Text>
            </View>
          </TouchableOpacity>

          {/* ── Task list ── */}
          {tasks.length > 0 && <View style={styles.divider} />}
          {tasks.map((task, idx) => (
            <React.Fragment key={task.id}>
              <SwipeableTaskRow task={task} onToggle={toggleTask} onDelete={deleteTask} />
              {idx < tasks.length - 1 && <View style={styles.rowDivider} />}
            </React.Fragment>
          ))}

          {tasks.length === 0 && (
            <Text style={styles.emptyText}>Aucune tâche pour ce jour</Text>
          )}
        </View>
      </ScrollView>

      {/* ── Add task modal ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Nouvelle tâche</Text>

            <Text style={styles.fieldLabel}>Titre</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex : Appeler le médecin"
              placeholderTextColor={C.textMuted}
              value={title}
              onChangeText={setTitle}
              autoFocus
              returnKeyType="done"
            />

            <Text style={styles.fieldLabel}>Priorité</Text>
            <View style={styles.priorityRow}>
              {(['haute', 'normale', 'basse'] as Priority[]).map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.priorityBtn, { borderColor: PRIORITY_COLOR[p] }, priority === p && { backgroundColor: PRIORITY_COLOR[p] }]}
                  onPress={() => setPriority(p)}
                  activeOpacity={0.75}>
                  <Text style={[styles.priorityBtnText, { color: priority === p ? '#FFFFFF' : PRIORITY_COLOR[p] }]}>
                    {PRIORITY_LABEL[p]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.deadlineRow}>
              <Text style={styles.fieldLabel}>Deadline</Text>
              <Switch
                value={deadlineEnabled}
                onValueChange={setDeadlineEnabled}
                trackColor={{ false: '#E5E7EB', true: C.primaryMuted }}
                thumbColor={deadlineEnabled ? C.primary : '#F9FAFB'}
              />
            </View>
            {deadlineEnabled && (
              <TextInput
                style={[styles.input, styles.inputTime]}
                placeholder="Ex : 18h00"
                placeholderTextColor={C.textMuted}
                value={deadlineTime}
                onChangeText={setDeadlineTime}
                returnKeyType="done"
              />
            )}

            <TouchableOpacity
              style={[styles.addBtn, !title.trim() && styles.addBtnDisabled]}
              onPress={addTask}
              disabled={!title.trim()}
              activeOpacity={0.85}>
              <Text style={styles.addBtnText}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 },

  pageTitle: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5, marginBottom: 20 },

  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },

  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: C.primaryLight,
  },
  arrowBtn: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, backgroundColor: 'rgba(124,108,242,0.12)',
  },
  arrowText: { fontSize: 18, color: C.primary, fontWeight: '700', lineHeight: 22 },
  dateLabelWrap: { flex: 1, alignItems: 'center', gap: 4 },
  dateLabel: { fontSize: 16, fontWeight: '700', color: C.text, textAlign: 'center' },
  todayBadge: { backgroundColor: C.primary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  todayBadgeText: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },

  divider: { height: 1, backgroundColor: C.border },
  rowDivider: { height: 1, backgroundColor: '#F8F7FF', marginLeft: 56 },

  addRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, gap: 12 },
  addRowText: { flex: 1, fontSize: 15, fontWeight: '600', color: C.primary },
  addIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  addIcon: { fontSize: 18, color: C.primary, fontWeight: '700', lineHeight: 22 },

  // ── Swipe-to-delete ──
  swipeContainer: {
    overflow: 'hidden', // clips the sliding row on the left edge
  },
  deleteZone: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_W,
    backgroundColor: '#EF4444',
  },
  deleteInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  taskRowWrap: {
    backgroundColor: C.card, // white bg covers the delete zone when closed
  },

  // ── Task row content ──
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: C.primaryMuted, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  checkboxDone: { backgroundColor: C.primary, borderColor: C.primary },
  checkmark: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  priorityDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  taskTitle: { flex: 1, fontSize: 15, fontWeight: '500', color: C.text, lineHeight: 20 },
  taskTitleDone: { color: C.textMuted, textDecorationLine: 'line-through' },
  taskRight: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  deadlineText: { fontSize: 12, color: C.textSub, fontWeight: '500' },
  priorityBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  priorityBadgeText: { fontSize: 11, fontWeight: '700' },
  emptyText: { fontSize: 14, color: C.textMuted, textAlign: 'center', paddingVertical: 24, paddingHorizontal: 16 },

  // ── Modal ──
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    paddingTop: 12,
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 20, letterSpacing: -0.3 },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.textSub, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#F9F8FF', borderRadius: 12, borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: C.text, marginBottom: 20,
  },
  inputTime: { marginBottom: 0 },

  priorityRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  priorityBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  priorityBtnText: { fontSize: 13, fontWeight: '700' },

  deadlineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },

  addBtn: {
    backgroundColor: C.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
  },
  addBtnDisabled: { backgroundColor: C.primaryMuted, shadowOpacity: 0, elevation: 0 },
  addBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
