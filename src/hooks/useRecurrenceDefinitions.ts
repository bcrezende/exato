import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface RecurrenceDefinition {
  id: string;
  company_id: string;
  name: string;
  key: string;
  interval_value: number;
  interval_unit: string;
  max_span_days: number;
  is_system: boolean;
  created_at: string;
  weekdays: number[] | null;
  skip_weekends: boolean;
  skip_holidays: boolean;
}

const weekdayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function useRecurrenceDefinitions() {
  const { profile } = useAuth();
  const [definitions, setDefinitions] = useState<RecurrenceDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDefinitions = async () => {
    if (!profile?.company_id) return;
    const { data } = await supabase
      .from("recurrence_definitions")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("interval_value", { ascending: true });
    if (data) setDefinitions(data as RecurrenceDefinition[]);
    setLoading(false);
  };

  useEffect(() => {
    if (profile?.company_id) fetchDefinitions();
  }, [profile?.company_id]);

  const getLabel = (key: string): string => {
    const def = definitions.find(d => d.key === key);
    return def?.name || key;
  };

  const getLabelsMap = (): Record<string, string> => {
    const map: Record<string, string> = {};
    definitions.forEach(d => { map[d.key] = d.name; });
    return map;
  };

  const getMaxSpanDays = (key: string): number | null => {
    const def = definitions.find(d => d.key === key);
    return def?.max_span_days ?? null;
  };

  const getWeekdaysLabel = (key: string): string | null => {
    const def = definitions.find(d => d.key === key);
    if (!def?.weekdays || def.weekdays.length === 0) return null;
    return def.weekdays.map(d => weekdayNames[d]).join(", ");
  };

  const getDefinition = (key: string): RecurrenceDefinition | undefined => {
    return definitions.find(d => d.key === key);
  };

  return { definitions, loading, fetchDefinitions, getLabel, getLabelsMap, getMaxSpanDays, getWeekdaysLabel, getDefinition };
}
