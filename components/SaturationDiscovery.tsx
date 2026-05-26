import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brain, Activity, Zap, RefreshCw, Shield, Check } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SubView = 'hub' | 'info' | 'signals' | 'triggers' | 'reflexes' | 'plan';

type Props = {
  onBack: () => void;
  onExpressFlow: () => void;
};

const STORAGE_KEYS = {
  signals: 'saturation_signals',
  triggers: 'saturation_triggers',
  reflexes: 'saturation_reflexes',
  firstAction: 'saturation_first_action',
  phrase: 'saturation_phrase',
  section1Read: 'saturation_section1_read',
};

const C = {
  bg: '#F5F3FF',
  surface: '#FFFFFF',
  primary: '#7C6CF2',
  primaryLight: '#EDE9FE',
  primaryMuted: '#C4B9FB',
  text: '#1C1B33',
  textSub: '#6B7280',
  border: '#F0EDF8',
  expandBg: '#F8F6FF',
  warning: '#F59E0B',
  green: '#16A34A',
};

const SIGNAL_CATEGORIES = [
  {
    key: 'mind',
    label: 'Dans ma tête',
    signals: [
      { key: 'mind_1', label: 'je saute d\'une pensée à l\'autre' },
      { key: 'mind_2', label: 'je relis sans comprendre' },
      { key: 'mind_3', label: 'tout me paraît urgent' },
      { key: 'mind_4', label: 'je n\'arrive plus à prioriser' },
      { key: 'mind_5', label: 'j\'ai des pensées en boucle' },
      { key: 'mind_6', label: 'je perds le fil' },
      { key: 'mind_7', label: 'j\'oublie ce que je faisais il y a 10 secondes' },
      { key: 'mind_8', label: 'ma tête est comme dans du coton' },
    ],
  },
  {
    key: 'body',
    label: 'Dans mon corps',
    signals: [
      { key: 'body_1', label: 'je suis tendue sans raison' },
      { key: 'body_2', label: 'j\'ai mal à la tête' },
      { key: 'body_3', label: 'je suis fatiguée sans avoir bougé' },
      { key: 'body_4', label: 'je sens une pression dans la poitrine' },
      { key: 'body_5', label: 'mes yeux sont lourds' },
      { key: 'body_6', label: 'je suis physiquement agitée' },
      { key: 'body_7', label: 'j\'ai envie de me recroqueviller' },
    ],
  },
  {
    key: 'behavior',
    label: 'Dans mon comportement',
    signals: [
      { key: 'beh_1', label: 'je saute d\'une app à l\'autre' },
      { key: 'beh_2', label: 'je commence sans finir' },
      { key: 'beh_3', label: 'j\'évite les tâches même simples' },
      { key: 'beh_4', label: 'je veux tout ranger d\'un coup' },
      { key: 'beh_5', label: 'je procrastine en faisant des petites choses' },
      { key: 'beh_6', label: 'je n\'arrive pas à m\'arrêter mais je n\'avance pas' },
    ],
  },
  {
    key: 'social',
    label: 'Avec les autres',
    signals: [
      { key: 'soc_1', label: 'je réponds sèchement' },
      { key: 'soc_2', label: 'je veux être seule' },
      { key: 'soc_3', label: 'les demandes m\'agressent' },
      { key: 'soc_4', label: 'je me sens incomprise' },
      { key: 'soc_5', label: 'j\'ai envie de tout annuler' },
      { key: 'soc_6', label: 'je ne supporte plus les conversations' },
    ],
  },
  {
    key: 'phone',
    label: 'Avec mon téléphone',
    signals: [
      { key: 'ph_1', label: 'je scrolle sans m\'en rendre compte' },
      { key: 'ph_2', label: 'je saute d\'une app à l\'autre' },
      { key: 'ph_3', label: 'je regarde mon écran sans raison' },
      { key: 'ph_4', label: 'les notifications m\'irritent' },
      { key: 'ph_5', label: 'je veux éteindre tout mais je n\'y arrive pas' },
    ],
  },
];

const SIGNALS_TOTAL = SIGNAL_CATEGORIES.reduce((sum, c) => sum + c.signals.length, 0);

