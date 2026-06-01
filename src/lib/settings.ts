import { useEffect, useState, useCallback } from "react";
import { addMonths, currentMonth } from "./format";
import { getUserSettings, listCategories } from "./api.functions";

export type UserSettings = {
  user_id: string;
  default_private_month_offset: number;
  default_house_month_offset: number;
  chazy_default_percentage: number;
  helly_default_percentage: number;
};

const DEFAULTS: Omit<UserSettings, "user_id"> = {
  default_private_month_offset: 0,
  default_house_month_offset: 0,
  chazy_default_percentage: 60,
  helly_default_percentage: 40,
};

const DEFAULT_CATEGORIES = [
  "Mortgage", "Utilities", "Groceries", "Insurance",
  "Internet", "Furniture", "Repairs", "Fun", "Subscriptions",
];

export async function ensureUserSettings(_userId: string): Promise<UserSettings> {
  const s = await getUserSettings();
  return {
    user_id: s.user_id,
    default_private_month_offset: s.default_private_month_offset,
    default_house_month_offset: s.default_house_month_offset,
    chazy_default_percentage: parseFloat(s.chazy_default_percentage as any),
    helly_default_percentage: parseFloat(s.helly_default_percentage as any),
  };
}

export async function ensureSeedCategories(_userId: string) {
  // Server function lazily seeds on first listCategories call.
  await listCategories();
}

export function useUserSettings(userId: string | undefined) {
  const [settings, setSettings] = useState<UserSettings | null>(null);

  const reload = useCallback(async () => {
    if (!userId) return;
    const s = await ensureUserSettings(userId);
    setSettings(s);
  }, [userId]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const h = () => reload();
    window.addEventListener("hb:settings-change", h);
    return () => window.removeEventListener("hb:settings-change", h);
  }, [reload]);

  return { settings, reload };
}

export function useCategories(userId: string | undefined) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const reload = useCallback(async () => {
    if (!userId) return;
    const rows = await listCategories();
    setCategories(rows as any);
  }, [userId]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const h = () => reload();
    window.addEventListener("hb:categories-change", h);
    return () => window.removeEventListener("hb:categories-change", h);
  }, [reload]);

  return { categories, reload };
}

export function defaultMonthFor(offset: number) {
  return addMonths(currentMonth(), offset);
}

export function notifySettingsChanged() {
  window.dispatchEvent(new Event("hb:settings-change"));
}
export function notifyCategoriesChanged() {
  window.dispatchEvent(new Event("hb:categories-change"));
}