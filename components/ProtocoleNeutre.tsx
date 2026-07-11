import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Easing, ScrollView, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

// ─── Types ────────────────────────────────────────────────────────────────────

type Etape =
  | 'accueil'
  | 'appui'
  | 'respiration'
  | 'reduire'
  | 'evolution'
  | 'brancheA'
  | 'brancheB1'
  | 'brancheB2'
  | 'brancheB3'
  | 'mouvement'
  | 'contact'
  | 'brancheC1'
  | 'aide_immediate';

// ─── Constantes ───────────────────────────────────────────────────────────────

const MESSAGE_CONTACT =
  "Je traverse un moment difficile et j'ai du mal à comprendre ce que je ressens. " +
  "Est-ce que tu peux simplement rester avec moi quelques minutes, par message ou au téléphone ?";

const C = {
  bg:           '#F5F3FF',
  primary:      '#7C6CF2',
  primaryLight: '#EDE9FE',
  primaryMuted: '#C4B9FB',
  text:         '#1C1B33',
  textSub:      '#6B7280',
  textMuted:    '#B0B8C1',
  border:       '#F0EDF8',
  dangerText:   '#7C1D2A',
  dangerBold:   '#B91C1C',
  dangerBorder: '#FCA5A5',
};

// ─── Composant ────────────────────────────────────────────────────────────────

