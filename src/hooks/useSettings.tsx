import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface UserSettings {
  id: string;
  user_id: string;
  theme: "light" | "dark" | "system";
  default_tone_preset: string | null;
  preferred_writing_style: number;
  default_department: string | null;
  display_name: string | null;
}

interface SettingsContextType {
  settings: UserSettings | null;
  loading: boolean;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  refetch: () => Promise<void>;
}

const defaultSettings: Omit<UserSettings, "id" | "user_id"> = {
  theme: "system",
  default_tone_preset: "company-standard",
  preferred_writing_style: 50,
  default_department: null,
  display_name: null,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  const fetchSettings = async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    // Prevent concurrent fetches
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data as UserSettings);
      } else {
        // Create default settings for new user using upsert to prevent duplicates
        const { data: newSettings, error: insertError } = await supabase
          .from("user_settings")
          .upsert({
            user_id: user.id,
            ...defaultSettings,
          }, { onConflict: 'user_id' })
          .select()
          .single();

        if (insertError) throw insertError;
        setSettings(newSettings as UserSettings);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [user]);

  // Apply theme to document
  useEffect(() => {
    if (!settings) return;

    const root = document.documentElement;
    
    if (settings.theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.remove("light", "dark");
      root.classList.add(systemTheme);
    } else {
      root.classList.remove("light", "dark");
      root.classList.add(settings.theme);
    }

  }, [settings?.theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (settings?.theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [settings?.theme]);

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!user || !settings) return;

    try {
      const { error } = await supabase
        .from("user_settings")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;

      setSettings({ ...settings, ...updates });
    } catch (error) {
      console.error("Error updating settings:", error);
      throw error;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings, refetch: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}