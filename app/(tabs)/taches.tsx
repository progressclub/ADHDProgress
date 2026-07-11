import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import DraggableFlatList, { ScaleDecorator, type RenderItemParams } from 'react-native-draggable-flatlist';
import * as Haptics from 'expo-haptics';
import { useDayTasks } from '@/contexts/DayTasksContext';
import type { Priority, DayTask } from '@/contexts/DayTasksContext';

interface SavedTask {
  id: string;
  title: string;
  priority: Priority;
  categories: string[];
}

interface TaskBounds {
  x: number;
  y: number;
  width: number;
  height: number;
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

const DELETE_W = 88;
const SPRING = { damping: 20, stiffness: 220, mass: 0.9 };
const SCREEN_H = Dimensions.get('window').height;

const PICKER_H = 44;
const HOURS_LIST = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES_LIST = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

const PREDEFINED_CATEGORIES = ['Ma routine du matin', 'Ma routine du soir'];

const DAY_TASKS_PREFIX = 'adhd_day_tasks_';
const SAVED_TASKS_KEY = 'adhd_saved_tasks_v1';
const CUSTOM_CATS_KEY = 'adhd_custom_categories_v1';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function storageKey(date: Date): string {
  return `${DAY_TASKS_PREFIX}${toISO(date)}`;
}
function formatDay(date: Date): string {
  const raw = date.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
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

function deadlineStringToDate(s: string): Date {
  const match = s.match(/^(\d{1,2})h(\d{2})$/);
  const d = new Date();
  if (match) d.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
  return d;
}
function dateToDeadlineString(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`;
}

type GroupedSection = { category: string; tasks: SavedTask[] };

function normalizeSaved(raw: any[]): SavedTask[] {
  return raw.map(t => ({
    ...t,
    priority: t.priority ?? 'normale',
    categories: t.categories ?? (t.category ? [t.category] : []),
  }));
}

function buildGroups(
  saved: SavedTask[],
  query: string,
  customCats: string[],
): GroupedSection[] {
  const q = query.toLowerCase().trim();
  const filtered = q ? saved.filter(t => t.title.toLowerCase().includes(q)) : saved;

  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const cat of [...PREDEFINED_CATEGORIES, ...customCats]) {
    if (!seen.has(cat)) { seen.add(cat); ordered.push(cat); }
  }
  for (const t of filtered) {
    for (const cat of t.categories) {
      if (!seen.has(cat)) { seen.add(cat); ordered.push(cat); }
    }
  }
  ordered.push('Autres');

  const groups = new Map<string, SavedTask[]>();
  for (const t of filtered) {
    const cats = t.categories.length > 0 ? t.categories : ['Autres'];
    for (const cat of cats) {
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(t);
    }
  }

  return ordered
    .filter(cat => groups.has(cat))
    .map(cat => ({ category: cat, tasks: groups.get(cat)! }));
}

// ─── SwipeableTaskRow ────────────────────────────────────────────────────────

interface RowProps {
  task: DayTask;
  drag: () => void;
  isActive: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onLongPress: (task: DayTask, bounds: TaskBounds) => void;
}

function SwipeableTaskRow({ task, drag, isActive, onToggle, onDelete, onLongPress }: RowProps) {
  const containerRef = useRef<View>(null);
  const x = useSharedValue(0);

  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-14, 14])
    .enabled(!isActive)
    .onUpdate(e => {
      x.value = Math.max(-DELETE_W, Math.min(0, e.translationX));
    })
    .onEnd(e => {
      const open = x.value < -(DELETE_W / 2) || e.velocityX < -600;
      x.value = withSpring(open ? -DELETE_W : 0, SPRING);
    });

  const measureAndOpen = () => {
    containerRef.current?.measureInWindow((mx, my, mw, mh) => {
      onLongPress(task, { x: mx, y: my, width: mw, height: mh });
    });
  };

  const longPress = Gesture.LongPress()
    .minDuration(400)
    .enabled(!isActive)
    .onStart(() => { runOnJS(measureAndOpen)(); });

  const combined = Gesture.Race(pan, longPress);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(-x.value, [0, DELETE_W * 0.5, DELETE_W], [0, 0.5, 1], Extrapolation.CLAMP),
    transform: [{ translateX: interpolate(-x.value, [0, DELETE_W], [10, 0], Extrapolation.CLAMP) }],
  }));

  const handleRowPress = () => {
    if (isActive) return;
    if (x.value < 0) { x.value = withSpring(0, SPRING); return; }
    onToggle(task.id);
  };

  return (
    <View ref={containerRef} style={styles.rowOuter}>
      {/* Swipe-to-delete + long-press context menu */}
      <GestureDetector gesture={combined}>
        <View style={styles.swipeContainer}>
          <View style={styles.deleteZone}>
            <TouchableOpacity style={styles.deleteInner} onPress={() => onDelete(task.id)} activeOpacity={0.85}>
              <Animated.Text style={[styles.deleteText, textStyle]}>Supprimer</Animated.Text>
            </TouchableOpacity>
          </View>
          <Animated.View style={[styles.taskRowWrap, rowStyle]}>
            <TouchableOpacity style={styles.taskRow} onPress={handleRowPress} activeOpacity={0.7}>
              <View style={[styles.checkbox, task.completed && styles.checkboxDone]}>
                {task.completed && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLOR[task.priority] }]} />
              <View style={styles.taskTextCol}>
                <Text style={[styles.taskTitle, task.completed && styles.taskTitleDone]} numberOfLines={2}>
                  {task.title}
                </Text>
                {task.deadline && (
                  <Text style={styles.deadlineSub}>{task.deadline}</Text>
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </GestureDetector>

      {/* Drag handle — long press initiates DraggableFlatList drag */}
      <Pressable
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          drag();
        }}
        delayLongPress={150}
        style={styles.dragHandle}
        hitSlop={4}>
        <View style={styles.dragLine} />
        <View style={styles.dragLine} />
        <View style={styles.dragLine} />
      </Pressable>
    </View>
  );
}

// ─── SavedTaskRow ─────────────────────────────────────────────────────────────

interface SavedRowProps {
  saved: SavedTask;
  onAdd: (s: SavedTask) => void;
  onLongPress: (s: SavedTask, bounds: TaskBounds) => void;
}

function SavedTaskRow({ saved, onAdd, onLongPress }: SavedRowProps) {
  const rowRef = useRef<View>(null);

  const handleLongPress = () => {
    rowRef.current?.measureInWindow((mx, my, mw, mh) => {
      onLongPress(saved, { x: mx, y: my, width: mw, height: mh });
    });
  };

  return (
    <Pressable
      ref={rowRef}
      style={styles.savedRow}
      onLongPress={handleLongPress}
      delayLongPress={400}>
      <Text style={styles.savedTaskTitle} numberOfLines={1}>{saved.title}</Text>
      <TouchableOpacity
        style={styles.addToDayBtn}
        onPress={() => onAdd(saved)}
        activeOpacity={0.75}>
        <Text style={styles.addToDayIcon}>+</Text>
      </TouchableOpacity>
    </Pressable>
  );
}

// ─── AccordionHeader ─────────────────────────────────────────────────────────

interface AccordionHeaderProps {
  category: string;
  isOpen: boolean;
  onToggle: () => void;
  onLongPress: (bounds: TaskBounds) => void;
}

function AccordionHeader({ category, isOpen, onToggle, onLongPress }: AccordionHeaderProps) {
  const ref = useRef<any>(null);
  const handleLongPress = () => {
    ref.current?.measureInWindow((mx: number, my: number, mw: number, mh: number) => {
      onLongPress({ x: mx, y: my, width: mw, height: mh });
    });
  };
  return (
    <Pressable
      ref={ref}
      style={styles.accordionHeader}
      onPress={onToggle}
      onLongPress={handleLongPress}
      delayLongPress={400}>
      <Text style={styles.accordionTitle}>{category}</Text>
      <Text style={styles.accordionChevron}>{isOpen ? '▾' : '▸'}</Text>
    </Pressable>
  );
}

// ─── ScrollCol ───────────────────────────────────────────────────────────────

interface ScrollColProps {
  items: string[];
  initialIndex: number;
  onChange: (index: number) => void;
}

function ScrollCol({ items, initialIndex, onChange }: ScrollColProps) {
  const scrollRef = useRef<ScrollView>(null);
  // Local state: never driven by parent after mount — avoids re-render interference
  const [current, setCurrent] = useState(initialIndex);
  // Ref so commit() always calls the latest onChange without re-creating handlers
  const onChangeFn = useRef(onChange);
  useEffect(() => { onChangeFn.current = onChange; });
  // Flag to distinguish momentum scroll from static drag-and-release
  const hasMomentum = useRef(false);

  // Scroll to initial position once, after layout
  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: initialIndex * PICKER_H, animated: false });
    }, 50);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = (rawY: number) => {
    const idx = Math.max(0, Math.min(items.length - 1, Math.round(rawY / PICKER_H)));
    setCurrent(idx);
    onChangeFn.current(idx);
    // No scrollTo here — snapToInterval handles the snap natively
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.pickerCol}
      showsVerticalScrollIndicator={false}
      snapToInterval={PICKER_H}
      decelerationRate="fast"
      contentContainerStyle={{ paddingVertical: PICKER_H }}
      onMomentumScrollBegin={() => { hasMomentum.current = true; }}
      onMomentumScrollEnd={e => {
        hasMomentum.current = false;
        commit(e.nativeEvent.contentOffset.y);
      }}
      onScrollEndDrag={e => {
        // Only commit here when no momentum follows (slow drag-and-release)
        const y = e.nativeEvent.contentOffset.y;
        setTimeout(() => {
          if (!hasMomentum.current) commit(y);
        }, 50);
      }}>
      {items.map((label, i) => (
        <TouchableOpacity
          key={i}
          style={styles.pickerItem}
          onPress={() => {
            setCurrent(i);
            onChangeFn.current(i);
            scrollRef.current?.scrollTo({ y: i * PICKER_H, animated: true });
          }}
          activeOpacity={0.6}>
          <Text style={[styles.pickerItemText, i === current && styles.pickerItemSelected]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─── TimeScrollPicker ─────────────────────────────────────────────────────────

interface TimeScrollPickerProps {
  value: Date;
  onChange: (date: Date) => void;
}

function TimeScrollPicker({ value, onChange }: TimeScrollPickerProps) {
  // Ref so onChange callbacks always read the latest value without stale closures
  const valueRef = useRef(value);
  valueRef.current = value;

  return (
    <View style={styles.pickerWrap}>
      <View style={styles.pickerHighlight} pointerEvents="none" />
      <ScrollCol
        items={HOURS_LIST}
        initialIndex={value.getHours()}
        onChange={idx => { const d = new Date(valueRef.current); d.setHours(idx); onChange(d); }}
      />
      <Text style={styles.pickerSep}>h</Text>
      <ScrollCol
        items={MINUTES_LIST}
        initialIndex={value.getMinutes()}
        onChange={idx => { const d = new Date(valueRef.current); d.setMinutes(idx); onChange(d); }}
      />
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function TachesScreen() {
  // ── Day tasks ──
  const { todayTasks, persistTodayTasks } = useDayTasks();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<DayTask[]>([]);

  // ── Saved tasks ──
  const [savedTasks, setSavedTasks] = useState<SavedTask[]>([]);
  const [customCats, setCustomCats] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [expandedCats, setExpandedCats] = useState<string[]>([]);

  // ── Category context overlay ──
  const [catCtx, setCatCtx] = useState<{
    category: string;
    bounds: TaskBounds;
  } | null>(null);

  // ── Edit category modal ──
  const [editCatModal, setEditCatModal] = useState(false);
  const [editCatOriginal, setEditCatOriginal] = useState('');
  const [editCatName, setEditCatName] = useState('');
  const [deleteCatConfirm, setDeleteCatConfirm] = useState(false);

  // ── "Add to day" modal state ──
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addPriority, setAddPriority] = useState<Priority>('normale');
  const [deadlineEnabled, setDeadlineEnabled] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState(new Date());

  // ── Context overlay (Instagram-style) ──
  const [ctx, setCtx] = useState<{
    type: 'day' | 'saved';
    task: DayTask | SavedTask;
    bounds: TaskBounds;
  } | null>(null);

  // ── Edit day task modal ──
  const [editDayModal, setEditDayModal] = useState(false);
  const [editDayId, setEditDayId] = useState('');
  const [editDayTitle, setEditDayTitle] = useState('');
  const [editDayPriority, setEditDayPriority] = useState<Priority>('normale');
  const [editDayDeadlineEnabled, setEditDayDeadlineEnabled] = useState(false);
  const [editDayDeadlineDate, setEditDayDeadlineDate] = useState(new Date());

  // ── Edit saved task modal ──
  const [editSavedModal, setEditSavedModal] = useState(false);
  const [editSavedId, setEditSavedId] = useState('');
  const [editSavedTitle, setEditSavedTitle] = useState('');
  const [editSavedPriority, setEditSavedPriority] = useState<Priority>('normale');
  const [editSavedCatEnabled, setEditSavedCatEnabled] = useState(false);
  const [editSavedCats, setEditSavedCats] = useState<string[]>([]);
  const [editCreatingCat, setEditCreatingCat] = useState(false);
  const [editNewCatName, setEditNewCatName] = useState('');

  // ── "Save task" modal state ──
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [savePriority, setSavePriority] = useState<Priority>('normale');
  const [catEnabled, setCatEnabled] = useState(false);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [creatingCat, setCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Load day tasks (context handles today; AsyncStorage for other dates)
  useEffect(() => {
    if (isToday(currentDate)) return;
    AsyncStorage.getItem(storageKey(currentDate)).then(raw => {
      setTasks(raw ? JSON.parse(raw) : []);
    });
  }, [currentDate]);

  // Load saved tasks + categories once
  useEffect(() => {
    AsyncStorage.multiGet([SAVED_TASKS_KEY, CUSTOM_CATS_KEY]).then(
      ([[, st], [, cc]]) => {
        if (st) setSavedTasks(normalizeSaved(JSON.parse(st)));
        if (cc) setCustomCats(JSON.parse(cc));
      },
    );
  }, []);

  const persistDayTasks = useCallback(
    (next: DayTask[]) => {
      if (isToday(currentDate)) {
        persistTodayTasks(next);
      } else {
        setTasks(next);
        AsyncStorage.setItem(storageKey(currentDate), JSON.stringify(next));
      }
    },
    [currentDate, persistTodayTasks],
  );

  // Tasks to display: context for today, local state for other dates
  const displayTasks = isToday(currentDate) ? todayTasks : tasks;

  const persistSavedTasks = (next: SavedTask[]) => {
    setSavedTasks(next);
    AsyncStorage.setItem(SAVED_TASKS_KEY, JSON.stringify(next));
  };
  const persistCustomCats = (next: string[]) => {
    setCustomCats(next);
    AsyncStorage.setItem(CUSTOM_CATS_KEY, JSON.stringify(next));
  };

  // ── Day task handlers ──
  const toggleTask = (id: string) =>
    persistDayTasks(displayTasks.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)));
  const deleteTask = (id: string) =>
    persistDayTasks(displayTasks.filter(t => t.id !== id));

  const openAddModal = () => {
    setAddTitle(''); setAddPriority('normale');
    setDeadlineEnabled(false); setDeadlineDate(new Date());
    setAddModalVisible(true);
  };
  const confirmAddTask = () => {
    const trimmed = addTitle.trim();
    if (!trimmed) return;
    persistDayTasks([
      ...displayTasks,
      {
        id: Date.now().toString(), title: trimmed, priority: addPriority,
        deadline: deadlineEnabled ? dateToDeadlineString(deadlineDate) : undefined,
        completed: false,
      },
    ]);
    setAddModalVisible(false);
  };

  const addSavedToDay = (saved: SavedTask) => {
    persistDayTasks([
      ...displayTasks,
      { id: Date.now().toString(), title: saved.title, priority: saved.priority, completed: false },
    ]);
  };

  // ── Context overlay animations ──
  const blurOpacity  = useSharedValue(0);
  const liftY        = useSharedValue(0);
  const menuOpacity  = useSharedValue(0);
  const menuY        = useSharedValue(10);

  const blurStyle  = useAnimatedStyle(() => ({ opacity: blurOpacity.value }));
  const liftStyle  = useAnimatedStyle(() => ({ transform: [{ translateY: liftY.value }] }));
  const menuStyle  = useAnimatedStyle(() => ({
    opacity: menuOpacity.value,
    transform: [{ translateY: menuY.value }],
  }));

  const openCtx = (type: 'day' | 'saved', task: DayTask | SavedTask, bounds: TaskBounds) => {
    blurOpacity.value = 0; liftY.value = 0; menuOpacity.value = 0; menuY.value = 10;
    setCtx({ type, task, bounds });
    blurOpacity.value = withTiming(1, { duration: 260 });
    liftY.value       = withSpring(-10, { damping: 16, stiffness: 200 });
    menuOpacity.value = withTiming(1, { duration: 220 });
    menuY.value       = withTiming(0,  { duration: 240 });
  };

  const closeCtx = () => {
    blurOpacity.value = withTiming(0, { duration: 200 });
    liftY.value       = withTiming(0, { duration: 180 });
    menuOpacity.value = withTiming(0, { duration: 160 }, (finished) => {
      if (finished) runOnJS(setCtx)(null);
    });
  };

  const handleCtxEdit = () => {
    if (!ctx) return;
    const { type, task } = ctx;
    if (type === 'day') {
      const t = task as DayTask;
      setEditDayId(t.id); setEditDayTitle(t.title); setEditDayPriority(t.priority);
      setEditDayDeadlineEnabled(!!t.deadline);
      setEditDayDeadlineDate(t.deadline ? deadlineStringToDate(t.deadline) : new Date());
    } else {
      const t = task as SavedTask;
      setEditSavedId(t.id); setEditSavedTitle(t.title); setEditSavedPriority(t.priority);
      setEditSavedCatEnabled(t.categories.length > 0); setEditSavedCats(t.categories);
      setEditCreatingCat(false); setEditNewCatName('');
    }
    blurOpacity.value = withTiming(0, { duration: 200 });
    liftY.value       = withTiming(0, { duration: 180 });
    menuOpacity.value = withTiming(0, { duration: 160 }, (finished) => {
      if (finished) {
        runOnJS(setCtx)(null);
        if (type === 'day') runOnJS(setEditDayModal)(true);
        else runOnJS(setEditSavedModal)(true);
      }
    });
  };

  const handleCtxDelete = () => {
    if (!ctx || ctx.type !== 'saved') return;
    const taskId = ctx.task.id;
    blurOpacity.value = withTiming(0, { duration: 180 });
    liftY.value       = withTiming(0, { duration: 160 });
    menuOpacity.value = withTiming(0, { duration: 140 }, (finished) => {
      if (finished) {
        runOnJS(setCtx)(null);
        runOnJS(persistSavedTasks)(savedTasks.filter(t => t.id !== taskId));
      }
    });
  };

  // ── Edit handlers ──
  const confirmEditDay = () => {
    const trimmed = editDayTitle.trim();
    if (!trimmed) return;
    persistDayTasks(displayTasks.map(t =>
      t.id === editDayId
        ? { ...t, title: trimmed, priority: editDayPriority, deadline: editDayDeadlineEnabled ? dateToDeadlineString(editDayDeadlineDate) : undefined }
        : t
    ));
    setEditDayModal(false);
  };

  const confirmEditNewCat = () => {
    const newCat = editNewCatName.trim();
    if (!newCat) return;
    if (!customCats.includes(newCat)) persistCustomCats([...customCats, newCat]);
    setEditSavedCats(prev => prev.includes(newCat) ? prev : [...prev, newCat]);
    setEditCreatingCat(false); setEditNewCatName('');
  };

  const confirmEditSaved = () => {
    const trimmed = editSavedTitle.trim();
    if (!trimmed) return;
    persistSavedTasks(savedTasks.map(t =>
      t.id === editSavedId
        ? { ...t, title: trimmed, priority: editSavedPriority, categories: editSavedCatEnabled ? editSavedCats : [] }
        : t
    ));
    setEditSavedModal(false);
  };

  // ── Save task handlers ──
  const openSaveModal = () => {
    setSaveTitle(''); setSavePriority('normale'); setCatEnabled(false);
    setSelectedCats([]); setCreatingCat(false); setNewCatName('');
    setSaveModalVisible(true);
  };

  const toggleCat = (cat: string) =>
    setSelectedCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

  const confirmNewCat = () => {
    const newCat = newCatName.trim();
    if (!newCat) return;
    if (!customCats.includes(newCat)) persistCustomCats([...customCats, newCat]);
    setSelectedCats(prev => prev.includes(newCat) ? prev : [...prev, newCat]);
    setCreatingCat(false);
    setNewCatName('');
  };

  const confirmSaveTask = () => {
    const trimmed = saveTitle.trim();
    if (!trimmed) return;
    persistSavedTasks([
      ...savedTasks,
      { id: Date.now().toString(), title: trimmed, priority: savePriority, categories: catEnabled ? selectedCats : [] },
    ]);
    setSaveModalVisible(false);
  };

  const canSave = saveTitle.trim().length > 0;

  const toggleAccordion = (cat: string) =>
    setExpandedCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

  // ── Category context overlay ──
  const openCatCtx = (category: string, bounds: TaskBounds) => {
    blurOpacity.value = 0; liftY.value = 0; menuOpacity.value = 0; menuY.value = 10;
    setCatCtx({ category, bounds });
    blurOpacity.value = withTiming(1, { duration: 260 });
    liftY.value       = withSpring(-10, { damping: 16, stiffness: 200 });
    menuOpacity.value = withTiming(1, { duration: 220 });
    menuY.value       = withTiming(0, { duration: 240 });
  };

  const closeCatCtx = () => {
    blurOpacity.value = withTiming(0, { duration: 200 });
    liftY.value       = withTiming(0, { duration: 180 });
    menuOpacity.value = withTiming(0, { duration: 160 }, (finished) => {
      if (finished) runOnJS(setCatCtx)(null);
    });
  };

  const handleCatCtxEdit = () => {
    if (!catCtx) return;
    const cat = catCtx.category;
    setEditCatOriginal(cat);
    setEditCatName(cat);
    setDeleteCatConfirm(false);
    blurOpacity.value = withTiming(0, { duration: 200 });
    liftY.value       = withTiming(0, { duration: 180 });
    menuOpacity.value = withTiming(0, { duration: 160 }, (finished) => {
      if (finished) {
        runOnJS(setCatCtx)(null);
        runOnJS(setEditCatModal)(true);
      }
    });
  };

  // ── Category edit/delete handlers ──
  const confirmRenameCategory = () => {
    const newName = editCatName.trim();
    if (!newName) return;
    if (newName !== editCatOriginal) {
      persistSavedTasks(savedTasks.map(t => ({
        ...t,
        categories: t.categories.map(c => c === editCatOriginal ? newName : c),
      })));
      if (customCats.includes(editCatOriginal)) {
        persistCustomCats(customCats.map(c => c === editCatOriginal ? newName : c));
      } else if (!customCats.includes(newName)) {
        persistCustomCats([...customCats, newName]);
      }
      setExpandedCats(prev => prev.map(c => c === editCatOriginal ? newName : c));
    }
    setEditCatModal(false);
  };

  const deleteCategoryAndTasks = () => {
    persistSavedTasks(savedTasks.filter(t => !t.categories.includes(editCatOriginal)));
    persistCustomCats(customCats.filter(c => c !== editCatOriginal));
    setExpandedCats(prev => prev.filter(c => c !== editCatOriginal));
    setDeleteCatConfirm(false);
    setEditCatModal(false);
  };

  const deleteCategoryKeepTasks = () => {
    persistSavedTasks(savedTasks.map(t => ({
      ...t,
      categories: t.categories.filter(c => c !== editCatOriginal),
    })));
    persistCustomCats(customCats.filter(c => c !== editCatOriginal));
    setExpandedCats(prev => prev.filter(c => c !== editCatOriginal));
    setDeleteCatConfirm(false);
    setEditCatModal(false);
  };

  // ── Grouped saved tasks ──
  const groups = buildGroups(savedTasks, searchQuery, customCats);
  const q = searchQuery.toLowerCase().trim();
  const flatSorted = (q ? savedTasks.filter(t => t.title.toLowerCase().includes(q)) : [...savedTasks])
    .sort((a, b) => a.title.localeCompare(b.title, 'fr'));

  const allCatsForModal = [...PREDEFINED_CATEGORIES, ...customCats];

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Page header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Mes tâches</Text>
          <TouchableOpacity style={styles.saveBtn} onPress={openSaveModal} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>Enregistrer une tâche +</Text>
          </TouchableOpacity>
        </View>

        {/* ════════════════════════════════════════════════
            CARD 1 — Tasks of the day
        ════════════════════════════════════════════════ */}
        <View style={styles.card}>
          {/* Date navigation */}
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

          {/* Add row */}
          <TouchableOpacity style={styles.addRow} onPress={openAddModal} activeOpacity={0.7}>
            <Text style={styles.addRowText}>Ajouter une nouvelle tâche</Text>
            <View style={styles.addIconWrap}>
              <Text style={styles.addIcon}>+</Text>
            </View>
          </TouchableOpacity>

          {displayTasks.length > 0 && <View style={styles.divider} />}
          <DraggableFlatList
            data={displayTasks}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            onDragEnd={({ data }) => persistDayTasks(data)}
            renderItem={({ item, drag, isActive, getIndex }: RenderItemParams<DayTask>) => {
              const idx = getIndex() ?? 0;
              return (
                <ScaleDecorator activeScale={1.04}>
                  <SwipeableTaskRow
                    task={item}
                    drag={drag}
                    isActive={isActive}
                    onToggle={toggleTask}
                    onDelete={deleteTask}
                    onLongPress={(t, bounds) => openCtx('day', t, bounds)}
                  />
                  {idx < displayTasks.length - 1 && !isActive && (
                    <View style={styles.rowDivider} />
                  )}
                </ScaleDecorator>
              );
            }}
          />
          {displayTasks.length === 0 && (
            <Text style={styles.emptyText}>Aucune tâche pour ce jour</Text>
          )}
        </View>

        {/* ════════════════════════════════════════════════
            CARD 2 — Saved tasks library
        ════════════════════════════════════════════════ */}
        <View style={[styles.card, { marginTop: 20 }]}>
          {/* Header */}
          <View style={styles.savedHeader}>
            <Text style={styles.savedHeaderTitle}>Mes tâches enregistrées</Text>
            <TouchableOpacity
              style={[styles.groupByBtn, groupByCategory && styles.groupByBtnActive]}
              onPress={() => setGroupByCategory(prev => !prev)}
              activeOpacity={0.75}>
              <Text style={[styles.groupByBtnText, groupByCategory && styles.groupByBtnTextActive]}>
                Par catégories
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Search */}
          <View style={styles.searchWrap}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une tâche..."
              placeholderTextColor={C.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                <Text style={styles.searchClear}>×</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Flat view (default) ── */}
          {!groupByCategory && (
            <>
              {flatSorted.length === 0 && (
                <Text style={styles.emptyText}>
                  {savedTasks.length === 0
                    ? 'Aucune tâche enregistrée. Appuie sur "Enregistrer une tâche +"'
                    : 'Aucun résultat pour cette recherche'}
                </Text>
              )}
              {flatSorted.map((saved, idx) => (
                <React.Fragment key={saved.id}>
                  <SavedTaskRow
                    saved={saved}
                    onAdd={addSavedToDay}
                    onLongPress={(s, bounds) => openCtx('saved', s, bounds)}
                  />
                  {idx < flatSorted.length - 1 && (
                    <View style={[styles.rowDivider, { marginLeft: 16 }]} />
                  )}
                </React.Fragment>
              ))}
            </>
          )}

          {/* ── Accordion / category view ── */}
          {groupByCategory && (
            <>
              {groups.length === 0 && (
                <Text style={styles.emptyText}>
                  {savedTasks.length === 0
                    ? 'Aucune tâche enregistrée. Appuie sur "Enregistrer une tâche +"'
                    : 'Aucun résultat pour cette recherche'}
                </Text>
              )}
              {groups.map((section, si) => {
                const isOpen = expandedCats.includes(section.category);
                return (
                  <View key={section.category}>
                    <AccordionHeader
                      category={section.category}
                      isOpen={isOpen}
                      onToggle={() => toggleAccordion(section.category)}
                      onLongPress={(bounds) => openCatCtx(section.category, bounds)}
                    />
                    {isOpen && (
                      <>
                        {section.tasks.map((saved, idx) => (
                          <React.Fragment key={saved.id}>
                            <SavedTaskRow
                              saved={saved}
                              onAdd={addSavedToDay}
                              onLongPress={(s, bounds) => openCtx('saved', s, bounds)}
                            />
                            {idx < section.tasks.length - 1 && (
                              <View style={[styles.rowDivider, { marginLeft: 16 }]} />
                            )}
                          </React.Fragment>
                        ))}
                      </>
                    )}
                    {si < groups.length - 1 && <View style={styles.divider} />}
                  </View>
                );
              })}
            </>
          )}
        </View>

      </ScrollView>

      {/* ════════════════════════════════════════════════
          MODAL — Add task to current day
      ════════════════════════════════════════════════ */}
      <Modal visible={addModalVisible} animationType="slide" transparent onRequestClose={() => setAddModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAddModalVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Nouvelle tâche</Text>

            <Text style={styles.fieldLabel}>Titre</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex : Appeler le médecin"
              placeholderTextColor={C.textMuted}
              value={addTitle}
              onChangeText={(text) => setAddTitle(text.charAt(0).toUpperCase() + text.slice(1))}
              autoFocus
              autoCapitalize="none"
              returnKeyType="done"
            />

            <Text style={styles.fieldLabel}>Priorité</Text>
            <View style={styles.priorityRow}>
              {(['haute', 'normale', 'basse'] as Priority[]).map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.priorityBtn, { borderColor: PRIORITY_COLOR[p] }, addPriority === p && { backgroundColor: PRIORITY_COLOR[p] }]}
                  onPress={() => setAddPriority(p)}
                  activeOpacity={0.75}>
                  <Text style={[styles.priorityBtnText, { color: addPriority === p ? '#FFFFFF' : PRIORITY_COLOR[p] }]}>
                    {PRIORITY_LABEL[p]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.fieldLabel}>Deadline</Text>
              <Switch
                value={deadlineEnabled}
                onValueChange={setDeadlineEnabled}
                trackColor={{ false: '#E5E7EB', true: C.primaryMuted }}
                thumbColor={deadlineEnabled ? C.primary : '#F9FAFB'}
              />
            </View>
            {deadlineEnabled && (
              <TimeScrollPicker value={deadlineDate} onChange={setDeadlineDate} />
            )}

            <TouchableOpacity
              style={[styles.confirmBtn, !addTitle.trim() && styles.confirmBtnDisabled]}
              onPress={confirmAddTask}
              disabled={!addTitle.trim()}
              activeOpacity={0.85}>
              <Text style={styles.confirmBtnText}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ════════════════════════════════════════════════
          MODAL — Save task to library
      ════════════════════════════════════════════════ */}
      <Modal visible={saveModalVisible} animationType="slide" transparent onRequestClose={() => setSaveModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSaveModalVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Enregistrer une tâche</Text>

            <Text style={styles.fieldLabel}>Nom de la tâche</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex : Faire 10 min de yoga"
              placeholderTextColor={C.textMuted}
              value={saveTitle}
              onChangeText={(text) => setSaveTitle(text.charAt(0).toUpperCase() + text.slice(1))}
              autoFocus
              autoCapitalize="none"
              returnKeyType="done"
            />

            <Text style={styles.fieldLabel}>Priorité</Text>
            <View style={styles.priorityRow}>
              {(['haute', 'normale', 'basse'] as Priority[]).map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.priorityBtn, { borderColor: PRIORITY_COLOR[p] }, savePriority === p && { backgroundColor: PRIORITY_COLOR[p] }]}
                  onPress={() => setSavePriority(p)}
                  activeOpacity={0.75}>
                  <Text style={[styles.priorityBtnText, { color: savePriority === p ? '#FFFFFF' : PRIORITY_COLOR[p] }]}>
                    {PRIORITY_LABEL[p]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Category toggle */}
            <View style={styles.toggleRow}>
              <Text style={styles.fieldLabel}>Catégorie</Text>
              <Switch
                value={catEnabled}
                onValueChange={v => { setCatEnabled(v); if (!v) { setSelectedCats([]); setCreatingCat(false); setNewCatName(''); } }}
                trackColor={{ false: '#E5E7EB', true: C.primaryMuted }}
                thumbColor={catEnabled ? C.primary : '#F9FAFB'}
              />
            </View>

            {catEnabled && (
              <View style={styles.catChipsWrap}>
                {allCatsForModal.map(cat => {
                  const isSel = selectedCats.includes(cat);
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.catChip, isSel && styles.catChipSelected]}
                      onPress={() => toggleCat(cat)}
                      activeOpacity={0.75}>
                      <Text style={[styles.catChipText, isSel && styles.catChipTextSelected]}>{cat}</Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[styles.catChip, styles.catChipNew, creatingCat && styles.catChipSelected]}
                  onPress={() => setCreatingCat(prev => !prev)}
                  activeOpacity={0.75}>
                  <Text style={[styles.catChipText, styles.catChipNewText, creatingCat && styles.catChipTextSelected]}>
                    + Créer une catégorie
                  </Text>
                </TouchableOpacity>
                {creatingCat && (
                  <View style={styles.newCatRow}>
                    <TextInput
                      style={styles.newCatInput}
                      placeholder="Nom de la catégorie"
                      placeholderTextColor={C.textMuted}
                      value={newCatName}
                      onChangeText={(text) => setNewCatName(text.charAt(0).toUpperCase() + text.slice(1))}
                      returnKeyType="done"
                      onSubmitEditing={confirmNewCat}
                      autoCapitalize="none"
                      autoFocus
                    />
                    <TouchableOpacity
                      style={[styles.newCatConfirm, !newCatName.trim() && styles.newCatConfirmDisabled]}
                      onPress={confirmNewCat}
                      disabled={!newCatName.trim()}
                      activeOpacity={0.85}>
                      <Text style={styles.newCatConfirmText}>✓</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[styles.confirmBtn, { marginTop: 24 }, !canSave && styles.confirmBtnDisabled]}
              onPress={confirmSaveTask}
              disabled={!canSave}
              activeOpacity={0.85}>
              <Text style={styles.confirmBtnText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ════════════════════════════════════════════════
          INSTAGRAM-STYLE CONTEXT OVERLAY
      ════════════════════════════════════════════════ */}
      {ctx && (
        <Modal visible transparent animationType="none" onRequestClose={closeCtx}>
          {/* Dismiss tap area */}
          <Pressable style={StyleSheet.absoluteFill} onPress={closeCtx} />

          {/* Blur + dark overlay */}
          <Animated.View style={[StyleSheet.absoluteFill, blurStyle]} pointerEvents="none">
            <BlurView
              style={StyleSheet.absoluteFill}
              intensity={55}
              tint="dark"
              experimentalBlurMethod="dimezisBlurView"
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.22)' }]} />
          </Animated.View>

          {/* Lifted task card */}
          <Animated.View
            style={[
              styles.liftedCard,
              {
                position: 'absolute',
                top: ctx.bounds.y,
                left: ctx.bounds.x,
                width: ctx.bounds.width,
              },
              liftStyle,
            ]}
            pointerEvents="none">
            {ctx.type === 'day' ? (
              (() => {
                const t = ctx.task as DayTask;
                return (
                  <View style={styles.taskRow}>
                    <View style={[styles.checkbox, t.completed && styles.checkboxDone]}>
                      {t.completed && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLOR[t.priority] }]} />
                    <View style={styles.taskTextCol}>
                      <Text style={[styles.taskTitle, t.completed && styles.taskTitleDone]} numberOfLines={2}>
                        {t.title}
                      </Text>
                      {t.deadline && <Text style={styles.deadlineSub}>{t.deadline}</Text>}
                    </View>
                  </View>
                );
              })()
            ) : (
              (() => {
                const t = ctx.task as SavedTask;
                return (
                  <View style={styles.savedRow}>
                    <Text style={styles.savedTaskTitle} numberOfLines={1}>{t.title}</Text>
                  </View>
                );
              })()
            )}
          </Animated.View>

          {/* Context menu card */}
          {(() => {
            const menuTop = Math.min(
              ctx.bounds.y + ctx.bounds.height + 8,
              SCREEN_H - (ctx.type === 'day' ? 58 : 112) - 20,
            );
            return (
              <Animated.View
                style={[
                  styles.ctxCard,
                  {
                    position: 'absolute',
                    top: menuTop,
                    left: ctx.bounds.x,
                    width: ctx.bounds.width,
                  },
                  menuStyle,
                ]}>
                <TouchableOpacity style={styles.ctxItem} onPress={handleCtxEdit} activeOpacity={0.7}>
                  <Text style={styles.ctxItemText}>Modifier</Text>
                </TouchableOpacity>
                {ctx.type === 'saved' && (
                  <>
                    <View style={styles.ctxSep} />
                    <TouchableOpacity style={styles.ctxItem} onPress={handleCtxDelete} activeOpacity={0.7}>
                      <Text style={[styles.ctxItemText, styles.ctxItemDelete]}>Supprimer</Text>
                    </TouchableOpacity>
                  </>
                )}
              </Animated.View>
            );
          })()}
        </Modal>
      )}

      {/* ════════════════════════════════════════════════
          CATEGORY CONTEXT OVERLAY (Instagram-style)
      ════════════════════════════════════════════════ */}
      {catCtx && (
        <Modal visible transparent animationType="none" onRequestClose={closeCatCtx}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeCatCtx} />

          <Animated.View style={[StyleSheet.absoluteFill, blurStyle]} pointerEvents="none">
            <BlurView
              style={StyleSheet.absoluteFill}
              intensity={55}
              tint="dark"
              experimentalBlurMethod="dimezisBlurView"
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.22)' }]} />
          </Animated.View>

          {/* Lifted accordion header */}
          <Animated.View
            style={[
              styles.liftedCard,
              {
                position: 'absolute',
                top: catCtx.bounds.y,
                left: catCtx.bounds.x,
                width: catCtx.bounds.width,
              },
              liftStyle,
            ]}
            pointerEvents="none">
            <View style={styles.accordionHeader}>
              <Text style={styles.accordionTitle}>{catCtx.category}</Text>
              <Text style={styles.accordionChevron}>▸</Text>
            </View>
          </Animated.View>

          {/* Context menu */}
          {(() => {
            const menuTop = Math.min(
              catCtx.bounds.y + catCtx.bounds.height + 8,
              SCREEN_H - 58 - 20,
            );
            return (
              <Animated.View
                style={[
                  styles.ctxCard,
                  {
                    position: 'absolute',
                    top: menuTop,
                    left: catCtx.bounds.x,
                    width: catCtx.bounds.width,
                  },
                  menuStyle,
                ]}>
                <TouchableOpacity style={styles.ctxItem} onPress={handleCatCtxEdit} activeOpacity={0.7}>
                  <Text style={styles.ctxItemText}>Modifier</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })()}
        </Modal>
      )}

      {/* ════════════════════════════════════════════════
          MODAL — Edit category
      ════════════════════════════════════════════════ */}
      <Modal
        visible={editCatModal}
        animationType="slide"
        transparent
        onRequestClose={() => { setEditCatModal(false); setDeleteCatConfirm(false); }}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { setEditCatModal(false); setDeleteCatConfirm(false); }} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Modifier la catégorie</Text>

            <Text style={styles.fieldLabel}>Nom</Text>
            <TextInput
              style={styles.input}
              value={editCatName}
              onChangeText={(text) => setEditCatName(text.charAt(0).toUpperCase() + text.slice(1))}
              autoCapitalize="none"
              returnKeyType="done"
              autoFocus
            />

            <TouchableOpacity
              style={[styles.confirmBtn, !editCatName.trim() && styles.confirmBtnDisabled]}
              onPress={confirmRenameCategory}
              disabled={!editCatName.trim()}
              activeOpacity={0.85}>
              <Text style={styles.confirmBtnText}>Enregistrer</Text>
            </TouchableOpacity>

            <View style={{ height: 16 }} />

            {!deleteCatConfirm ? (
              <TouchableOpacity
                style={styles.deleteCatBtn}
                onPress={() => setDeleteCatConfirm(true)}
                activeOpacity={0.75}>
                <Text style={styles.deleteCatBtnText}>Supprimer la catégorie</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.deleteCatConfirmBox}>
                <Text style={styles.deleteCatQuestion}>
                  Supprimer aussi les tâches de cette catégorie ?
                </Text>
                <TouchableOpacity
                  style={[styles.confirmBtn, styles.deleteCatConfirmBtn, { marginBottom: 10 }]}
                  onPress={deleteCategoryAndTasks}
                  activeOpacity={0.85}>
                  <Text style={styles.confirmBtnText}>Supprimer les tâches aussi</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, styles.confirmBtnOutline]}
                  onPress={deleteCategoryKeepTasks}
                  activeOpacity={0.85}>
                  <Text style={[styles.confirmBtnText, { color: C.primary }]}>Garder les tâches</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => { setEditCatModal(false); setDeleteCatConfirm(false); }}
              activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ════════════════════════════════════════════════
          MODAL — Edit day task
      ════════════════════════════════════════════════ */}
      <Modal visible={editDayModal} animationType="slide" transparent onRequestClose={() => setEditDayModal(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditDayModal(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Modifier la tâche</Text>

            <Text style={styles.fieldLabel}>Titre</Text>
            <TextInput
              style={styles.input}
              placeholder="Titre de la tâche"
              placeholderTextColor={C.textMuted}
              value={editDayTitle}
              onChangeText={(text) => setEditDayTitle(text.charAt(0).toUpperCase() + text.slice(1))}
              autoCapitalize="none"
              returnKeyType="done"
            />

            <Text style={styles.fieldLabel}>Priorité</Text>
            <View style={styles.priorityRow}>
              {(['haute', 'normale', 'basse'] as Priority[]).map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.priorityBtn, { borderColor: PRIORITY_COLOR[p] }, editDayPriority === p && { backgroundColor: PRIORITY_COLOR[p] }]}
                  onPress={() => setEditDayPriority(p)}
                  activeOpacity={0.75}>
                  <Text style={[styles.priorityBtnText, { color: editDayPriority === p ? '#FFFFFF' : PRIORITY_COLOR[p] }]}>
                    {PRIORITY_LABEL[p]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.fieldLabel}>Deadline</Text>
              <Switch
                value={editDayDeadlineEnabled}
                onValueChange={setEditDayDeadlineEnabled}
                trackColor={{ false: '#E5E7EB', true: C.primaryMuted }}
                thumbColor={editDayDeadlineEnabled ? C.primary : '#F9FAFB'}
              />
            </View>

            {editDayDeadlineEnabled && (
              <TimeScrollPicker key={editDayId} value={editDayDeadlineDate} onChange={setEditDayDeadlineDate} />
            )}

            <TouchableOpacity
              style={[styles.confirmBtn, { marginTop: 8 }, !editDayTitle.trim() && styles.confirmBtnDisabled]}
              onPress={confirmEditDay}
              disabled={!editDayTitle.trim()}
              activeOpacity={0.85}>
              <Text style={styles.confirmBtnText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ════════════════════════════════════════════════
          MODAL — Edit saved task
      ════════════════════════════════════════════════ */}
      <Modal visible={editSavedModal} animationType="slide" transparent onRequestClose={() => setEditSavedModal(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditSavedModal(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={styles.sheetTitle}>Modifier la tâche</Text>

              <Text style={styles.fieldLabel}>Titre</Text>
              <TextInput
                style={styles.input}
                placeholder="Titre de la tâche"
                placeholderTextColor={C.textMuted}
                value={editSavedTitle}
                onChangeText={(text) => setEditSavedTitle(text.charAt(0).toUpperCase() + text.slice(1))}
                autoFocus
                autoCapitalize="none"
                returnKeyType="done"
              />

              <Text style={styles.fieldLabel}>Priorité</Text>
              <View style={styles.priorityRow}>
                {(['haute', 'normale', 'basse'] as Priority[]).map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.priorityBtn, { borderColor: PRIORITY_COLOR[p] }, editSavedPriority === p && { backgroundColor: PRIORITY_COLOR[p] }]}
                    onPress={() => setEditSavedPriority(p)}
                    activeOpacity={0.75}>
                    <Text style={[styles.priorityBtnText, { color: editSavedPriority === p ? '#FFFFFF' : PRIORITY_COLOR[p] }]}>
                      {PRIORITY_LABEL[p]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.fieldLabel}>Catégorie</Text>
                <Switch
                  value={editSavedCatEnabled}
                  onValueChange={v => { setEditSavedCatEnabled(v); if (!v) { setEditSavedCats([]); setEditCreatingCat(false); setEditNewCatName(''); } }}
                  trackColor={{ false: '#E5E7EB', true: C.primaryMuted }}
                  thumbColor={editSavedCatEnabled ? C.primary : '#F9FAFB'}
                />
              </View>

              {editSavedCatEnabled && (
                <View style={styles.catChipsWrap}>
                  {[...PREDEFINED_CATEGORIES, ...customCats].map(cat => {
                    const isSel = editSavedCats.includes(cat);
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.catChip, isSel && styles.catChipSelected]}
                        onPress={() => setEditSavedCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                        activeOpacity={0.75}>
                        <Text style={[styles.catChipText, isSel && styles.catChipTextSelected]}>{cat}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    style={[styles.catChip, styles.catChipNew, editCreatingCat && styles.catChipSelected]}
                    onPress={() => setEditCreatingCat(prev => !prev)}
                    activeOpacity={0.75}>
                    <Text style={[styles.catChipText, styles.catChipNewText, editCreatingCat && styles.catChipTextSelected]}>
                      + Créer une catégorie
                    </Text>
                  </TouchableOpacity>
                  {editCreatingCat && (
                    <View style={styles.newCatRow}>
                      <TextInput
                        style={styles.newCatInput}
                        placeholder="Nom de la catégorie"
                        placeholderTextColor={C.textMuted}
                        value={editNewCatName}
                        onChangeText={(text) => setEditNewCatName(text.charAt(0).toUpperCase() + text.slice(1))}
                        returnKeyType="done"
                        onSubmitEditing={confirmEditNewCat}
                        autoCapitalize="none"
                        autoFocus
                      />
                      <TouchableOpacity
                        style={[styles.newCatConfirm, !editNewCatName.trim() && styles.newCatConfirmDisabled]}
                        onPress={confirmEditNewCat}
                        disabled={!editNewCatName.trim()}
                        activeOpacity={0.85}>
                        <Text style={styles.newCatConfirmText}>✓</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={[styles.confirmBtn, { marginTop: 24 }, !editSavedTitle.trim() && styles.confirmBtnDisabled]}
                onPress={confirmEditSaved}
                disabled={!editSavedTitle.trim()}
                activeOpacity={0.85}>
                <Text style={styles.confirmBtnText}>Enregistrer</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },

  // Page header
  pageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  pageTitle: { flex: 1, fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  saveBtn: {
    backgroundColor: C.primary, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3,
  },
  saveBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  // Card shared
  card: {
    backgroundColor: C.card, borderRadius: 20, borderWidth: 1.5, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12,
    elevation: 4, overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: C.border },
  rowDivider: { height: 1, backgroundColor: '#F8F7FF', marginLeft: 56 },

  // Date navigation
  dateBar: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16,
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

  // Add row
  addRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, gap: 12 },
  addRowText: { flex: 1, fontSize: 15, fontWeight: '600', color: C.primary },
  addIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  addIcon: { fontSize: 18, color: C.primary, fontWeight: '700', lineHeight: 22 },

  // Swipe-to-delete
  rowOuter: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: C.card },
  swipeContainer: { flex: 1, overflow: 'hidden' },
  deleteZone: { position: 'absolute', right: 0, top: 0, bottom: 0, width: DELETE_W, backgroundColor: '#EF4444' },
  deleteInner: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  deleteText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  taskRowWrap: { backgroundColor: C.card },

  // Task row
  taskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 10 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: C.primaryMuted, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  checkboxDone: { backgroundColor: C.primary, borderColor: C.primary },
  checkmark: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  priorityDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  taskTextCol: { flex: 1, gap: 2 },
  taskTitle: { fontSize: 15, fontWeight: '500', color: C.text, lineHeight: 20 },
  taskTitleDone: { color: C.textMuted, textDecorationLine: 'line-through' },
  deadlineSub: { fontSize: 11, color: C.textMuted, fontWeight: '400' },
  emptyText: { fontSize: 14, color: C.textMuted, textAlign: 'center', paddingVertical: 24, paddingHorizontal: 16 },

  // Drag handle
  dragHandle: {
    width: 44, alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: C.card, paddingHorizontal: 12,
  },
  dragLine: { width: 18, height: 2, borderRadius: 1, backgroundColor: C.textMuted },

  // ── Saved tasks card ──
  savedHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 10 },
  savedHeaderTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: C.text },
  groupByBtn: {
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: '#F9F8FF',
  },
  groupByBtnActive: { borderColor: C.primary, backgroundColor: C.primaryLight },
  groupByBtnText: { fontSize: 12, fontWeight: '600', color: C.textSub },
  groupByBtnTextActive: { color: C.primary },

  // Accordion
  accordionHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16, gap: 10,
    backgroundColor: '#FAFAFA',
  },
  accordionTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: C.text },
  accordionChevron: { fontSize: 14, color: C.primary, fontWeight: '700' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', margin: 12, paddingHorizontal: 12,
    backgroundColor: '#F9F8FF', borderRadius: 12, borderWidth: 1.5, borderColor: C.border, gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: C.text, paddingVertical: 10 },
  searchClear: { fontSize: 18, color: C.textMuted, fontWeight: '600', paddingLeft: 4 },

  savedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, gap: 12 },
  savedTaskTitle: { flex: 1, fontSize: 15, fontWeight: '500', color: C.text },
  addToDayBtn: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  addToDayIcon: { fontSize: 18, color: C.primary, fontWeight: '700', lineHeight: 22 },

  // ── Instagram-style context overlay ──
  liftedCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.border,
    overflow: 'hidden',
    shadowColor: '#7C6CF2',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.4,
    shadowRadius: 22,
    elevation: 16,
  },
  ctxCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
    shadowColor: '#1C1B33',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 14,
  },
  ctxItem: { paddingVertical: 14, paddingHorizontal: 18 },
  ctxItemText: { fontSize: 15, fontWeight: '600', color: C.text },
  ctxItemDelete: { color: '#EF4444' },
  ctxSep: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E5EA' },

  // ── Modals ──
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 28, paddingTop: 12,
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 20, letterSpacing: -0.3 },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.textSub, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#F9F8FF', borderRadius: 12, borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: C.text, marginBottom: 20,
  },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },

  priorityRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  priorityBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  priorityBtnText: { fontSize: 13, fontWeight: '700' },

  // Category chips in save modal
  catChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: '#F9F8FF',
  },
  catChipSelected: { borderColor: C.primary, backgroundColor: C.primary },
  catChipText: { fontSize: 14, fontWeight: '600', color: C.textSub },
  catChipTextSelected: { color: '#FFFFFF' },
  catChipNew: { borderColor: C.primary, backgroundColor: C.primaryLight },
  catChipNewText: { color: C.primary },
  newCatRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', marginTop: 4 },
  newCatInput: {
    flex: 1, backgroundColor: '#F9F8FF', borderRadius: 12, borderWidth: 1.5,
    borderColor: C.border, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: C.text,
  },
  newCatConfirm: {
    width: 40, height: 40, borderRadius: 11, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  newCatConfirmDisabled: { backgroundColor: C.primaryMuted },
  newCatConfirmText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  pickerWrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: PICKER_H * 3, borderRadius: 16, overflow: 'hidden',
    backgroundColor: '#F5F3FF', marginBottom: 8,
  },
  pickerHighlight: {
    position: 'absolute', left: 0, right: 0,
    top: PICKER_H, height: PICKER_H,
    backgroundColor: C.primaryLight, borderRadius: 10,
  },
  pickerCol: { width: 72, height: PICKER_H * 3 },
  pickerItem: { height: PICKER_H, justifyContent: 'center', alignItems: 'center' },
  pickerItemText: { fontSize: 22, fontWeight: '400', color: C.textMuted },
  pickerItemSelected: { fontWeight: '700', color: C.primary },
  pickerSep: { fontSize: 26, fontWeight: '800', color: C.primary, marginHorizontal: 2, marginBottom: 2 },

  confirmBtn: {
    backgroundColor: C.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
  },
  confirmBtnDisabled: { backgroundColor: C.primaryMuted, shadowOpacity: 0, elevation: 0 },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  confirmBtnOutline: {
    backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.primary,
    shadowOpacity: 0, elevation: 0,
  },

  // ── Edit category modal ──
  deleteCatBtn: {
    paddingVertical: 14, alignItems: 'center', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#FCA5A5', backgroundColor: '#FFF1F1',
  },
  deleteCatBtnText: { fontSize: 15, fontWeight: '600', color: '#EF4444' },
  deleteCatConfirmBox: { gap: 0 },
  deleteCatQuestion: {
    fontSize: 14, color: C.textSub, textAlign: 'center',
    marginBottom: 14, lineHeight: 20,
  },
  deleteCatConfirmBtn: {
    backgroundColor: '#EF4444', shadowColor: '#EF4444',
  },
  cancelBtn: { marginTop: 12, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: C.textSub },
});