const TRIGGERS = [
  { key: 'trig_bruit', label: 'bruit' },
  { key: 'trig_lumiere', label: 'lumière forte' },
  { key: 'trig_desordre', label: 'désordre visuel' },
  { key: 'trig_faim', label: 'faim' },
  { key: 'trig_fatigue', label: 'fatigue' },
  { key: 'trig_sommeil', label: 'manque de sommeil' },
  { key: 'trig_notifs', label: 'trop de notifications' },
  { key: 'trig_messages', label: 'trop de messages non répondus' },
  { key: 'trig_deadlines', label: 'deadlines' },
  { key: 'trig_imprevus', label: 'imprévus' },
  { key: 'trig_choix', label: 'trop de choix' },
  { key: 'trig_social', label: 'pression sociale' },
  { key: 'trig_conflits', label: 'conflits' },
  { key: 'trig_comparaison', label: 'comparaison' },
  { key: 'trig_taches', label: 'trop de tâches ouvertes' },
  { key: 'trig_telephone', label: 'téléphone' },
  { key: 'trig_pause', label: 'manque de pause' },
  { key: 'trig_transitions', label: 'transitions entre tâches' },
];

const TRIGGERS_TOTAL = TRIGGERS.length;

const REFLEXES = [
  {
    key: 'scroll',
    title: 'Je scrolle',
    cherche: 'stimulation simple sans décision',
    aggrave: 'plus d\'images, de bruit, de comparaison',
    alternative: 'timer 3 minutes puis action sensorielle',
  },
  {
    key: 'isole',
    title: 'Je m\'isole brutalement',
    cherche: 'réduire les demandes sociales',
    aggrave: 'culpabilité, incompréhension des autres',
    alternative: 'envoyer un message court "j\'ai besoin de 30 min, je reviens"',
  },
  {
    key: 'energie',
    title: 'Je m\'énerve',
    cherche: 'repousser un stimulus de trop',
    aggrave: 'honte, tension relationnelle',
    alternative: '"je sens que je vais mal répondre, je fais une pause"',
  },
  {
    key: 'figee',
    title: 'Je reste figée',
    cherche: 'ne pas aggraver en agissant mal',
    aggrave: 'sentiment d\'échec, retard',
    alternative: 'une micro-action physique de 2 minutes',
  },
  {
    key: 'ranger',
    title: 'Je veux tout ranger d\'un coup',
    cherche: 'retrouver du contrôle',
    aggrave: 'trop grand, donc échec ou épuisement',
    alternative: 'une seule surface, 5 minutes',
  },
  {
    key: 'dort',
    title: 'Je dors pour fuir',
    cherche: 'couper l\'entrée d\'informations',
    aggrave: 'parfois utile, parfois laisse tout intact',
    alternative: 'repos volontaire de 20 min avec alarme + prochaine action notée avant',
  },
  {
    key: 'mille',
    title: 'Je fais mille choses à la fois',
    cherche: 'avoir l\'impression d\'avancer',
    aggrave: 'disperse l\'énergie, augmente la confusion',
    alternative: 'choisir une seule tâche physique visible',
  },
  {
    key: 'seche',
    title: 'Je réponds sèchement',
    cherche: 'économiser de l\'énergie',
    aggrave: 'tension relationnelle, culpabilité',
    alternative: 'ne pas répondre maintenant et noter "répondre quand ça va mieux"',
  },
];

