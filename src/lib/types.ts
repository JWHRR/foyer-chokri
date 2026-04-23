export type AppRole = "ADMIN" | "SURVEILLANT" | "TECHNICIEN";
export type PermanenceSlot = "MATIN" | "APRES_MIDI" | "NUIT";
export type RepasType = "PETIT_DEJEUNER" | "DEJEUNER" | "DINER";
export type ReclamationStatus = "EN_ATTENTE" | "EN_COURS" | "TERMINEE";
export type ReclamationPriority = "BASSE" | "NORMALE" | "HAUTE";

export const SLOT_LABELS: Record<PermanenceSlot, string> = {
  MATIN: "Matin (08h–13h)",
  APRES_MIDI: "Après-midi (14h–19h)",
  NUIT: "Nuit (20h–23h)",
};

export const REPAS_LABELS: Record<RepasType, string> = {
  PETIT_DEJEUNER: "Petit-déjeuner",
  DEJEUNER: "Déjeuner",
  DINER: "Dîner",
};

export const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: "Administrateur",
  SURVEILLANT: "Surveillant",
  TECHNICIEN: "Technicien",
};

export const STATUS_LABELS: Record<ReclamationStatus, string> = {
  EN_ATTENTE: "En attente",
  EN_COURS: "En cours",
  TERMINEE: "Terminée",
};

export const PRIORITY_LABELS: Record<ReclamationPriority, string> = {
  BASSE: "Basse",
  NORMALE: "Normale",
  HAUTE: "Haute",
};
