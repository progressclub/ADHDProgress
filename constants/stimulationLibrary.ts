// ─── Types ─────────────────────────────────────────────────────────────────────

export type StimCategory = 'mouvement' | 'sensation' | 'nouveaute' | 'connexion' | 'defi' | 'tache';
export type StimFormat = 'etincelle' | 'impulsion' | 'immersion'; // <2min | 5-15min | 20min+
export type StimExitCost = 'facile' | 'absorbant' | 'limite_requise';
export type StimConstraint =
  | 'silencieux'
  | 'assis'
  | 'dehors'
  | 'avec_gens'
  | 'sans_argent'
  | 'moins_5min'
  | 'reste_sur_tache';
export type StimChannel = 'son' | 'gout' | 'toucher' | 'vision' | 'mouvement';

export type StimActivity = {
  id: string;
  label: string;
  category: StimCategory;
  format: StimFormat;
  exitCost: StimExitCost;
  intensity: 1 | 2 | 3;
  channel?: StimChannel;
  subtype?: string;
  blockedBy: StimConstraint[];
};

// ─── Bibliothèque ──────────────────────────────────────────────────────────────

export const STIM_LIBRARY: StimActivity[] = [
  // ── Mouvement / micro ─────────────────────────────────────────────────────
  { id: 'mv_secouer_bras',       label: 'Secouer les bras',                   category: 'mouvement', subtype: 'micro',       format: 'etincelle', exitCost: 'facile', intensity: 2, blockedBy: [] },
  { id: 'mv_lever_rasseoir',     label: 'Me lever puis me rasseoir',          category: 'mouvement', subtype: 'micro',       format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: ['assis'] },
  { id: 'mv_pas_rapides',        label: 'Faire quelques pas rapides',         category: 'mouvement', subtype: 'micro',       format: 'etincelle', exitCost: 'facile', intensity: 2, blockedBy: ['assis'] },
  { id: 'mv_pousser_mur',        label: 'Pousser contre un mur',              category: 'mouvement', subtype: 'micro',       format: 'etincelle', exitCost: 'facile', intensity: 2, blockedBy: ['assis'] },
  { id: 'mv_monter_escalier',    label: 'Monter un escalier',                 category: 'mouvement', subtype: 'micro',       format: 'etincelle', exitCost: 'facile', intensity: 3, blockedBy: ['assis', 'reste_sur_tache'] },
  { id: 'mv_lancer_objet',       label: 'Lancer et rattraper un objet souple', category: 'mouvement', subtype: 'micro',      format: 'etincelle', exitCost: 'facile', intensity: 2, blockedBy: ['reste_sur_tache'] },

  // ── Mouvement / chanson ───────────────────────────────────────────────────
  { id: 'mv_danser_chanson',     label: 'Danser sur une chanson entière',      category: 'mouvement', subtype: 'chanson', format: 'impulsion', exitCost: 'facile', intensity: 3, blockedBy: ['silencieux', 'assis', 'reste_sur_tache'] },
  { id: 'mv_ranger_chanson',     label: 'Ranger debout pendant une chanson',   category: 'mouvement', subtype: 'chanson', format: 'impulsion', exitCost: 'facile', intensity: 2, blockedBy: ['silencieux', 'assis', 'reste_sur_tache'] },
  { id: 'mv_marcher_chanson',    label: 'Marcher pendant une chanson',         category: 'mouvement', subtype: 'chanson', format: 'impulsion', exitCost: 'facile', intensity: 2, blockedBy: ['silencieux', 'assis', 'reste_sur_tache'] },
  { id: 'mv_chanter_haute',      label: 'Chanter à voix haute',                category: 'mouvement', subtype: 'chanson', format: 'etincelle', exitCost: 'facile', intensity: 3, blockedBy: ['silencieux', 'avec_gens'] },
  { id: 'mv_mouvements_libres',  label: 'Faire des mouvements libres sur un morceau', category: 'mouvement', subtype: 'chanson', format: 'impulsion', exitCost: 'facile', intensity: 3, blockedBy: ['silencieux', 'assis', 'avec_gens', 'reste_sur_tache'] },

  // ── Mouvement / destination ───────────────────────────────────────────────
  { id: 'mv_boulangerie',        label: "Marcher jusqu'à une boulangerie",     category: 'mouvement', subtype: 'destination', format: 'immersion', exitCost: 'limite_requise', intensity: 3, blockedBy: ['assis', 'moins_5min', 'reste_sur_tache', 'sans_argent'] },
  { id: 'mv_photo_dehors',       label: 'Aller photographier quelque chose dehors', category: 'mouvement', subtype: 'destination', format: 'impulsion', exitCost: 'facile', intensity: 2, blockedBy: ['assis', 'moins_5min', 'reste_sur_tache'] },
  { id: 'mv_tour_batiment',      label: "Faire le tour d'un bâtiment",         category: 'mouvement', subtype: 'destination', format: 'impulsion', exitCost: 'facile', intensity: 2, blockedBy: ['assis', 'moins_5min', 'reste_sur_tache'] },
  { id: 'mv_rue_nouvelle',       label: 'Aller voir une rue jamais empruntée', category: 'mouvement', subtype: 'destination', format: 'immersion', exitCost: 'facile', intensity: 2, blockedBy: ['assis', 'moins_5min', 'reste_sur_tache'] },
  { id: 'mv_detail_archi',       label: 'Chercher un détail architectural',    category: 'mouvement', subtype: 'destination', format: 'impulsion', exitCost: 'facile', intensity: 1, blockedBy: ['assis', 'reste_sur_tache'] },
  { id: 'mv_deposer_objet',      label: 'Déposer un objet quelque part',       category: 'mouvement', subtype: 'destination', format: 'impulsion', exitCost: 'facile', intensity: 2, blockedBy: ['assis', 'reste_sur_tache'] },

  // ── Mouvement / réactif ───────────────────────────────────────────────────
  { id: 'mv_balle_mur',          label: 'Lancer une balle contre un mur',      category: 'mouvement', subtype: 'reactif', format: 'impulsion', exitCost: 'facile',    intensity: 2, blockedBy: ['silencieux', 'assis', 'reste_sur_tache'] },
  { id: 'mv_choregraphie',       label: 'Reproduire une courte chorégraphie',  category: 'mouvement', subtype: 'reactif', format: 'impulsion', exitCost: 'facile',    intensity: 3, blockedBy: ['assis', 'avec_gens', 'reste_sur_tache'] },
  { id: 'mv_jeu_reaction',       label: 'Jouer à un jeu de réaction',          category: 'mouvement', subtype: 'reactif', format: 'impulsion', exitCost: 'absorbant', intensity: 2, blockedBy: ['reste_sur_tache'] },
  { id: 'mv_dribbler',           label: 'Dribbler',                            category: 'mouvement', subtype: 'reactif', format: 'impulsion', exitCost: 'facile',    intensity: 2, blockedBy: ['silencieux', 'assis', 'reste_sur_tache'] },
  { id: 'mv_enchainement',       label: 'Apprendre un enchaînement de mouvements', category: 'mouvement', subtype: 'reactif', format: 'immersion', exitCost: 'absorbant', intensity: 3, blockedBy: ['assis', 'moins_5min', 'reste_sur_tache'] },

  // ── Mouvement / contexte ──────────────────────────────────────────────────
  { id: 'mv_autre_piece',        label: 'Passer dans une autre pièce',         category: 'mouvement', subtype: 'contexte', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: ['reste_sur_tache'] },
  { id: 'mv_ouvrir_fenetre',     label: 'Ouvrir la fenêtre',                   category: 'mouvement', subtype: 'contexte', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: ['dehors'] },
  { id: 'mv_installer_sol',      label: "M'installer au sol",                  category: 'mouvement', subtype: 'contexte', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: [] },
  { id: 'mv_travailler_entree',  label: "Travailler depuis l'entrée",          category: 'mouvement', subtype: 'contexte', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: ['dehors'] },
  { id: 'mv_sortir_2min',        label: 'Sortir deux minutes',                 category: 'mouvement', subtype: 'contexte', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: ['reste_sur_tache'] },
  { id: 'mv_lieu_mouvement',     label: 'Aller dans un lieu où il y a du mouvement', category: 'mouvement', subtype: 'contexte', format: 'impulsion', exitCost: 'facile', intensity: 2, blockedBy: ['assis', 'moins_5min', 'reste_sur_tache'] },

  // ── Sensation / son ───────────────────────────────────────────────────────
  { id: 'sn_son_energique',      label: 'Musique énergique',                   category: 'sensation', channel: 'son', format: 'impulsion', exitCost: 'facile',    intensity: 3, blockedBy: ['silencieux'] },
  { id: 'sn_son_familiere',      label: 'Chanson familière',                   category: 'sensation', channel: 'son', format: 'impulsion', exitCost: 'facile',    intensity: 2, blockedBy: ['silencieux'] },
  { id: 'sn_son_instrumental',   label: 'Morceau instrumental',                category: 'sensation', channel: 'son', format: 'impulsion', exitCost: 'facile',    intensity: 1, blockedBy: ['silencieux'] },
  { id: 'sn_son_rythme',         label: 'Rythme répétitif',                    category: 'sensation', channel: 'son', format: 'impulsion', exitCost: 'facile',    intensity: 1, blockedBy: ['silencieux'] },
  { id: 'sn_son_ambiance',       label: "Bruit de café ou d'ambiance",         category: 'sensation', channel: 'son', format: 'impulsion', exitCost: 'facile',    intensity: 1, blockedBy: ['silencieux'] },
  { id: 'sn_son_podcast',        label: 'Podcast',                             category: 'sensation', channel: 'son', format: 'immersion', exitCost: 'absorbant', intensity: 1, blockedBy: ['silencieux'] },
  { id: 'sn_son_chanter',        label: 'Chanter moi-même',                    category: 'sensation', channel: 'son', format: 'etincelle', exitCost: 'facile',    intensity: 3, blockedBy: ['silencieux', 'avec_gens'] },
  { id: 'sn_son_instrument',     label: "Jouer d'un instrument",               category: 'sensation', channel: 'son', format: 'impulsion', exitCost: 'absorbant', intensity: 3, blockedBy: ['silencieux', 'avec_gens', 'moins_5min'] },

  // ── Sensation / toucher ───────────────────────────────────────────────────
  { id: 'sn_to_bague',           label: 'Bague ou objet à tourner',            category: 'sensation', channel: 'toucher', format: 'etincelle', exitCost: 'facile',    intensity: 1, blockedBy: [] },
  { id: 'sn_to_pate',            label: 'Pâte ou objet souple',                category: 'sensation', channel: 'toucher', format: 'etincelle', exitCost: 'facile',    intensity: 1, blockedBy: [] },
  { id: 'sn_to_tissu',           label: 'Tissu texturé',                       category: 'sensation', channel: 'toucher', format: 'etincelle', exitCost: 'facile',    intensity: 1, blockedBy: [] },
  { id: 'sn_to_elastique',       label: 'Élastique',                           category: 'sensation', channel: 'toucher', format: 'etincelle', exitCost: 'facile',    intensity: 1, blockedBy: [] },
  { id: 'sn_to_pierre',          label: 'Pierre lisse',                        category: 'sensation', channel: 'toucher', format: 'etincelle', exitCost: 'facile',    intensity: 1, blockedBy: [] },
  { id: 'sn_to_stylo',           label: 'Stylo à manipuler',                   category: 'sensation', channel: 'toucher', format: 'etincelle', exitCost: 'facile',    intensity: 1, blockedBy: [] },
  { id: 'sn_to_gribouiller',     label: 'Gribouiller',                         category: 'sensation', channel: 'toucher', format: 'etincelle', exitCost: 'facile',    intensity: 1, blockedBy: [] },
  { id: 'sn_to_repetitif',       label: 'Geste répétitif (tricot, pliage)',    category: 'sensation', channel: 'toucher', format: 'impulsion', exitCost: 'absorbant', intensity: 2, blockedBy: [] },

  // ── Sensation / goût ──────────────────────────────────────────────────────
  { id: 'sn_gt_fraiche',         label: 'Boisson fraîche',                     category: 'sensation', channel: 'gout', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: [] },
  { id: 'sn_gt_gum',             label: 'Chewing-gum',                         category: 'sensation', channel: 'gout', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: [] },
  { id: 'sn_gt_croquant',        label: 'Aliment croquant',                    category: 'sensation', channel: 'gout', format: 'etincelle', exitCost: 'facile', intensity: 2, blockedBy: [] },
  { id: 'sn_gt_acide',           label: "Quelque chose d'acide",               category: 'sensation', channel: 'gout', format: 'etincelle', exitCost: 'facile', intensity: 2, blockedBy: [] },
  { id: 'sn_gt_menthe',          label: 'Menthe',                              category: 'sensation', channel: 'gout', format: 'etincelle', exitCost: 'facile', intensity: 2, blockedBy: [] },
  { id: 'sn_gt_petillante',      label: 'Eau pétillante',                      category: 'sensation', channel: 'gout', format: 'etincelle', exitCost: 'facile', intensity: 2, blockedBy: [] },
  { id: 'sn_gt_chaude',          label: 'Boisson chaude',                      category: 'sensation', channel: 'gout', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: [] },
  { id: 'sn_gt_collation',       label: "Collation si je n'ai pas mangé",      category: 'sensation', channel: 'gout', format: 'etincelle', exitCost: 'facile', intensity: 2, blockedBy: [] },

  // ── Sensation / vision ────────────────────────────────────────────────────
  { id: 'sn_vi_luminosite',      label: 'Changer la luminosité',                        category: 'sensation', channel: 'vision', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: [] },
  { id: 'sn_vi_rideaux',         label: 'Ouvrir les rideaux',                           category: 'sensation', channel: 'vision', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: ['dehors'] },
  { id: 'sn_vi_objet',           label: 'Déplacer un objet devant moi',                 category: 'sensation', channel: 'vision', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: [] },
  { id: 'sn_vi_fenetre',         label: "M'installer devant une fenêtre",               category: 'sensation', channel: 'vision', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: ['dehors'] },
  { id: 'sn_vi_fond',            label: 'Changer de fond ou de support',                category: 'sensation', channel: 'vision', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: [] },
  { id: 'sn_vi_couleur',         label: 'Mettre un élément coloré dans mon champ de vision', category: 'sensation', channel: 'vision', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: [] },
  { id: 'sn_vi_cacher',          label: 'Cacher ce qui est visuellement répétitif',     category: 'sensation', channel: 'vision', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: [] },

  // ── Nouveauté / micro_aventure ────────────────────────────────────────────
  { id: 'nv_ma_rue_diff',        label: 'Prendre une rue différente',                 category: 'nouveaute', subtype: 'micro_aventure', format: 'impulsion', exitCost: 'facile', intensity: 2, blockedBy: ['assis', 'moins_5min', 'reste_sur_tache'] },
  { id: 'nv_ma_couleur_3',       label: "Chercher trois objets d'une même couleur",   category: 'nouveaute', subtype: 'micro_aventure', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: ['reste_sur_tache'] },
  { id: 'nv_ma_photo_detail',    label: 'Photographier un détail inhabituel',         category: 'nouveaute', subtype: 'micro_aventure', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: [] },
  { id: 'nv_ma_lieu_jamais',     label: 'Entrer dans un lieu où je ne suis jamais allé', category: 'nouveaute', subtype: 'micro_aventure', format: 'impulsion', exitCost: 'facile', intensity: 3, blockedBy: ['assis', 'moins_5min', 'reste_sur_tache'] },
  { id: 'nv_ma_boisson_diff',    label: 'Tester une boisson différente',              category: 'nouveaute', subtype: 'micro_aventure', format: 'etincelle', exitCost: 'facile', intensity: 2, blockedBy: ['sans_argent'] },
  { id: 'nv_ma_trajet_ordre',    label: "Changer l'ordre de mon trajet habituel",     category: 'nouveaute', subtype: 'micro_aventure', format: 'impulsion', exitCost: 'facile', intensity: 2, blockedBy: ['assis', 'moins_5min'] },
  { id: 'nv_ma_artiste',         label: 'Écouter un artiste inconnu',                 category: 'nouveaute', subtype: 'micro_aventure', format: 'impulsion', exitCost: 'facile', intensity: 1, blockedBy: ['silencieux'] },
  { id: 'nv_ma_rayon',           label: 'Visiter un rayon que je ne regarde jamais',  category: 'nouveaute', subtype: 'micro_aventure', format: 'impulsion', exitCost: 'facile', intensity: 2, blockedBy: ['assis', 'moins_5min'] },

  // ── Nouveauté / apprentissage ─────────────────────────────────────────────
  { id: 'nv_ap_noeud',           label: 'Apprendre un nœud',                          category: 'nouveaute', subtype: 'apprentissage', format: 'impulsion', exitCost: 'facile',    intensity: 2, blockedBy: ['reste_sur_tache'] },
  { id: 'nv_ap_langue',          label: 'Mémoriser trois mots dans une autre langue', category: 'nouveaute', subtype: 'apprentissage', format: 'impulsion', exitCost: 'facile',    intensity: 1, blockedBy: ['reste_sur_tache'] },
  { id: 'nv_ap_dessin',          label: 'Reproduire un dessin',                       category: 'nouveaute', subtype: 'apprentissage', format: 'impulsion', exitCost: 'absorbant', intensity: 2, blockedBy: ['reste_sur_tache'] },
  { id: 'nv_ap_mouvement',       label: 'Apprendre un mouvement',                     category: 'nouveaute', subtype: 'apprentissage', format: 'impulsion', exitCost: 'facile',    intensity: 2, blockedBy: ['assis', 'reste_sur_tache'] },
  { id: 'nv_ap_enigme',          label: 'Résoudre une énigme',                        category: 'nouveaute', subtype: 'apprentissage', format: 'impulsion', exitCost: 'absorbant', intensity: 2, blockedBy: ['reste_sur_tache'] },
  { id: 'nv_ap_plante',          label: 'Identifier une plante',                      category: 'nouveaute', subtype: 'apprentissage', format: 'impulsion', exitCost: 'facile',    intensity: 1, blockedBy: ['reste_sur_tache'] },
  { id: 'nv_ap_objet',           label: 'Comprendre comment fonctionne un objet',     category: 'nouveaute', subtype: 'apprentissage', format: 'impulsion', exitCost: 'absorbant', intensity: 2, blockedBy: ['reste_sur_tache'] },
  { id: 'nv_ap_musique',         label: 'Apprendre une courte phrase musicale',       category: 'nouveaute', subtype: 'apprentissage', format: 'impulsion', exitCost: 'facile',    intensity: 2, blockedBy: ['silencieux', 'reste_sur_tache'] },

  // ── Nouveauté / sans_engagement ───────────────────────────────────────────
  { id: 'nv_se_demo',            label: 'Regarder une démonstration',                 category: 'nouveaute', subtype: 'sans_engagement', format: 'impulsion', exitCost: 'facile',    intensity: 1, blockedBy: ['reste_sur_tache'] },
  { id: 'nv_se_5min',            label: 'Tester cinq minutes seulement',              category: 'nouveaute', subtype: 'sans_engagement', format: 'impulsion', exitCost: 'facile',    intensity: 2, blockedBy: ['moins_5min', 'reste_sur_tache'] },
  { id: 'nv_se_possede',         label: 'Utiliser ce que je possède déjà',            category: 'nouveaute', subtype: 'sans_engagement', format: 'etincelle', exitCost: 'facile',    intensity: 1, blockedBy: [] },
  { id: 'nv_se_enregistrer',     label: "Enregistrer l'idée pour plus tard",          category: 'nouveaute', subtype: 'sans_engagement', format: 'etincelle', exitCost: 'facile',    intensity: 1, blockedBy: [] },
  { id: 'nv_se_emprunter',       label: "Emprunter au lieu d'acheter",                category: 'nouveaute', subtype: 'sans_engagement', format: 'immersion', exitCost: 'facile',    intensity: 1, blockedBy: ['moins_5min'] },
  { id: 'nv_se_miniature',       label: 'Créer une version miniature',                category: 'nouveaute', subtype: 'sans_engagement', format: 'impulsion', exitCost: 'absorbant', intensity: 2, blockedBy: ['moins_5min'] },

  // ── Connexion / minimal ───────────────────────────────────────────────────
  { id: 'cn_mi_vocal',           label: 'Envoyer un vocal',                           category: 'connexion', subtype: 'minimal', format: 'etincelle', exitCost: 'facile',          intensity: 1, blockedBy: [] },
  { id: 'cn_mi_appel5',          label: 'Appeler cinq minutes',                       category: 'connexion', subtype: 'minimal', format: 'impulsion', exitCost: 'facile',          intensity: 2, blockedBy: ['silencieux'] },
  { id: 'cn_mi_piece_occupee',   label: 'Travailler dans une pièce occupée',          category: 'connexion', subtype: 'minimal', format: 'immersion', exitCost: 'facile',          intensity: 1, blockedBy: [] },
  { id: 'cn_mi_acheter',         label: 'Aller acheter quelque chose en personne',    category: 'connexion', subtype: 'minimal', format: 'immersion', exitCost: 'limite_requise',  intensity: 2, blockedBy: ['assis', 'moins_5min', 'sans_argent'] },
  { id: 'cn_mi_discuter',        label: 'Discuter avec un proche',                    category: 'connexion', subtype: 'minimal', format: 'impulsion', exitCost: 'facile',          intensity: 2, blockedBy: ['silencieux', 'reste_sur_tache'] },
  { id: 'cn_mi_photo',           label: 'Envoyer une photo',                          category: 'connexion', subtype: 'minimal', format: 'etincelle', exitCost: 'facile',          intensity: 1, blockedBy: [] },
  { id: 'cn_mi_cafe',            label: "M'installer dans un café",                   category: 'connexion', subtype: 'minimal', format: 'immersion', exitCost: 'limite_requise',  intensity: 2, blockedBy: ['assis', 'moins_5min', 'sans_argent'] },
  { id: 'cn_mi_animal',          label: 'Jouer avec un animal',                       category: 'connexion', subtype: 'minimal', format: 'impulsion', exitCost: 'facile',          intensity: 2, blockedBy: ['reste_sur_tache'] },

  // ── Connexion / positif ───────────────────────────────────────────────────
  { id: 'cn_po_message_gentil',  label: 'Envoyer un message gentil',                  category: 'connexion', subtype: 'positif', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: [] },
  { id: 'cn_po_aider',           label: 'Aider quelqu\'un sur une petite tâche',      category: 'connexion', subtype: 'positif', format: 'impulsion', exitCost: 'facile', intensity: 2, blockedBy: ['reste_sur_tache'] },
  { id: 'cn_po_repondre',        label: 'Répondre utilement à une question',          category: 'connexion', subtype: 'positif', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: [] },
  { id: 'cn_po_animal',          label: 'Jouer avec un animal',                       category: 'connexion', subtype: 'positif', format: 'impulsion', exitCost: 'facile', intensity: 2, blockedBy: ['reste_sur_tache'] },
  { id: 'cn_po_arroser',         label: 'Arroser une plante',                         category: 'connexion', subtype: 'positif', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: ['assis'] },
  { id: 'cn_po_deposer',         label: 'Déposer un objet pour quelqu\'un',           category: 'connexion', subtype: 'positif', format: 'impulsion', exitCost: 'facile', intensity: 2, blockedBy: ['assis', 'reste_sur_tache'] },

  // ── Connexion / partage ───────────────────────────────────────────────────
  { id: 'cn_pa_ranger_chanson',  label: 'Chacun range pendant une chanson',           category: 'connexion', subtype: 'partage', format: 'impulsion', exitCost: 'facile',    intensity: 2, blockedBy: ['silencieux', 'assis', 'reste_sur_tache'] },
  { id: 'cn_pa_photo_5min',      label: 'Chacun envoie une photo après cinq minutes', category: 'connexion', subtype: 'partage', format: 'impulsion', exitCost: 'facile',    intensity: 1, blockedBy: ['moins_5min'] },
  { id: 'cn_pa_mission',         label: "Chacun choisit une mini-mission pour l'autre", category: 'connexion', subtype: 'partage', format: 'impulsion', exitCost: 'facile',  intensity: 2, blockedBy: ['moins_5min'] },
  { id: 'cn_pa_appel_marche',    label: 'Appeler pendant une marche',                 category: 'connexion', subtype: 'partage', format: 'immersion', exitCost: 'facile',    intensity: 2, blockedBy: ['silencieux', 'assis', 'moins_5min'] },
  { id: 'cn_pa_recette',         label: 'Essayer une recette chacun de son côté',     category: 'connexion', subtype: 'partage', format: 'immersion', exitCost: 'absorbant', intensity: 2, blockedBy: ['moins_5min', 'sans_argent'] },
  { id: 'cn_pa_apprendre',       label: 'Apprendre la même chose à distance',         category: 'connexion', subtype: 'partage', format: 'immersion', exitCost: 'absorbant', intensity: 2, blockedBy: ['moins_5min'] },

  // ── Défi ──────────────────────────────────────────────────────────────────
  { id: 'df_enigme',             label: 'Résoudre une énigme',                        category: 'defi', format: 'impulsion', exitCost: 'absorbant', intensity: 2, blockedBy: ['reste_sur_tache'] },
  { id: 'df_chrono',             label: 'Me chronométrer sur une tâche courte',       category: 'defi', format: 'impulsion', exitCost: 'facile',    intensity: 2, blockedBy: [] },
  { id: 'df_record',             label: 'Battre mon propre record',                   category: 'defi', format: 'impulsion', exitCost: 'absorbant', intensity: 3, blockedBy: ['reste_sur_tache'] },
  { id: 'df_technique',          label: 'Apprendre un geste technique',               category: 'defi', format: 'impulsion', exitCost: 'facile',    intensity: 2, blockedBy: ['reste_sur_tache'] },
  { id: 'df_reaction',           label: 'Jeu de réaction',                            category: 'defi', format: 'impulsion', exitCost: 'absorbant', intensity: 2, blockedBy: ['reste_sur_tache'] },
  { id: 'df_logique',            label: 'Mini-jeu de logique',                        category: 'defi', format: 'impulsion', exitCost: 'absorbant', intensity: 2, blockedBy: ['reste_sur_tache'] },
  { id: 'df_difficile',          label: 'Reproduire quelque chose de difficile',      category: 'defi', format: 'immersion', exitCost: 'absorbant', intensity: 3, blockedBy: ['reste_sur_tache', 'moins_5min'] },

  // ── Tâche / side ──────────────────────────────────────────────────────────
  { id: 'tc_si_podcast_vaisselle', label: 'Podcast pendant la vaisselle',             category: 'tache', subtype: 'side', format: 'immersion', exitCost: 'facile', intensity: 1, blockedBy: ['silencieux'] },
  { id: 'tc_si_musique_rangement', label: 'Musique pendant le rangement',             category: 'tache', subtype: 'side', format: 'immersion', exitCost: 'facile', intensity: 2, blockedBy: ['silencieux'] },
  { id: 'tc_si_gum_lecture',       label: 'Chewing-gum pendant une lecture',          category: 'tache', subtype: 'side', format: 'immersion', exitCost: 'facile', intensity: 1, blockedBy: [] },
  { id: 'tc_si_appel_linge',       label: 'Appel pendant le pliage du linge',         category: 'tache', subtype: 'side', format: 'immersion', exitCost: 'facile', intensity: 2, blockedBy: ['silencieux'] },
  { id: 'tc_si_tactile_reunion',   label: 'Objet tactile pendant une réunion',        category: 'tache', subtype: 'side', format: 'immersion', exitCost: 'facile', intensity: 1, blockedBy: [] },
  { id: 'tc_si_debout',            label: 'Travailler debout',                        category: 'tache', subtype: 'side', format: 'immersion', exitCost: 'facile', intensity: 2, blockedBy: ['assis'] },
  { id: 'tc_si_boisson_admin',     label: "Boisson particulière pendant l'administratif", category: 'tache', subtype: 'side', format: 'immersion', exitCost: 'facile', intensity: 1, blockedBy: [] },

  // ── Tâche / jeu ───────────────────────────────────────────────────────────
  { id: 'tc_je_rebours',         label: 'Ajouter un compte à rebours',                category: 'tache', subtype: 'jeu', format: 'impulsion', exitCost: 'facile', intensity: 2, blockedBy: [] },
  { id: 'tc_je_nombre',          label: "Me fixer un nombre d'éléments à trouver",    category: 'tache', subtype: 'jeu', format: 'impulsion', exitCost: 'facile', intensity: 2, blockedBy: [] },
  { id: 'tc_je_secret',          label: 'Me donner une mission secrète',              category: 'tache', subtype: 'jeu', format: 'impulsion', exitCost: 'facile', intensity: 2, blockedBy: [] },
  { id: 'tc_je_score',           label: 'Tenir un score personnel',                   category: 'tache', subtype: 'jeu', format: 'impulsion', exitCost: 'facile', intensity: 2, blockedBy: [] },
  { id: 'tc_je_chanson',         label: "Objectif avant la fin d'une chanson",        category: 'tache', subtype: 'jeu', format: 'impulsion', exitCost: 'facile', intensity: 2, blockedBy: ['silencieux'] },
  { id: 'tc_je_tirage',          label: "Tirage au sort pour choisir l'ordre",        category: 'tache', subtype: 'jeu', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: [] },

  // ── Tâche / variable ──────────────────────────────────────────────────────
  { id: 'tc_va_lieu',            label: 'Changer de lieu',                            category: 'tache', subtype: 'variable', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: [] },
  { id: 'tc_va_posture',         label: 'Changer de posture',                         category: 'tache', subtype: 'variable', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: [] },
  { id: 'tc_va_outil',           label: "Changer d'outil",                            category: 'tache', subtype: 'variable', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: [] },
  { id: 'tc_va_ordre',           label: "Changer l'ordre des étapes",                 category: 'tache', subtype: 'variable', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: [] },
  { id: 'tc_va_dictee',          label: "Passer de l'écriture à la dictée",           category: 'tache', subtype: 'variable', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: ['silencieux', 'avec_gens'] },
  { id: 'tc_va_papier',          label: "Passer de l'écran au papier",                category: 'tache', subtype: 'variable', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: [] },
  { id: 'tc_va_partie',          label: 'Commencer par une autre partie',             category: 'tache', subtype: 'variable', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: [] },
  { id: 'tc_va_rythme',          label: 'Modifier le rythme',                         category: 'tache', subtype: 'variable', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: [] },

  // ── Tâche / retour ────────────────────────────────────────────────────────
  { id: 'tc_re_compteur',        label: 'Mettre un compteur',                         category: 'tache', subtype: 'retour', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: [] },
  { id: 'tc_re_photo',           label: 'Faire une photo avant/après',                category: 'tache', subtype: 'retour', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: [] },
  { id: 'tc_re_empiler',         label: 'Empiler physiquement ce qui est fait',       category: 'tache', subtype: 'retour', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: [] },
  { id: 'tc_re_chrono',          label: 'Lancer un chronomètre',                      category: 'tache', subtype: 'retour', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: [] },
  { id: 'tc_re_compter',         label: "Compter le nombre d'actions réalisées",      category: 'tache', subtype: 'retour', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: [] },
  { id: 'tc_re_cocher',          label: 'Cocher visiblement chaque étape',            category: 'tache', subtype: 'retour', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: [] },

  // ── Tâche / récompense ────────────────────────────────────────────────────
  { id: 'tc_rc_chanson',         label: 'Une chanson après cinq lignes',              category: 'tache', subtype: 'recompense', format: 'impulsion', exitCost: 'facile', intensity: 2, blockedBy: ['silencieux'] },
  { id: 'tc_rc_sortir',          label: 'Sortir deux minutes après un appel',         category: 'tache', subtype: 'recompense', format: 'impulsion', exitCost: 'facile', intensity: 1, blockedBy: [] },
  { id: 'tc_rc_photo',           label: 'Regarder une photo après dix objets rangés', category: 'tache', subtype: 'recompense', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: [] },
  { id: 'tc_rc_retour',          label: 'Un retour immédiat après chaque segment',    category: 'tache', subtype: 'recompense', format: 'etincelle', exitCost: 'facile', intensity: 1, blockedBy: [] },

  // ── Tâche / alternance ────────────────────────────────────────────────────
  { id: 'tc_al_mecanique',       label: 'Cinq minutes de mécanique puis cinq de réflexion', category: 'tache', subtype: 'alternance', format: 'immersion', exitCost: 'facile', intensity: 2, blockedBy: ['moins_5min'] },
  { id: 'tc_al_deux_taches',     label: 'Alterner deux petites tâches',               category: 'tache', subtype: 'alternance', format: 'immersion', exitCost: 'facile', intensity: 2, blockedBy: ['moins_5min'] },
  { id: 'tc_al_pause',           label: 'Pause motrice courte entre deux segments',   category: 'tache', subtype: 'alternance', format: 'etincelle', exitCost: 'facile', intensity: 2, blockedBy: [] },
  { id: 'tc_al_canal',           label: 'Changer de canal (lecture puis écriture)',   category: 'tache', subtype: 'alternance', format: 'impulsion', exitCost: 'facile', intensity: 1, blockedBy: [] },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function filterActivities(opts: {
  category?: StimCategory;
  channel?: StimChannel;
  subtype?: string;
  constraints?: StimConstraint[];
  maxIntensity?: number;
  minIntensity?: number;
  formats?: StimFormat[];
}): StimActivity[] {
  return STIM_LIBRARY.filter(a => {
    if (opts.category && a.category !== opts.category) return false;
    if (opts.channel && a.channel !== opts.channel) return false;
    if (opts.subtype && a.subtype !== opts.subtype) return false;
    if (opts.maxIntensity !== undefined && a.intensity > opts.maxIntensity) return false;
    if (opts.minIntensity !== undefined && a.intensity < opts.minIntensity) return false;
    if (opts.formats && !opts.formats.includes(a.format)) return false;
    if (opts.constraints && opts.constraints.some(c => a.blockedBy.includes(c))) return false;
    return true;
  });
}

export function pickRandom(
  activities: StimActivity[],
  count: number,
  excludeIds?: string[]
): StimActivity[] {
  const pool = excludeIds
    ? activities.filter(a => !excludeIds.includes(a.id))
    : activities.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export const EXIT_COST_LABEL: Record<StimExitCost, string> = {
  facile: 'Facile à quitter',
  absorbant: 'Peut devenir absorbant',
  limite_requise: 'À faire avec une limite préparée',
};
