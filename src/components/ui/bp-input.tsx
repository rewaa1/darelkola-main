import { Input } from "@/components/ui/input";

interface BPInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

/**
 * Split blood pressure input — two numeric fields (systolic / diastolic)
 * that combine into a single "120/80" string for the backend.
 */
export function BPInput({ value, onChange, error }: BPInputProps) {
  const parts = value.split("/");
  const systolic = parts[0] || "";
  const diastolic = parts[1] || "";

  const update = (sys: string, dia: string) => {
    // Only allow digits
    sys = sys.replace(/\D/g, "").slice(0, 3);
    dia = dia.replace(/\D/g, "").slice(0, 3);

    if (!sys && !dia) {
      onChange("");
    } else {
      onChange(`${sys}/${dia}`);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Input
          type="text"
          inputMode="numeric"
          placeholder="Sys"
          value={systolic}
          onChange={(e) => update(e.target.value, diastolic)}
          className={`w-20 text-center ${error ? "border-destructive" : ""}`}
        />
        <span className="text-muted-foreground font-medium">/</span>
        <Input
          type="text"
          inputMode="numeric"
          placeholder="Dia"
          value={diastolic}
          onChange={(e) => update(systolic, e.target.value)}
          className={`w-20 text-center ${error ? "border-destructive" : ""}`}
        />
      </div>
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  );
}