export default function ProtocoleNeutre({ onBack }: { onBack: () => void }) {
  const [etape, setEtapeRaw] = useState<Etape>('accueil');
  const historyRef = useRef<Etape[]>([]);

  // Breathing animation (écran 3)
  const breathScale = useRef(new Animated.Value(0.72)).current;
  const breathLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const [breathDone, setBreathDone] = useState(false);

  // B2 — minuteur silencieux 60 s
  const timerPulse = useRef(new Animated.Value(0.3)).current;
  const timerPulseRef = useRef<Animated.CompositeAnimation | null>(null);
  const [timerDone, setTimerDone] = useState(false);

  // ── Navigation ──────────────────────────────────────────────────────────────

  const navigate = (next: Etape) => {
    historyRef.current = [...historyRef.current, etape];
    setEtapeRaw(next);
  };

  const goBack = () => {
    const h = historyRef.current;
    if (h.length === 0) { onBack(); return; }
    historyRef.current = h.slice(0, -1);
    setEtapeRaw(h[h.length - 1]);
  };

  // ── Animation de respiration ────────────────────────────────────────────────

  useEffect(() => {
    breathLoopRef.current?.stop();
    if (etape !== 'respiration') return;

    setBreathDone(false);
    breathScale.setValue(0.72);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathScale, {
          toValue: 1, duration: 4500,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
        Animated.timing(breathScale, {
          toValue: 0.72, duration: 4500,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
      ])
    );
    breathLoopRef.current = loop;
    loop.start();

    const timer = setTimeout(() => {
      loop.stop();
      setBreathDone(true);
    }, 45000);

    return () => { clearTimeout(timer); loop.stop(); };
  }, [etape]);

  // ── Minuteur silencieux (B2) ────────────────────────────────────────────────

  useEffect(() => {
    timerPulseRef.current?.stop();
    if (etape !== 'brancheB2') return;

    setTimerDone(false);
    timerPulse.setValue(0.3);

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(timerPulse, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(timerPulse, { toValue: 0.3, duration: 2200, useNativeDriver: true }),
      ])
    );
    timerPulseRef.current = pulse;
    pulse.start();

    const timer = setTimeout(async () => {
      pulse.stop();
      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      setTimerDone(true);
    }, 60000);

    return () => { clearTimeout(timer); pulse.stop(); };
  }, [etape]);

  // ── Lien « Je ne me sens pas en sécurité » ─────────────────────────────────

  const showSecuriteLink = etape !== 'brancheC1' && etape !== 'aide_immediate';

  const SecuriteLink = () => (
    <View style={styles.securiteBar}>
      <TouchableOpacity
        onPress={() => navigate('brancheC1')}
        hitSlop={{ top: 12, bottom: 12, left: 20, right: 20 }}
        activeOpacity={0.55}>
        <Text style={styles.securiteText}>Je ne me sens pas en sécurité</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Écrans ──────────────────────────────────────────────────────────────────

  const renderScreen = (): React.ReactNode => {
    switch (etape) {

      // ── 1 · Accueil ──────────────────────────────────────────────────────────
      case 'accueil':
        return (
          <View style={styles.screen}>
            <View style={styles.centeredContent}>
              <Text style={styles.titre}>
                {"Tu n'as pas besoin de savoir ce que tu ressens."}
              </Text>
              <Text style={styles.corps}>
                {"On va simplement rendre ce moment un peu plus supportable. Rien à expliquer. Une seule étape à la fois."}
              </Text>
            </View>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => navigate('appui')} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>Guide-moi</Text>
            </TouchableOpacity>
          </View>
        );

      // ── 2 · Appui physique ───────────────────────────────────────────────────
      case 'appui':
        return (
          <View style={styles.screen}>
            <View style={styles.centeredContent}>
              <Text style={styles.titre}>Trouve un appui.</Text>
              <Text style={styles.corps}>
                {"Pose tes pieds au sol. Si ce n'est pas possible, sens simplement le support sous ton corps. Laisse ton regard se poser sur un point immobile."}
              </Text>
            </View>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => navigate('respiration')} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>{"C'est fait"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigate('respiration')} activeOpacity={0.55} style={styles.passerWrap}>
              <Text style={styles.passerText}>Passer cette étape</Text>
            </TouchableOpacity>
          </View>
        );

      // ── 3 · Respiration ──────────────────────────────────────────────────────
      case 'respiration':
        return (
          <View style={styles.screen}>
            <View style={styles.centeredContent}>
              <Text style={styles.titre}>Souffle doucement.</Text>
              <Text style={styles.corps}>
                {"Laisse l'air sortir lentement, sans forcer. Puis laisse-le revenir naturellement. Continue à ton rythme."}
              </Text>
              <View style={styles.breathWrap}>
                <Animated.View style={[styles.breathCircle, { transform: [{ scale: breathScale }] }]} />
              </View>
            </View>
            {breathDone ? (
              <TouchableOpacity style={styles.btnPrimary} onPress={() => navigate('reduire')} activeOpacity={0.85}>
                <Text style={styles.btnPrimaryText}>Continuer</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => navigate('reduire')} activeOpacity={0.55} style={styles.passerWrap}>
                <Text style={styles.passerText}>Passer cet exercice</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      // ── 4 · Réduire une sollicitation ────────────────────────────────────────
      case 'reduire':
        return (
          <View style={styles.screen}>
            <View style={styles.centeredContent}>
              <Text style={styles.titre}>Réduis une seule chose.</Text>
              <Text style={styles.corps}>
                {"Un bruit. Une lumière. Une notification. Une demande. Tu n'as pas besoin de tout arrêter. Une seule chose suffit."}
              </Text>
            </View>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => navigate('evolution')} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>{"C'est fait"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnSecondary, { marginTop: 12 }]} onPress={() => navigate('evolution')} activeOpacity={0.75}>
              <Text style={styles.btnSecondaryText}>Je ne peux pas maintenant</Text>
            </TouchableOpacity>
          </View>
        );

      // ── 5 · Évolution ────────────────────────────────────────────────────────
      case 'evolution':
        return (
          <View style={styles.screen}>
            <View style={styles.centeredContent}>
              <Text style={styles.titre}>Comment est-ce maintenant ?</Text>
              <Text style={styles.sousTitre}>Ne cherche pas le mot exact.</Text>
              <View style={styles.choixColonne}>
                {([
                  { label: 'Un peu plus supportable', dest: 'brancheA' },
                  { label: 'Pareil ou je ne sais pas', dest: 'brancheB1' },
                  { label: 'Plus difficile',           dest: 'brancheC1' },
                ] as { label: string; dest: Etape }[]).map(({ label, dest }) => (
                  <TouchableOpacity key={dest} style={styles.choixBtn} onPress={() => navigate(dest)} activeOpacity={0.8}>
                    <Text style={styles.choixBtnText}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );

      // ── A · Un peu plus supportable ──────────────────────────────────────────
      case 'brancheA':
        return (
          <View style={styles.screen}>
            <View style={styles.centeredContent}>
              <Text style={styles.titre}>{"C'est suffisant pour maintenant."}</Text>
              <Text style={styles.corps}>
                {"Tu n'as pas besoin d'aller mieux d'un coup. Protège ce petit espace avant de reprendre."}
              </Text>
            </View>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => navigate('brancheB3')} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>{"M'aider à choisir une seule prochaine action"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnSecondary, { marginTop: 12 }]} onPress={onBack} activeOpacity={0.75}>
              <Text style={styles.btnSecondaryText}>Rester encore un moment</Text>
            </TouchableOpacity>
          </View>
        );

      // ── B1 · On continue sans analyser ───────────────────────────────────────
      case 'brancheB1':
        return (
          <View style={styles.screen}>
            <View style={styles.centeredContent}>
              <Text style={styles.titre}>On continue sans analyser.</Text>
              <Text style={styles.corps}>
                {"Tu n'as toujours pas besoin de comprendre ce qui se passe. Je vais te proposer une seule chose à faire."}
              </Text>
            </View>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => navigate('brancheB2')} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>Choisis pour moi</Text>
            </TouchableOpacity>
          </View>
        );

      // ── B2 · Minuteur silencieux ──────────────────────────────────────────────
      case 'brancheB2':
        return (
          <View style={styles.screen}>
            <View style={styles.centeredContent}>
              <Text style={styles.titre}>Pendant une minute, ne règle rien.</Text>
              <Text style={styles.corps}>
                {"Pose ton téléphone près de toi, écran retourné si tu le peux. Tu n'as rien à décider pendant cette minute."}
              </Text>
              <View style={styles.timerWrap}>
                {timerDone ? (
                  <Text style={styles.timerCheck}>✓</Text>
                ) : (
                  <Animated.View style={[styles.timerDot, { opacity: timerPulse }]} />
                )}
              </View>
            </View>
            {timerDone ? (
              <TouchableOpacity style={styles.btnPrimary} onPress={() => navigate('brancheB3')} activeOpacity={0.85}>
                <Text style={styles.btnPrimaryText}>De quoi ai-je besoin maintenant ?</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => navigate('brancheB3')} activeOpacity={0.55} style={styles.passerWrap}>
                <Text style={styles.passerText}>{"J'ai besoin d'une autre forme d'aide"}</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      // ── B3 · De quoi as-tu besoin ────────────────────────────────────────────
      case 'brancheB3':
        return (
          <View style={styles.screen}>
            <View style={styles.centeredContent}>
              <Text style={styles.titre}>De quoi as-tu besoin maintenant ?</Text>
              <View style={styles.choixColonne}>
                {([
                  { label: 'Réduire encore les sollicitations',              dest: 'reduire'   },
                  { label: 'Remettre doucement mon corps en mouvement',       dest: 'mouvement' },
                  { label: "Être accompagné par quelqu'un",                   dest: 'contact'   },
                  { label: 'Choisis encore pour moi',                         dest: 'brancheB2' },
                ] as { label: string; dest: Etape }[]).map(({ label, dest }) => (
                  <TouchableOpacity key={dest} style={styles.choixBtn} onPress={() => navigate(dest)} activeOpacity={0.8}>
                    <Text style={styles.choixBtnText}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );

      // ── Mouvement ────────────────────────────────────────────────────────────
      case 'mouvement':
        return (
          <View style={styles.screen}>
            <View style={styles.centeredContent}>
              <Text style={styles.titre}>Bouge doucement.</Text>
              <Text style={styles.corps}>
                {"Étire tes bras vers le haut, tourne la tête de gauche à droite, ou marche quelques pas. Il n'y a pas de bonne façon de faire."}
              </Text>
            </View>
            <TouchableOpacity style={styles.btnPrimary} onPress={onBack} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>{"C'est fait"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigate('brancheB3')} activeOpacity={0.55} style={styles.passerWrap}>
              <Text style={styles.passerText}>Passer cette étape</Text>
            </TouchableOpacity>
          </View>
        );

      // ── Contact ──────────────────────────────────────────────────────────────
      case 'contact':
        return (
          <View style={styles.screen}>
            <View style={styles.topContent}>
              <Text style={styles.titre}>{"Tu n'as pas à expliquer parfaitement."}</Text>
              <Text style={styles.corps}>Tu peux envoyer ce message tel quel :</Text>
              <View style={styles.messageCard}>
                <Text style={styles.messageText}>{MESSAGE_CONTACT}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => Share.share({ message: MESSAGE_CONTACT })}
              activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>Envoyer à une personne de confiance</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnSecondary, { marginTop: 12 }]}
              onPress={() => Share.share({ message: MESSAGE_CONTACT })}
              activeOpacity={0.75}>
              <Text style={styles.btnSecondaryText}>Copier le message</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigate('brancheB3')} activeOpacity={0.55} style={styles.passerWrap}>
              <Text style={styles.passerText}>Je préfère continuer seul pour le moment</Text>
            </TouchableOpacity>
          </View>
        );

      // ── C1 · Vérification de sécurité ────────────────────────────────────────
      case 'brancheC1':
        return (
          <View style={styles.screen}>
            <View style={styles.centeredContent}>
              <Text style={styles.titreDanger}>{"Vérifions d'abord ta sécurité."}</Text>
              <Text style={styles.corpsDanger}>
                {"Est-ce que tu risques de te faire du mal, ou est-ce que quelqu'un te met actuellement en danger ?"}
              </Text>
            </View>
            <TouchableOpacity style={styles.btnDanger} onPress={() => navigate('aide_immediate')} activeOpacity={0.85}>
              <Text style={styles.btnDangerText}>Oui ou je ne suis pas sûr</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnSecondary, { marginTop: 12 }]} onPress={() => navigate('brancheB3')} activeOpacity={0.75}>
              <Text style={styles.btnSecondaryText}>Non</Text>
            </TouchableOpacity>
          </View>
        );

      // ── Aide immédiate ────────────────────────────────────────────────────────
      case 'aide_immediate':
        return (
          <View style={styles.topContent}>
            <Text style={styles.titreDanger}>Ne reste pas seul avec cette situation.</Text>
            <Text style={styles.corpsDanger}>
              {"Contacte maintenant une personne capable de rester avec toi ou un service d'urgence."}
            </Text>

            {/* Ressources France — boutons désactivés, à activer ultérieurement */}
            <View style={styles.ressourcesCard}>
              <TouchableOpacity style={[styles.ressourceBtn, styles.ressourceBtnDisabled]} disabled activeOpacity={1}>
                <Text style={styles.ressourceBtnIcon}>🚨</Text>
                <View style={styles.ressourceBtnBody}>
                  <Text style={styles.ressourceBtnLabel}>Danger immédiat ou urgence médicale</Text>
                  <Text style={styles.ressourceBtnNum}>Appeler le 15 ou le 112</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.ressourceSep} />
              <TouchableOpacity style={[styles.ressourceBtn, styles.ressourceBtnDisabled]} disabled activeOpacity={1}>
                <Text style={styles.ressourceBtnIcon}>💙</Text>
                <View style={styles.ressourceBtnBody}>
                  <Text style={styles.ressourceBtnLabel}>Détresse ou pensées suicidaires</Text>
                  <Text style={styles.ressourceBtnNum}>Appeler le 3114</Text>
                  <Text style={styles.ressourceBtnDesc}>Gratuit · 24h/24 et 7j/7 en France</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Actions secondaires — désactivées, à activer ultérieurement */}
            <TouchableOpacity style={[styles.btnSecondary, styles.btnDisabled, { marginTop: 16 }]} disabled activeOpacity={1}>
              <Text style={[styles.btnSecondaryText, { opacity: 0.45 }]}>Appeler une personne de confiance</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnSecondary, styles.btnDisabled, { marginTop: 10 }]} disabled activeOpacity={1}>
              <Text style={[styles.btnSecondaryText, { opacity: 0.45 }]}>Partager ma position</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.passerWrap, { marginTop: 8 }]} activeOpacity={0.55}>
              <Text style={styles.passerText}>Rester sur cet écran</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  // ── Rendu principal ──────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      {/* Barre de navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={goBack} hitSlop={8} activeOpacity={0.65} style={styles.navBack}>
          <Text style={styles.navBackText}>
            {etape === 'accueil' ? '✕' : '‹ Retour'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenu scrollable */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {renderScreen()}
      </ScrollView>

      {/* Lien sécurité — fixe en bas, hors du scroll */}
      {showSecuriteLink && <SecuriteLink />}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  navBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10,
    minHeight: 44,
  },
  navBack: { paddingRight: 12 },
  navBackText: { fontSize: 16, color: C.primary, fontWeight: '600' },

  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1, paddingHorizontal: 24,
    paddingTop: 8, paddingBottom: 20,
  },

  // ── Conteneurs d'écran ──────────────────────────────────────────────────────
  screen: { flex: 1, justifyContent: 'space-between', minHeight: 400 },
  centeredContent: { flex: 1, justifyContent: 'center', paddingBottom: 28 },
  topContent: { paddingBottom: 20 },

  // ── Typographie ─────────────────────────────────────────────────────────────
  titre: {
    fontSize: 26, fontWeight: '800', color: C.text,
    letterSpacing: -0.4, lineHeight: 34, marginBottom: 18,
  },
  sousTitre: {
    fontSize: 16, color: C.textSub, marginBottom: 28, lineHeight: 22, marginTop: -6,
  },
  corps: {
    fontSize: 17, color: C.textSub, lineHeight: 26,
  },
  titreDanger: {
    fontSize: 26, fontWeight: '800', color: C.dangerText,
    letterSpacing: -0.4, lineHeight: 34, marginBottom: 18,
  },
  corpsDanger: {
    fontSize: 17, color: C.dangerText, lineHeight: 26, opacity: 0.85,
  },

  // ── Choix (boutons de sélection) ────────────────────────────────────────────
  choixColonne: { gap: 12, marginTop: 20 },
  choixBtn: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1.5, borderColor: C.border,
    paddingVertical: 18, paddingHorizontal: 16,
  },
  choixBtnText: {
    fontSize: 16, fontWeight: '600', color: C.text, textAlign: 'center',
  },

  // ── Boutons d'action ────────────────────────────────────────────────────────
  btnPrimary: {
    backgroundColor: C.primary, borderRadius: 16, paddingVertical: 18,
    alignItems: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.26, shadowRadius: 12, elevation: 6,
  },
  btnPrimaryText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },

  btnSecondary: {
    borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    borderWidth: 1.5, borderColor: C.border, backgroundColor: '#FFFFFF',
  },
  btnSecondaryText: { fontSize: 16, fontWeight: '600', color: C.text },

  btnDanger: {
    backgroundColor: '#B91C1C', borderRadius: 16, paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#B91C1C', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28, shadowRadius: 10, elevation: 5,
  },
  btnDangerText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },

  btnDisabled: { opacity: 0.42 },

  // ── Liens discrets ──────────────────────────────────────────────────────────
  passerWrap: { alignItems: 'center', paddingVertical: 16 },
  passerText: { fontSize: 14, color: C.textMuted, fontWeight: '500' },

  // ── Lien sécurité permanent ─────────────────────────────────────────────────
  securiteBar: {
    alignItems: 'center', paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border,
  },
  securiteText: { fontSize: 13, color: C.textMuted, fontWeight: '500' },

  // ── Animation respiration ───────────────────────────────────────────────────
  breathWrap: {
    alignItems: 'center', justifyContent: 'center',
    height: 200, marginTop: 28,
  },
  breathCircle: {
    width: 148, height: 148, borderRadius: 74,
    backgroundColor: C.primaryLight,
    borderWidth: 2, borderColor: C.primaryMuted,
  },

  // ── Minuteur silencieux ─────────────────────────────────────────────────────
  timerWrap: {
    alignItems: 'center', justifyContent: 'center',
    height: 120, marginTop: 28,
  },
  timerDot: {
    width: 14, height: 14, borderRadius: 7, backgroundColor: C.primary,
  },
  timerCheck: {
    fontSize: 36, color: C.primary, fontWeight: '700',
  },

  // ── Message de contact ──────────────────────────────────────────────────────
  messageCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1.5, borderColor: C.border,
    padding: 18, marginTop: 18, marginBottom: 28,
  },
  messageText: { fontSize: 15, color: C.text, lineHeight: 24 },

  // ── Ressources d'urgence ────────────────────────────────────────────────────
  ressourcesCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1.5, borderColor: C.dangerBorder,
    overflow: 'hidden', marginTop: 24,
  },
  ressourceBtn: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
  ressourceBtnDisabled: { opacity: 0.5 },
  ressourceBtnIcon: { fontSize: 24 },
  ressourceBtnBody: { flex: 1, gap: 2 },
  ressourceBtnLabel: { fontSize: 13, fontWeight: '600', color: C.dangerText },
  ressourceBtnNum: { fontSize: 17, fontWeight: '800', color: C.dangerBold },
  ressourceBtnDesc: { fontSize: 12, color: C.dangerText, marginTop: 2 },
  ressourceSep: { height: StyleSheet.hairlineWidth, backgroundColor: C.dangerBorder },
});
