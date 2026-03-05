import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ToneSettings } from "@/types";
import { cn } from "@/lib/utils";

interface ToneControlsProps {
  value: ToneSettings;
  onChange: (value: ToneSettings) => void;
  disabled?: boolean;
}

const PRESETS = [
  { 
    id: "company-standard",
    label: "Company Standard",
    settings: { formal_casual: 0.4, serious_playful: 0.3, concise_detailed: 0.5, traditional_unconventional: 0.4 }
  },
  { 
    id: "startup", 
    label: "Startup Vibe", 
    settings: { formal_casual: 0.7, serious_playful: 0.6, concise_detailed: 0.4, traditional_unconventional: 0.7 }
  },
  { 
    id: "enterprise", 
    label: "Enterprise", 
    settings: { formal_casual: 0.2, serious_playful: 0.2, concise_detailed: 0.7, traditional_unconventional: 0.1 }
  },
  { 
    id: "creative", 
    label: "Creative", 
    settings: { formal_casual: 0.6, serious_playful: 0.7, concise_detailed: 0.5, traditional_unconventional: 0.8 }
  },
];

const TONE_AXES = [
  { key: "formal_casual", leftLabel: "Formal", rightLabel: "Casual" },
  { key: "serious_playful", leftLabel: "Serious", rightLabel: "Playful" },
  { key: "concise_detailed", leftLabel: "Concise", rightLabel: "Detailed" },
  { key: "traditional_unconventional", leftLabel: "Traditional", rightLabel: "Unconventional" },
] as const;

export function ToneControls({ value, onChange, disabled }: ToneControlsProps) {
  const [activePreset, setActivePreset] = useState<string | null>(value.preset || null);

  useEffect(() => {
    // Check if current settings match any preset
    const matchingPreset = PRESETS.find(
      (preset) =>
        Math.abs(preset.settings.formal_casual - value.formal_casual) < 0.05 &&
        Math.abs(preset.settings.serious_playful - value.serious_playful) < 0.05 &&
        Math.abs(preset.settings.concise_detailed - value.concise_detailed) < 0.05 &&
        Math.abs(preset.settings.traditional_unconventional - value.traditional_unconventional) < 0.05
    );
    setActivePreset(matchingPreset?.id || null);
  }, [value]);

  const handlePresetClick = (preset: typeof PRESETS[0]) => {
    onChange({ ...preset.settings, preset: preset.id });
    setActivePreset(preset.id);
  };

  const handleSliderChange = (key: keyof ToneSettings, newValue: number[]) => {
    onChange({ ...value, [key]: newValue[0], preset: undefined });
    setActivePreset(null);
  };

  return (
    <div className="space-y-6">
      {/* Presets */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Quick Presets</Label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <Badge
              key={preset.id}
              variant={activePreset === preset.id ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-colors",
                disabled && "opacity-50 pointer-events-none"
              )}
              onClick={() => !disabled && handlePresetClick(preset)}
            >
              {preset.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-4">
        {TONE_AXES.map(({ key, leftLabel, rightLabel }) => (
          <div key={key} className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{leftLabel}</span>
              <span>{rightLabel}</span>
            </div>
            <Slider
              value={[value[key]]}
              onValueChange={(v) => handleSliderChange(key, v)}
              min={0}
              max={1}
              step={0.1}
              disabled={disabled}
              className="w-full"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
