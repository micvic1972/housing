export const CAMPUSES = [
  { id: "alihame", label: "Alihame Main" },
  { id: "owa-oyibu", label: "Owa-Oyibu" },
  { id: "owa-alero", label: "Owa-Alero" },
] as const;

export type CampusId = (typeof CAMPUSES)[number]["id"];

export function campusLabel(campus: string | undefined): string | undefined {
  return CAMPUSES.find((option) => option.id === campus)?.label;
}

export function isCampusId(value: unknown): value is CampusId {
  return CAMPUSES.some((campus) => campus.id === value);
}
