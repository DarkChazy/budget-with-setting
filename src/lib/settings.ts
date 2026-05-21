import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { addMonths, currentMonth } from "./format";

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

export async function ensureUserSettings(userId: string): Promise<UserSettings> {
  const { data } = await supabase
    .from("user_settings").select("*").eq("user_id", userId).maybeSingle();
  if (data) return data as any;
  const row = { user_id: userId, ...DEFAULTS };
  await supabase.from("user_settings").insert(row);
  return row as any;
}

export async function ensureSeedCategories(userId: string) {
  const { data } = await supabase
    .from("categories").select("id").eq("user_id", userId).limit(1);
  if (data && data.length > 0) return;
  await supabase.from("categories").insert(
    DEFAULT_CATEGORIES.map((name) => ({ user_id: userId, name }))
  );
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
    await ensureSeedCategories(userId);
    const { data } = await supabase
      .from("categories").select("id,name").eq("user_id", userId).order("name");
    setCategories((data ?? []) as any);
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