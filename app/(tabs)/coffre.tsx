import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  FlatList,
  Modal,
  StyleSheet,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useCoffre, SANS_DOSSIER_ID } from '@/contexts/CoffreContext';
import type { Folder, CoffreNote } from '@/contexts/CoffreContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(Math.round(SCREEN_WIDTH * 0.78), 320);

const C = {
  bg: '#F5F3FF',
  surface: '#FFFFFF',
  primary: '#7C6CF2',
  primaryLight: '#EDE9FE',
  text: '#1C1B33',
  textSub: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#F0EDF8',
  borderStrong: '#E5E0FF',
  danger: '#EF4444',
  sansDossier: '#B0B8C1',
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function CoffrePage() {
  const { folders, addFolder, renameFolder, deleteFolder, saveNote, getNotesInFolder } = useCoffre();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerView, setDrawerView] = useState<'folders' | 'notes'>('folders');
  const [drawerFolderId, setDrawerFolderId] = useState<string | null>(null);
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  // Folder selection modal
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderEditMode, setFolderEditMode] = useState(false);

  // Inline rename inside folder modal (Bug 1 fix: no stacked modals)
  const [inlineEditFolderId, setInlineEditFolderId] = useState<string | null>(null);
  const [inlineEditFolderName, setInlineEditFolderName] = useState('');

  // New folder modal
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Refs for auto-save on blur
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const editingNoteIdRef = useRef(editingNoteId);
  const editingFolderIdRef = useRef(editingFolderId);
  const saveNoteRef = useRef(saveNote);

  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { editingNoteIdRef.current = editingNoteId; }, [editingNoteId]);
  useEffect(() => { editingFolderIdRef.current = editingFolderId; }, [editingFolderId]);
  useEffect(() => { saveNoteRef.current = saveNote; }, [saveNote]);

  useFocusEffect(
    useCallback(() => {
      setTitle('');
      setContent('');
      setEditingNoteId(null);
      setEditingFolderId(null);
      titleRef.current = '';
      contentRef.current = '';
      editingNoteIdRef.current = null;
      editingFolderIdRef.current = null;

      return () => {
        const t = titleRef.current;
        const c = contentRef.current;
        const noteId = editingNoteIdRef.current;
        const folderId = editingFolderIdRef.current;

        const hasContent = t.trim().length > 0 || c.trim().length > 0;
        const needsAutoSave = noteId === null || folderId === SANS_DOSSIER_ID;

        if (hasContent && needsAutoSave) {
          saveNoteRef.current({
            id: noteId ?? undefined,
            folderId: SANS_DOSSIER_ID,
            title: t,
            content: c,
          });
        }
      };
    }, []),
  );

  const openDrawer = useCallback(() => {
    setDrawerView('folders');
    setDrawerFolderId(null);
    setDrawerOpen(true);
    Animated.spring(drawerAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [drawerAnim]);

  const closeDrawer = useCallback(() => {
    Animated.timing(drawerAnim, {
      toValue: -DRAWER_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setDrawerOpen(false);
      setDrawerView('folders');
      setDrawerFolderId(null);
    });
  }, [drawerAnim]);

  const handleOpenFolder = useCallback((folderId: string) => {
    setDrawerFolderId(folderId);
    setDrawerView('notes');
  }, []);

  const handleOpenNote = useCallback(
    (note: CoffreNote) => {
      setTitle(note.title);
      setContent(note.content);
      setEditingNoteId(note.id);
      setEditingFolderId(note.folderId);
      closeDrawer();
    },
    [closeDrawer],
  );

  const handleSaveToFolder = useCallback(
    (folderId: string) => {
      const saved = saveNote({ id: editingNoteId ?? undefined, folderId, title, content });
      setEditingNoteId(saved.id);
      setEditingFolderId(folderId);
      setFolderModalOpen(false);
      setFolderEditMode(false);
    },
    [editingNoteId, title, content, saveNote],
  );

  const closeFolderModal = useCallback(() => {
    setFolderModalOpen(false);
    setFolderEditMode(false);
    setInlineEditFolderId(null);
    setInlineEditFolderName('');
  }, []);

  // Inline rename handlers (Bug 1 fix)
  const startInlineRename = useCallback((folder: Folder) => {
    setInlineEditFolderId(folder.id);
    setInlineEditFolderName(folder.name);
  }, []);

  const commitInlineRename = useCallback(
    (folderId: string) => {
      if (inlineEditFolderName.trim()) {
        renameFolder(folderId, inlineEditFolderName.trim());
      }
      setInlineEditFolderId(null);
      setInlineEditFolderName('');
    },
    [inlineEditFolderName, renameFolder],
  );

  const handleAddFolder = useCallback(() => {
    if (!newFolderName.trim()) return;
    addFolder(newFolderName.trim());
    setNewFolderName('');
    setNewFolderModalOpen(false);
    setFolderModalOpen(true);
  }, [newFolderName, addFolder]);

  const cancelNewFolder = useCallback(() => {
    setNewFolderName('');
    setNewFolderModalOpen(false);
    setFolderModalOpen(true);
  }, []);

  const handleDeleteFolder = useCallback(
    (folder: Folder) => {
      Alert.alert(
        'Supprimer le dossier',
        `Supprimer "${folder.name}" et toutes ses notes ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', style: 'destructive', onPress: () => deleteFolder(folder.id) },
        ],
      );
    },
    [deleteFolder],
  );

  const drawerFolder =
    drawerFolderId === SANS_DOSSIER_ID
      ? { id: SANS_DOSSIER_ID, name: 'Sans dossier' }
      : drawerFolderId
        ? folders.find(f => f.id === drawerFolderId)
        : null;

  const drawerNotes = drawerFolderId
    ? [...getNotesInFolder(drawerFolderId)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    : [];

  const sansDossierNoteCount = getNotesInFolder(SANS_DOSSIER_ID).length;

  const DrawerSansDossierFooter = (
    <>
      {folders.length > 0 && <View style={styles.drawerSeparator} />}
      <TouchableOpacity
        style={styles.drawerRow}
        onPress={() => handleOpenFolder(SANS_DOSSIER_ID)}
        activeOpacity={0.65}>
        <View style={[styles.folderDot, { backgroundColor: C.sansDossier }]} />
        <Text style={[styles.drawerFolderName, { color: C.textSub }]}>Sans dossier</Text>
        {sansDossierNoteCount > 0 && (
          <Text style={styles.drawerNoteCount}>{sansDossierNoteCount}</Text>
        )}
        <Text style={styles.drawerChevron}>›</Text>
      </TouchableOpacity>
    </>
  );

  const ModalSansDossierFooter = (
    <>
      <View style={styles.sheetSeparator} />
      <View style={styles.sheetFolderRow}>
        {folderEditMode ? (
          <View style={[styles.sheetFolderBtn, { opacity: 0.4 }]}>
            <View style={[styles.folderDot, { backgroundColor: C.sansDossier }]} />
            <Text style={[styles.sheetFolderName, { color: C.textSub }]}>Sans dossier</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.sheetFolderBtn}
            onPress={() => handleSaveToFolder(SANS_DOSSIER_ID)}
            activeOpacity={0.65}>
            <View style={[styles.folderDot, { backgroundColor: C.sansDossier }]} />
            <Text style={[styles.sheetFolderName, { color: C.textSub }]}>Sans dossier</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={openDrawer}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.hamburger}>&#9776;</Text>
          </TouchableOpacity>
        </View>

        {/* Editor */}
        <ScrollView
          style={styles.editor}
          contentContainerStyle={styles.editorContent}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled">
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Titre..."
            placeholderTextColor={C.textMuted}
            style={styles.titleInput}
            returnKeyType="next"
            autoCapitalize="sentences"
          />
          <View style={styles.divider} />
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Notez ce qui vous passe par la tête..."
            placeholderTextColor={C.textMuted}
            style={styles.contentInput}
            multiline
            textAlignVertical="top"
            autoCapitalize="sentences"
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setFolderEditMode(false);
          setInlineEditFolderId(null);
          setFolderModalOpen(true);
        }}
        activeOpacity={0.82}>
        <Text style={styles.fabIcon}>&#128193;</Text>
        <Text style={styles.fabText}>Enregistrer</Text>
      </TouchableOpacity>

      {/* Drawer backdrop + panel */}
      {drawerOpen && (
        <>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.drawerBackdrop}
            onPress={closeDrawer}
          />
          <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
              <View style={styles.drawerHeader}>
                {drawerView === 'notes' ? (
                  <TouchableOpacity
                    onPress={() => setDrawerView('folders')}
                    style={{ flex: 1 }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.drawerBack}>‹ Dossiers</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.drawerTitle}>Coffre</Text>
                )}
                <TouchableOpacity
                  onPress={closeDrawer}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.drawerClose}>&#x2715;</Text>
                </TouchableOpacity>
              </View>

              {drawerView === 'folders' ? (
                <FlatList
                  data={folders}
                  keyExtractor={f => f.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.drawerRow}
                      onPress={() => handleOpenFolder(item.id)}
                      activeOpacity={0.65}>
                      <View style={styles.folderDot} />
                      <Text style={styles.drawerFolderName}>{item.name}</Text>
                      <Text style={styles.drawerChevron}>›</Text>
                    </TouchableOpacity>
                  )}
                  ListFooterComponent={DrawerSansDossierFooter}
                  contentContainerStyle={{ paddingVertical: 6 }}
                />
              ) : (
                <>
                  {drawerFolder && (
                    <Text style={styles.drawerFolderTitle}>{drawerFolder.name}</Text>
                  )}
                  {drawerNotes.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyText}>Aucune note dans ce dossier</Text>
                    </View>
                  ) : (
                    <FlatList
                      data={drawerNotes}
                      keyExtractor={n => n.id}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.drawerNoteRow}
                          onPress={() => handleOpenNote(item)}
                          activeOpacity={0.65}>
                          <Text style={styles.drawerNoteTitle} numberOfLines={1}>
                            {item.title || 'Sans titre'}
                          </Text>
                          <Text style={styles.drawerNoteDate}>{formatDate(item.updatedAt)}</Text>
                        </TouchableOpacity>
                      )}
                      contentContainerStyle={{ paddingVertical: 6 }}
                    />
                  )}
                </>
              )}
            </SafeAreaView>
          </Animated.View>
        </>
      )}

      {/*
        Folder selection modal — Bug 2 fix:
        Outer TouchableOpacity = backdrop (closes modal on tap outside).
        Inner TouchableOpacity = sheet content (absorbs taps, prevents propagation to backdrop).
        No absoluteFillObject + TouchableWithoutFeedback which can leave ghost overlays.
      */}
      <Modal
        visible={folderModalOpen}
        transparent
        animationType="slide"
        onRequestClose={closeFolderModal}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.sheetContainer}
          onPress={closeFolderModal}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Enregistrer dans...</Text>
              <TouchableOpacity
                onPress={() => {
                  setFolderEditMode(e => !e);
                  setInlineEditFolderId(null);
                }}>
                <Text style={[styles.modifyBtn, folderEditMode && { color: C.primary }]}>
                  {folderEditMode ? 'Terminer' : 'Modifier'}
                </Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={folders}
              keyExtractor={f => f.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <View style={styles.sheetFolderRow}>
                  {folderEditMode ? (
                    inlineEditFolderId === item.id ? (
                      // Bug 1 fix: inline TextInput, no stacked modal
                      <TextInput
                        value={inlineEditFolderName}
                        onChangeText={setInlineEditFolderName}
                        style={styles.inlineRenameInput}
                        autoFocus
                        editable={true}
                        autoCapitalize="sentences"
                        returnKeyType="done"
                        onSubmitEditing={() => commitInlineRename(item.id)}
                        onBlur={() => commitInlineRename(item.id)}
                        selectTextOnFocus
                      />
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.renameTouchable}
                          onPress={() => startInlineRename(item)}>
                          <View style={styles.folderDot} />
                          <Text style={styles.sheetFolderName}>{item.name}</Text>
                          <Text style={styles.editHint}>Renommer</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDeleteFolder(item)}>
                          <Text style={styles.deleteBtnText}>✕</Text>
                        </TouchableOpacity>
                      </>
                    )
                  ) : (
                    <TouchableOpacity
                      style={styles.sheetFolderBtn}
                      onPress={() => handleSaveToFolder(item.id)}
                      activeOpacity={0.65}>
                      <View style={styles.folderDot} />
                      <Text style={styles.sheetFolderName}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              ListFooterComponent={ModalSansDossierFooter}
              style={{ maxHeight: 320 }}
            />
            <TouchableOpacity
              style={styles.addFolderBtn}
              onPress={() => {
                setFolderModalOpen(false);
                setFolderEditMode(false);
                setInlineEditFolderId(null);
                setNewFolderModalOpen(true);
              }}>
              <Text style={styles.addFolderText}>+ Nouveau dossier</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* New folder modal — same Bug 2 fix pattern */}
      <Modal
        visible={newFolderModalOpen}
        transparent
        animationType="fade"
        onRequestClose={cancelNewFolder}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.centeredContainer}
          onPress={cancelNewFolder}>
          <TouchableOpacity activeOpacity={1} style={styles.centeredCard} onPress={() => {}}>
            <Text style={styles.centeredCardTitle}>Nouveau dossier</Text>
            <TextInput
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholder="Nom du dossier"
              placeholderTextColor={C.textMuted}
              style={styles.centeredInput}
              autoFocus
              editable={true}
              autoCapitalize="sentences"
              onSubmitEditing={handleAddFolder}
              returnKeyType="done"
            />
            <View style={styles.centeredBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={cancelNewFolder}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleAddFolder}>
                <Text style={styles.confirmBtnText}>Créer</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.surface,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  hamburger: {
    fontSize: 22,
    color: C.text,
  },

  // Editor
  editor: {
    flex: 1,
    backgroundColor: C.surface,
  },
  editorContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: '700',
    color: C.text,
    marginBottom: 12,
    padding: 0,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 16,
  },
  contentInput: {
    fontSize: 16,
    color: C.text,
    lineHeight: 26,
    padding: 0,
    minHeight: 300,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 10,
  },
  fabIcon: {
    fontSize: 18,
  },
  fabText: {
    color: C.surface,
    fontSize: 15,
    fontWeight: '700',
  },

  // Drawer
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.32)',
    zIndex: 10,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: C.surface,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 24,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    flex: 1,
  },
  drawerBack: {
    fontSize: 16,
    color: C.primary,
    fontWeight: '600',
  },
  drawerClose: {
    fontSize: 16,
    color: C.textMuted,
  },
  drawerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  drawerSeparator: {
    height: 1,
    backgroundColor: C.borderStrong,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  folderDot: {
    width: 9,
    height: 9,
    borderRadius: 3,
    backgroundColor: C.primary,
    marginRight: 12,
    opacity: 0.7,
  },
  drawerFolderName: {
    flex: 1,
    fontSize: 15,
    color: C.text,
    fontWeight: '500',
  },
  drawerNoteCount: {
    fontSize: 12,
    color: C.textMuted,
    marginRight: 6,
  },
  drawerChevron: {
    fontSize: 20,
    color: C.textMuted,
  },
  drawerFolderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textSub,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  drawerNoteRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  drawerNoteTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    marginBottom: 3,
  },
  drawerNoteDate: {
    fontSize: 12,
    color: C.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Folder modal — bottom sheet
  sheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.borderStrong,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  modifyBtn: {
    fontSize: 14,
    color: C.textMuted,
    fontWeight: '500',
  },
  sheetSeparator: {
    height: 1,
    backgroundColor: C.borderStrong,
    marginHorizontal: 20,
    marginTop: 4,
  },
  sheetFolderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sheetFolderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sheetFolderName: {
    flex: 1,
    fontSize: 15,
    color: C.text,
    fontWeight: '500',
  },
  renameTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  editHint: {
    fontSize: 12,
    color: C.primary,
    fontWeight: '500',
  },
  // Inline rename input (Bug 1 fix)
  inlineRenameInput: {
    flex: 1,
    fontSize: 15,
    color: C.text,
    fontWeight: '500',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0,
  },
  deleteBtn: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  deleteBtnText: {
    fontSize: 16,
    color: C.danger,
    fontWeight: '600',
  },
  addFolderBtn: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addFolderText: {
    fontSize: 15,
    color: C.textMuted,
    fontWeight: '500',
  },

  // Centered modals (new folder)
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  centeredCard: {
    width: SCREEN_WIDTH * 0.82,
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
  },
  centeredCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    marginBottom: 18,
    textAlign: 'center',
  },
  centeredInput: {
    borderWidth: 1.5,
    borderColor: C.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: C.text,
    marginBottom: 20,
  },
  centeredBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    color: C.textSub,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 15,
    color: C.surface,
    fontWeight: '700',
  },
});