const INFO_CARDS = [
  {
    key: 'urgent',
    question: 'Pourquoi tout me paraît urgent ?',
    answer:
      'Quand le cerveau est saturé, il trie moins bien. Une tâche importante, une notification et une pensée anxieuse peuvent donner la même sensation d\'urgence. Ce n\'est pas que tout est urgent — c\'est que le système de tri est débordé.',
  },
  {
    key: 'choisir',
    question: 'Pourquoi je n\'arrive plus à choisir ?',
    answer:
      'Choisir demande de comparer, d\'éliminer, de décider. Ces trois actions utilisent les fonctions exécutives — exactement celles qui s\'éteignent en saturation. Ce n\'est pas de la faiblesse. C\'est de la surcharge.',
  },
  {
    key: 'bruit',
    question: 'Pourquoi le bruit m\'agresse autant ?',
    answer:
      'En saturation, le cerveau filtre moins bien les stimuli. Les sons deviennent plus intenses, plus envahissants. Ce qui était supportable ne l\'est plus. C\'est un signal que le système est plein.',
  },
  {
    key: 'todo',
    question: 'Pourquoi une to-do list peut aggraver ?',
    answer:
      'Faire une liste demande de prioriser — la compétence exacte qui manque en saturation. Pire : voir toute la liste peut amplifier la sensation que tout est urgent. Parfois, moins d\'informations visibles aide plus.',
  },
  {
    key: 'stress',
    question: 'Ce n\'est pas juste du stress.',
    answer:
      'Le stress est une réponse à une menace. La saturation est une surcharge du système de traitement. Les deux peuvent coexister, mais la saturation se traite différemment : pas en ajoutant de la pression, mais en réduisant le volume.',
  },
  {
    key: 'nulle',
    question: 'Pourquoi je me sens nulle quand je sature ?',
    answer:
      'Parce que la saturation touche exactement les fonctions visibles : décider, agir, communiquer, s\'organiser. Mais ce sont des fonctions cognitives, pas des traits de caractère. Saturer ne dit rien sur ta valeur.',
  },
];

const SUGGESTED_PHRASES = [
  'Ce n\'est pas tout qui est urgent, c\'est mon cerveau qui est saturé.',
  'Je baisse le volume avant de chercher une solution.',
  'Je peux faire une seule chose.',
  'Mon cerveau a besoin d\'espace, pas de pression.',
];

const NAV_TABS: { key: SubView; label: string }[] = [
  { key: 'info', label: 'Ce que c\'est' },
  { key: 'signals', label: 'Signaux' },
  { key: 'triggers', label: 'Déclencheurs' },
  { key: 'reflexes', label: 'Réflexes' },
  { key: 'plan', label: 'Mon plan' },
];

