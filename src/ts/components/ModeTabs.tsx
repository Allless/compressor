export type Mode = "preset" | "custom";

interface Props {
  value: Mode;
  onChange: (next: Mode) => void;
  disabled?: boolean;
}

export const ModeTabs = ({ value, onChange, disabled }: Props) => (
  <div class="control__tabs" role="tablist">
    {(["preset", "custom"] as const).map((m) => (
      <button
        key={m}
        type="button"
        role="tab"
        aria-selected={value === m}
        class={`control__tab ${value === m ? "control__tab--active" : ""}`}
        onClick={() => onChange(m)}
        disabled={disabled}
      >
        {m === "preset" ? "Preset" : "Custom"}
      </button>
    ))}
  </div>
);
