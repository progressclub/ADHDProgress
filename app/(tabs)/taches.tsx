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

interface SavedTask {
  id: string;
  title: string;
  priority: Priority;
  categories: string[];
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
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function SwipeableTaskRow({ task, onToggle, onDelete }: RowProps) {
  const x = useSharedValue(0);

  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-14, 14])
    .onUpdate(e => {
      x.value = Math.max(-DELETE_W, Math.min(0, e.translationX));
    })
    .onEnd(e => {
      const open = x.value < -(DELETE_W / 2) || e.velocityX < -600;
      x.value = withSpring(open ? -DELETE_W : 0, SPRING);
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(-x.value, [0, DELETE_W * 0.5, DELETE_W], [0, 0.5, 1], Extrapolation.CLAMP),
    transform: [{ translateX: interpolate(-x.value, [0, DELETE_W], [10, 0], Extrapolation.CLAMP) }],
  }));

  const handleRowPress = () => {
    if (x.value < 0) x.value = withSpring(0, SPRING);
    onToggle(task.id);
  };

  return (
    <GestureDetector gesture={pan}>
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
  // ── Day tasks ──
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<DayTask[]>([]);

  // ── Saved tasks ──
  const [savedTasks, setSavedTasks] = useState<SavedTask[]>([]);
  const [customCats, setCustomCats] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [expandedCats, setExpandedCats] = useState<string[]>([]);

  // ── "Add to day" modal state ──
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addPriority, setAddPriority] = useState<Priority>('normale');
  const [deadlineEnabled, setDeadlineEnabled] = useState(false);
  const [deadlineTime, setDeadlineTime] = useState('');

  // ── "Save task" modal state ──
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [savePriority, setSavePriority] = useState<Priority>('normale');
  const [catEnabled, setCatEnabled] = useState(false);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [creatingCat, setCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Load day tasks
  useEffect(() => {
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
      setTasks(next);
      AsyncStorage.setItem(storageKey(currentDate), JSON.stringify(next));
    },
    [currentDate],
  );

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
    persistDayTasks(tasks.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)));
  const deleteTask = (id: string) =>
    persistDayTasks(tasks.filter(t => t.id !== id));

  const openAddModal = () => {
    setAddTitle(''); setAddPriority('normale');
    setDeadlineEnabled(false); setDeadlineTime('');
    setAddModalVisible(true);
  };
  const confirmAddTask = () => {
    const trimmed = addTitle.trim();
    if (!trimmed) return;
    persistDayTasks([
      ...tasks,
      {
        id: Date.now().toString(), title: trimmed, priority: addPriority,
        deadline: deadlineEnabled && deadlineTime.trim() ? deadlineTime.trim() : undefined,
        completed: false,
      },
    ]);
    setAddModalVisible(false);
  };

  const addSavedToDay = (saved: SavedTask) => {
    persistDayTasks([
      ...tasks,
      { id: Date.now().toString(), title: saved.title, priority: saved.priority, completed: false },
    ]);
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

  // ── Grouped saved tasks ──
  const groups = buildGroups(savedTasks, searchQuery, customCats);

  const q = searchQuery.toLowerCase().trim();
  const flatSorted = (q ? savedTasks.filter(t => t.title.toLowerCase().includes(q)) : [...savedTasks])
    .sort((a, b) => a.title.localeCompare(b.title, 'fr'));

  const allCatsForModal = [...PREDEFINED_CATEGORIES, ...customCats];

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
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
                  <View style={styles.savedRow}>
                    <Text style={styles.savedTaskTitle} numberOfLines={1}>{saved.title}</Text>
                    <TouchableOpacity
                      style={styles.addToDayBtn}
                      onPress={() => addSavedToDay(saved)}
                      activeOpacity={0.75}>
                      <Text style={styles.addToDayIcon}>+</Text>
                    </TouchableOpacity>
                  </View>
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
                    <TouchableOpacity
                      style={styles.accordionHeader}
                      onPress={() => toggleAccordion(section.category)}
                      activeOpacity={0.75}>
                      <Text style={styles.accordionTitle}>{section.category}</Text>
                      <Text style={styles.accordionChevron}>{isOpen ? '▾' : '▸'}</Text>
                    </TouchableOpacity>
                    {isOpen && (
                      <>
                        {section.tasks.map((saved, idx) => (
                          <React.Fragment key={saved.id}>
                            <View style={styles.savedRow}>
                              <Text style={styles.savedTaskTitle} numberOfLines={1}>{saved.title}</Text>
                              <TouchableOpacity
                                style={styles.addToDayBtn}
                                onPress={() => addSavedToDay(saved)}
                                activeOpacity={0.75}>
                                <Text style={styles.addToDayIcon}>+</Text>
                              </TouchableOpacity>
                            </View>
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

        <View style={{ height: 48 }} />
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
              onChangeText={setAddTitle}
              autoFocus
              autoCapitalize="sentences"
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
              <TextInput
                style={[styles.input, { marginBottom: 0 }]}
                placeholder="Ex : 18h00"
                placeholderTextColor={C.textMuted}
                value={deadlineTime}
                onChangeText={setDeadlineTime}
                autoCapitalize="none"
                returnKeyType="done"
              />
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
              onChangeText={setSaveTitle}
              autoFocus
              autoCapitalize="sentences"
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
                      onChangeText={setNewCatName}
                      returnKeyType="done"
                      onSubmitEditing={confirmNewCat}
                      autoCapitalize="sentences"
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
  swipeContainer: { overflow: 'hidden' },
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
  taskTitle: { flex: 1, fontSize: 15, fontWeight: '500', color: C.text, lineHeight: 20 },
  taskTitleDone: { color: C.textMuted, textDecorationLine: 'line-through' },
  taskRight: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  deadlineText: { fontSize: 12, color: C.textSub, fontWeight: '500' },
  priorityBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  priorityBadgeText: { fontSize: 11, fontWeight: '700' },
  emptyText: { fontSize: 14, color: C.textMuted, textAlign: 'center', paddingVertical: 24, paddingHorizontal: 16 },

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

  confirmBtn: {
    backgroundColor: C.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
  },
  confirmBtnDisabled: { backgroundColor: C.primaryMuted, shadowOpacity: 0, elevation: 0 },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