export default function SaturationDiscovery({ onBack, onExpressFlow }: Props) {
  const [view, setView] = useState<SubView>('hub');
  const [signals, setSignals] = useState<string[]>([]);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [reflexes, setReflexes] = useState<string[]>([]);
  const [firstAction, setFirstAction] = useState('');
  const [phrase, setPhrase] = useState('');
  const [section1Read, setSection1Read] = useState(false);
  const [openCats, setOpenCats] = useState<string[]>(['mind']);
  const [openReflex, setOpenReflex] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const load = async () => {
      try {
        const [s, t, r, fa, ph, s1] = await AsyncStorage.multiGet([
          STORAGE_KEYS.signals,
          STORAGE_KEYS.triggers,
          STORAGE_KEYS.reflexes,
          STORAGE_KEYS.firstAction,
          STORAGE_KEYS.phrase,
          STORAGE_KEYS.section1Read,
        ]);
        if (s[1]) setSignals(JSON.parse(s[1]));
        if (t[1]) setTriggers(JSON.parse(t[1]));
        if (r[1]) setReflexes(JSON.parse(r[1]));
        if (fa[1]) setFirstAction(fa[1]);
        if (ph[1]) setPhrase(ph[1]);
        if (s1[1] === 'true') setSection1Read(true);
      } catch (_) {}
    };
    load();
  }, []);

  const toggleSignal = (key: string) => {
    setSignals(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      AsyncStorage.setItem(STORAGE_KEYS.signals, JSON.stringify(next));
      return next;
    });
  };

  const toggleTrigger = (key: string) => {
    setTriggers(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      AsyncStorage.setItem(STORAGE_KEYS.triggers, JSON.stringify(next));
      return next;
    });
  };

  const markReflexExplored = (key: string) => {
    setReflexes(prev => {
      if (prev.includes(key)) return prev;
      const next = [...prev, key];
      AsyncStorage.setItem(STORAGE_KEYS.reflexes, JSON.stringify(next));
      return next;
    });
  };

  const planProgress =
    (signals.length > 0 ? 25 : 0) +
    (triggers.length > 0 ? 25 : 0) +
    (reflexes.length >= 4 ? 25 : 0) +
    (firstAction.trim() && phrase.trim() ? 25 : 0);

  const handleInfoScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (section1Read) return;
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 40) {
        setSection1Read(true);
        AsyncStorage.setItem(STORAGE_KEYS.section1Read, 'true');
      }
    },
    [section1Read],
  );

  const toggleCat = (key: string) => {
    setOpenCats(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    );
  };

  const renderHub = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.hubContent, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hubHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>{'< Retour'}</Text>
        </TouchableOpacity>
        <Text style={styles.hubTitle}>Comprendre ma saturation</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.urgencyBlock}>
        <Text style={styles.urgencyQ}>Tu es en train de saturer maintenant ?</Text>
        <TouchableOpacity style={styles.urgencyBtn} onPress={onExpressFlow}>
          <Text style={styles.urgencyBtnText}>M'aider maintenant</Text>
        </TouchableOpacity>
      </View>

      <HubCard
        icon={<Brain size={24} color={C.primary} />}
        title="Ce que c'est"
        desc="Comprendre pourquoi tout peut sembler urgent, flou ou trop lourd quand tu satures."
        tags={['cerveau trop plein', 'tri difficile', 'surcharge']}
        progress={section1Read ? 'Lu ✓' : 'À lire'}
        onPress={() => setView('info')}
      />
      <HubCard
        icon={<Activity size={24} color={C.primary} />}
        title="Mes signaux"
        desc="Repérer les signes qui montrent que tu commences à saturer, avant d'arriver au crash."
        tags={['corps', 'pensées', 'comportements']}
        progress={`${signals.length}/${SIGNALS_TOTAL} repérés`}
        onPress={() => setView('signals')}
      />
      <HubCard
        icon={<Zap size={24} color={C.primary} />}
        title="Mes déclencheurs"
        desc="Comprendre ce qui te fait basculer : bruit, fatigue, messages, désordre, pression…"
        tags={['environnement', 'téléphone', 'fatigue']}
        progress={`${triggers.length}/${TRIGGERS_TOTAL} identifiés`}
        onPress={() => setView('triggers')}
      />
      <HubCard
        icon={<RefreshCw size={24} color={C.primary} />}
        title="Mes réflexes"
        desc="Voir ce que tu fais automatiquement quand tu satures et comprendre pourquoi."
        tags={['réflexes', 'évitement', 'alternatives']}
        progress={`${reflexes.length}/8 explorés`}
        onPress={() => setView('reflexes')}
      />
      <HubCard
        icon={<Shield size={24} color={C.primary} />}
        title="Mon plan"
        desc="Transformer ce que tu as appris en mini-plan personnel pour sortir plus vite de la saturation."
        tags={['profil', 'prévention', 'actions']}
        progress={`${planProgress}% prêt`}
        onPress={() => setView('plan')}
      />
    </ScrollView>
  );

  const renderSubPageHeader = () => {
    const tab = NAV_TABS.find(t => t.key === view);
    return (
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={() => setView('hub')} style={styles.backBtn}>
          <Text style={styles.backText}>{'< Hub'}</Text>
        </TouchableOpacity>
        <Text style={styles.subTitle}>{tab?.label ?? ''}</Text>
        <View style={styles.backBtn} />
      </View>
    );
  };

  const renderNavBar = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.navBar}
      contentContainerStyle={styles.navBarContent}
    >
      {NAV_TABS.map(tab => {
        const active = view === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setView(tab.key)}
            style={[styles.navTab, active && styles.navTabActive]}
          >
            <Text style={[styles.navTabText, active && styles.navTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderInfo = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.sectionContent, { paddingBottom: insets.bottom + 24 }]}
      onScroll={handleInfoScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    >
      {section1Read && (
        <Text style={styles.sectionReadBadge}>Section lue ✓</Text>
      )}
      {INFO_CARDS.map(card => (
        <View key={card.key} style={styles.infoCard}>
          <Text style={styles.infoQuestion}>{card.question}</Text>
          <Text style={styles.infoAnswer}>{card.answer}</Text>
        </View>
      ))}
    </ScrollView>
  );

  const renderSignals = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.sectionContent, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionSubtitle}>
        Coche ceux que tu reconnais souvent chez toi.
      </Text>
      {SIGNAL_CATEGORIES.map(cat => {
        const isOpen = openCats.includes(cat.key);
        const checkedInCat = cat.signals.filter(s => signals.includes(s.key)).length;
        return (
          <View key={cat.key} style={styles.accordionBlock}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => toggleCat(cat.key)}
            >
              <Text style={styles.accordionLabel}>{cat.label}</Text>
              <View style={styles.accordionHeaderRight}>
                {checkedInCat > 0 && (
                  <View style={styles.catBadge}>
                    <Text style={styles.catBadgeText}>{checkedInCat}</Text>
                  </View>
                )}
                <Text style={[styles.chevron, isOpen && styles.chevronOpen]}>›</Text>
              </View>
            </TouchableOpacity>
            {isOpen && (
              <View style={styles.accordionBody}>
                {cat.signals.map(sig => {
                  const checked = signals.includes(sig.key);
                  return (
                    <TouchableOpacity
                      key={sig.key}
                      style={[styles.signalRow, checked && styles.signalRowChecked]}
                      onPress={() => toggleSignal(sig.key)}
                    >
                      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                        {checked && <Check size={12} color={C.surface} />}
                      </View>
                      <Text style={[styles.signalLabel, checked && styles.signalLabelChecked]}>
                        {sig.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
      <Text style={styles.signalsTotal}>
        Total : {signals.length}/{SIGNALS_TOTAL} signaux repérés
      </Text>
    </ScrollView>
  );

  const renderTriggers = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.sectionContent, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionSubtitle}>
        Ce qui te fait souvent basculer. Coche ce que tu reconnais.
      </Text>
      <View style={styles.triggersGrid}>
        {TRIGGERS.map(trig => {
          const selected = triggers.includes(trig.key);
          return (
            <TouchableOpacity
              key={trig.key}
              style={[styles.triggerChip, selected && styles.triggerChipSelected]}
              onPress={() => toggleTrigger(trig.key)}
            >
              <Text style={[styles.triggerChipText, selected && styles.triggerChipTextSelected]}>
                {trig.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {triggers.length >= 2 && (
        <View style={styles.triggerComboBlock}>
          <Text style={styles.triggerComboLabel}>Ton combo à risque semble être :</Text>
          <Text style={styles.triggerComboValue}>
            {triggers
              .slice(0, 3)
              .map(k => TRIGGERS.find(t => t.key === k)?.label ?? '')
              .join(' · ')}
          </Text>
        </View>
      )}
    </ScrollView>
  );

  const renderReflexes = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.sectionContent, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionSubtitle}>
        Ce que tu fais quand tu satures — et ce que ça cherche à soulager.
      </Text>
      {REFLEXES.map(reflex => {
        const isOpen = openReflex === reflex.key;
        const explored = reflexes.includes(reflex.key);
        return (
          <View key={reflex.key} style={styles.accordionBlock}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => {
                setOpenReflex(isOpen ? null : reflex.key);
                markReflexExplored(reflex.key);
              }}
            >
              <Text style={styles.accordionLabel}>{reflex.title}</Text>
              <View style={styles.accordionHeaderRight}>
                {explored && (
                  <View style={styles.exploredBadge}>
                    <Text style={styles.exploredBadgeText}>exploré</Text>
                  </View>
                )}
                <Text style={[styles.chevron, isOpen && styles.chevronOpen]}>›</Text>
              </View>
            </TouchableOpacity>
            {isOpen && (
              <View style={styles.reflexBody}>
                <View style={styles.reflexBlock}>
                  <Text style={styles.reflexBlockLabelNeutral}>
                    CE QUE ÇA CHERCHE À SOULAGER
                  </Text>
                  <Text style={styles.reflexBlockText}>{reflex.cherche}</Text>
                </View>
                <View style={styles.reflexBlock}>
                  <Text style={styles.reflexBlockLabelWarning}>
                    POURQUOI ÇA PEUT AGGRAVER
                  </Text>
                  <Text style={styles.reflexBlockText}>{reflex.aggrave}</Text>
                </View>
                <View style={styles.reflexBlock}>
                  <Text style={styles.reflexBlockLabelPrimary}>ALTERNATIVE DOUCE</Text>
                  <Text style={[styles.reflexBlockText, { color: C.primary }]}>
                    {reflex.alternative}
                  </Text>
                </View>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );

  const renderPlan = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.sectionContent, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.sectionSubtitle}>
        Ce que tu as appris sur toi, en un seul endroit.
      </Text>

      <View style={styles.planBlock}>
        <Text style={styles.planBlockTitle}>Mes signaux précoces les plus fréquents</Text>
        {signals.length > 0 ? (
          <View style={styles.chipsRow}>
            {signals.map(k => {
              const label = SIGNAL_CATEGORIES.flatMap(c => c.signals).find(s => s.key === k)?.label;
              if (!label) return null;
              return (
                <View key={k} style={styles.planChip}>
                  <Text style={styles.planChipText}>{label}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Complète la section Signaux pour voir tes signaux ici
            </Text>
            <TouchableOpacity onPress={() => setView('signals')}>
              <Text style={styles.emptyStateLink}>Y aller</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.planBlock}>
        <Text style={styles.planBlockTitle}>Mes déclencheurs fréquents</Text>
        {triggers.length > 0 ? (
          <View style={styles.chipsRow}>
            {triggers.map(k => {
              const label = TRIGGERS.find(t => t.key === k)?.label;
              if (!label) return null;
              return (
                <View key={k} style={styles.planChip}>
                  <Text style={styles.planChipText}>{label}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Complète la section Déclencheurs pour voir tes déclencheurs ici
            </Text>
            <TouchableOpacity onPress={() => setView('triggers')}>
              <Text style={styles.emptyStateLink}>Y aller</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.planBlock}>
        <Text style={styles.planBlockTitle}>Mon premier geste quand je commence à saturer</Text>
        <TextInput
          style={styles.planTextInput}
          multiline
          placeholder="Ex : couper les notifications et changer de pièce."
          placeholderTextColor={C.textSub}
          value={firstAction}
          onChangeText={setFirstAction}
          onBlur={() => AsyncStorage.setItem(STORAGE_KEYS.firstAction, firstAction)}
        />
      </View>

      <View style={styles.planBlock}>
        <Text style={styles.planBlockTitle}>Ma phrase</Text>
        <TextInput
          style={[styles.planTextInput, { minHeight: undefined }]}
          placeholder="Ex : Je n'ai pas besoin de régler ma vie maintenant."
          placeholderTextColor={C.textSub}
          value={phrase}
          onChangeText={setPhrase}
          onBlur={() => AsyncStorage.setItem(STORAGE_KEYS.phrase, phrase)}
        />
        <Text style={styles.suggestionsLabel}>Suggestions :</Text>
        {SUGGESTED_PHRASES.map((p, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.suggestionRow,
              i < SUGGESTED_PHRASES.length - 1 && styles.suggestionRowBorder,
            ]}
            onPress={() => {
              setPhrase(p);
              AsyncStorage.setItem(STORAGE_KEYS.phrase, p);
            }}
          >
            <Text style={styles.suggestionText}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.ficheBlock}>
        <Text style={styles.ficheTitle}>Ma fiche</Text>
        <View style={styles.progressBarRow}>
          <Text style={styles.progressBarLabel}>{planProgress}% prêt</Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${planProgress}%` }]} />
        </View>

        {planProgress === 0 ? (
          <Text style={styles.ficheEmpty}>
            Complète les sections pour que ta fiche apparaisse ici.
          </Text>
        ) : (
          <>
            {signals.length > 0 && (
              <View style={styles.ficheSectionBlock}>
                <Text style={styles.ficheSectionLabel}>SIGNAUX</Text>
                <View style={styles.chipsRow}>
                  {signals.map(k => {
                    const label = SIGNAL_CATEGORIES.flatMap(c => c.signals).find(s => s.key === k)?.label;
                    if (!label) return null;
                    return (
                      <View key={k} style={styles.planChip}>
                        <Text style={styles.planChipText}>{label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
            {triggers.length > 0 && (
              <View style={styles.ficheSectionBlock}>
                <Text style={styles.ficheSectionLabel}>DÉCLENCHEURS</Text>
                <View style={styles.chipsRow}>
                  {triggers.map(k => {
                    const label = TRIGGERS.find(t => t.key === k)?.label;
                    if (!label) return null;
                    return (
                      <View key={k} style={styles.planChip}>
                        <Text style={styles.planChipText}>{label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
            {firstAction.trim() ? (
              <View style={styles.ficheSectionBlock}>
                <Text style={styles.ficheSectionLabel}>PREMIER GESTE</Text>
                <Text style={styles.ficheSectionValue}>{firstAction}</Text>
              </View>
            ) : null}
            {phrase.trim() ? (
              <View style={styles.ficheSectionBlock}>
                <Text style={styles.ficheSectionLabel}>MA PHRASE</Text>
                <Text style={styles.ficheSectionValueItalic}>{phrase}</Text>
              </View>
            ) : null}
          </>
        )}
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      {view === 'hub' ? (
        renderHub()
      ) : (
        <View style={{ flex: 1 }}>
          {renderSubPageHeader()}
          {renderNavBar()}
          {view === 'info' && renderInfo()}
          {view === 'signals' && renderSignals()}
          {view === 'triggers' && renderTriggers()}
          {view === 'reflexes' && renderReflexes()}
          {view === 'plan' && renderPlan()}
        </View>
      )}
    </SafeAreaView>
  );
}

type HubCardProps = {
  icon: React.ReactNode;
  title: string;
  desc: string;
  tags: string[];
  progress: string;
  onPress: () => void;
};

function HubCard({ icon, title, desc, tags, progress, onPress }: HubCardProps) {
  return (
    <TouchableOpacity style={styles.hubCard} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.hubCardTop}>
        <View style={styles.hubCardIconWrap}>{icon}</View>
        <View style={styles.hubCardBody}>
          <Text style={styles.hubCardTitle}>{title}</Text>
          <Text style={styles.hubCardDesc}>{desc}</Text>
          <View style={styles.hubCardTagRow}>
            {tags.map(tag => (
              <View key={tag} style={styles.hubCardTag}>
                <Text style={styles.hubCardTagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      <View style={styles.hubCardFooter}>
        <Text style={styles.hubCardProgress}>{progress}</Text>
        <Text style={styles.hubCardChevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Hub
  hubContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  hubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  hubTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
    textAlign: 'center',
    flex: 1,
  },
  urgencyBlock: {
    backgroundColor: C.primaryLight,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  urgencyQ: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    marginBottom: 12,
  },
  urgencyBtn: {
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  urgencyBtnText: {
    color: C.surface,
    fontWeight: '700',
    fontSize: 15,
  },
  hubCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.border,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#7C6CF2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  hubCardTop: {
    flexDirection: 'row',
    gap: 12,
  },
  hubCardIconWrap: {
    marginTop: 2,
  },
  hubCardBody: {
    flex: 1,
  },
  hubCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
    marginBottom: 4,
  },
  hubCardDesc: {
    fontSize: 14,
    color: C.textSub,
    lineHeight: 20,
    marginBottom: 8,
  },
  hubCardTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  hubCardTag: {
    backgroundColor: C.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  hubCardTagText: {
    fontSize: 11,
    color: C.primary,
  },
  hubCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 10,
    gap: 4,
  },
  hubCardProgress: {
    fontSize: 12,
    color: C.textSub,
  },
  hubCardChevron: {
    fontSize: 16,
    color: C.textSub,
  },
  // Back / header
  backBtn: {
    minWidth: 60,
  },
  backText: {
    fontSize: 14,
    color: C.primary,
    fontWeight: '600',
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    textAlign: 'center',
    flex: 1,
  },
  // NavBar
  navBar: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.surface,
    maxHeight: 48,
  },
  navBarContent: {
    paddingHorizontal: 8,
  },
  navTab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  navTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: C.primary,
  },
  navTabText: {
    fontSize: 14,
    color: C.textSub,
  },
  navTabTextActive: {
    color: C.primary,
    fontWeight: '700',
  },
  // Section shared
  sectionContent: {
    padding: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: C.textSub,
    marginBottom: 16,
    lineHeight: 20,
  },
  sectionReadBadge: {
    fontSize: 13,
    color: C.green,
    fontWeight: '600',
    marginBottom: 12,
  },
  // Info cards
  infoCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 12,
  },
  infoQuestion: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  infoAnswer: {
    fontSize: 14,
    color: C.textSub,
    lineHeight: 22,
    marginTop: 8,
  },
  // Accordion shared
  accordionBlock: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  accordionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    flex: 1,
  },
  accordionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chevron: {
    fontSize: 18,
    color: C.textSub,
    fontWeight: '600',
  },
  chevronOpen: {
    transform: [{ rotate: '90deg' }],
  },
  accordionBody: {
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  // Signals
  catBadge: {
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  catBadgeText: {
    fontSize: 11,
    color: C.surface,
    fontWeight: '700',
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  signalRowChecked: {
    backgroundColor: C.primaryLight,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  signalLabel: {
    fontSize: 14,
    color: C.text,
    flex: 1,
  },
  signalLabelChecked: {
    color: C.primary,
    fontWeight: '600',
  },
  signalsTotal: {
    fontSize: 13,
    color: C.textSub,
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  // Triggers
  triggersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  triggerChip: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: C.surface,
  },
  triggerChipSelected: {
    backgroundColor: C.primaryLight,
    borderColor: C.primary,
  },
  triggerChipText: {
    fontSize: 14,
    color: C.textSub,
  },
  triggerChipTextSelected: {
    color: C.primary,
    fontWeight: '700',
  },
  triggerComboBlock: {
    backgroundColor: C.primaryLight,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  triggerComboLabel: {
    fontSize: 13,
    color: C.textSub,
    fontWeight: '700',
    marginBottom: 4,
  },
  triggerComboValue: {
    fontSize: 14,
    color: C.primary,
  },
  // Reflexes
  exploredBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  exploredBadgeText: {
    fontSize: 11,
    color: C.green,
    fontWeight: '600',
  },
  reflexBody: {
    backgroundColor: C.expandBg,
    padding: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  reflexBlock: {
    gap: 4,
  },
  reflexBlockLabelNeutral: {
    fontSize: 11,
    color: C.textSub,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  reflexBlockLabelWarning: {
    fontSize: 11,
    color: C.warning,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  reflexBlockLabelPrimary: {
    fontSize: 11,
    color: C.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  reflexBlockText: {
    fontSize: 14,
    color: C.text,
    lineHeight: 20,
  },
  // Plan
  planBlock: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 14,
  },
  planBlockTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  planChip: {
    backgroundColor: C.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  planChipText: {
    fontSize: 13,
    color: C.primary,
  },
  emptyState: {
    gap: 6,
  },
  emptyStateText: {
    fontSize: 14,
    color: C.textSub,
    fontStyle: 'italic',
  },
  emptyStateLink: {
    fontSize: 14,
    color: C.primary,
    fontWeight: '600',
  },
  planTextInput: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: C.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  suggestionsLabel: {
    fontSize: 12,
    color: C.textSub,
    marginTop: 12,
    marginBottom: 4,
  },
  suggestionRow: {
    paddingVertical: 10,
  },
  suggestionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  suggestionText: {
    fontSize: 14,
    color: C.text,
  },
  // Fiche
  ficheBlock: {
    backgroundColor: C.primaryLight,
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  ficheTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.primary,
    marginBottom: 12,
  },
  progressBarRow: {
    marginBottom: 6,
  },
  progressBarLabel: {
    fontSize: 13,
    color: C.textSub,
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: C.surface,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: C.primary,
  },
  ficheEmpty: {
    fontSize: 14,
    color: C.textSub,
    fontStyle: 'italic',
  },
  ficheSectionBlock: {
    marginBottom: 12,
  },
  ficheSectionLabel: {
    fontSize: 12,
    color: C.textSub,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  ficheSectionValue: {
    fontSize: 14,
    color: C.text,
    lineHeight: 20,
  },
  ficheSectionValueItalic: {
    fontSize: 14,
    color: C.text,
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
