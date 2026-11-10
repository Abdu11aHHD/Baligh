"use client";
import { useId, useState } from "react";
import { MapPin, QrCode } from "lucide-react";
import type { LocationOption } from "@/lib/api-types";
import { Select } from "@/components/ui/field";

export const OTHER_LOCATION = "__other__";

export function locationLabel(l: LocationOption): string {
  const extra = [l.building, l.floor].filter(Boolean).join("، ");
  return extra ? `${l.name_ar} (${extra})` : l.name_ar;
}

/** Shows the QR-resolved location prominently, with an escape hatch to change it. */
export function LocationPicker({
  locations,
  value,
  onChange,
  fromQr,
  allowOther = false,
  disabled,
}: {
  locations: LocationOption[];
  value: string;
  onChange: (id: string) => void;
  fromQr: boolean;
  allowOther?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  const selected = locations.find((l) => l.id === value);
  const [editing, setEditing] = useState(!selected);

  if (selected && !editing) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-white p-3.5 shadow-[var(--shadow-lift)]">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-500 text-white">
          {fromQr ? <QrCode className="size-5" aria-hidden /> : <MapPin className="size-5" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">{fromQr ? "الموقع المحدد من رمز QR" : "الموقع المحدد"}</p>
          <p className="truncate font-bold text-brand-900">{selected.name_ar}</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={disabled}
          className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
        >
          تغيير
        </button>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        موقع المشكلة
      </label>
      <Select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          if (e.target.value && e.target.value !== OTHER_LOCATION) setEditing(false);
        }}
      >
        <option value="">اختر الموقع من القائمة</option>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {locationLabel(l)}
          </option>
        ))}
        {allowOther && <option value={OTHER_LOCATION}>موقع آخر غير موجود في القائمة</option>}
      </Select>
    </div>
  );
}
