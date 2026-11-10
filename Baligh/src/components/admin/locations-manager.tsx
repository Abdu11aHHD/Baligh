"use client";
import { useState } from "react";
import Link from "next/link";
import { Download, Eye, EyeOff, Pencil, Plus, Printer, QrCode, X } from "lucide-react";
import { CopyButton } from "@/components/common/copy-button";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { apiFetch, ApiRequestError } from "@/lib/api-types";
import { cn } from "@/lib/utils";

export interface AdminLocation {
  id: string;
  code: string;
  name_ar: string;
  building: string | null;
  floor: string | null;
  area: string | null;
  is_active: boolean;
  created_at: string;
}

type FormValues = { code: string; name_ar: string; building: string; floor: string; area: string };
const EMPTY: FormValues = { code: "", name_ar: "", building: "", floor: "", area: "" };

function toForm(l: AdminLocation): FormValues {
  return { code: l.code, name_ar: l.name_ar, building: l.building ?? "", floor: l.floor ?? "", area: l.area ?? "" };
}

function payload(v: FormValues) {
  return {
    code: v.code.trim().toUpperCase(),
    name_ar: v.name_ar.trim(),
    building: v.building.trim() || null,
    floor: v.floor.trim() || null,
    area: v.area.trim() || null,
  };
}

export function LocationsManager({ initial, siteUrl }: { initial: AdminLocation[]; siteUrl: string | null }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrFor, setQrFor] = useState<string | null>(null);

  async function saveForm() {
    setSaving(true);
    setError(null);
    try {
      if (editing === "new") {
        const { location } = await apiFetch<{ location: AdminLocation }>("/api/admin/locations", {
          method: "POST",
          body: JSON.stringify({ ...payload(form), is_active: true }),
        });
        setItems((p) => [...p, location]);
      } else if (editing) {
        const { location } = await apiFetch<{ location: AdminLocation }>(`/api/admin/locations/${editing}`, {
          method: "PATCH",
          body: JSON.stringify(payload(form)),
        });
        setItems((p) => p.map((l) => (l.id === location.id ? location : l)));
      }
      setEditing(null);
      setForm(EMPTY);
    } catch (e) {
      setError((e as ApiRequestError).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(l: AdminLocation) {
    setError(null);
    try {
      const { location } = await apiFetch<{ location: AdminLocation }>(`/api/admin/locations/${l.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !l.is_active }),
      });
      setItems((p) => p.map((x) => (x.id === location.id ? location : x)));
    } catch (e) {
      setError((e as ApiRequestError).message);
    }
  }

  const reportUrl = (code: string) => (siteUrl ? `${siteUrl}/report?loc=${encodeURIComponent(code)}` : null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing("new");
            setForm(EMPTY);
            setError(null);
          }}
          disabled={editing === "new"}
        >
          <Plus className="size-4" aria-hidden />
          إضافة موقع
        </Button>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      {editing && (
        <form
          className="grid gap-4 rounded-[var(--radius-card)] border border-brand-200 bg-white p-5 shadow-[var(--shadow-lift)] sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            void saveForm();
          }}
        >
          <div className="flex items-center justify-between sm:col-span-2">
            <h2 className="font-bold">{editing === "new" ? "موقع جديد" : "تعديل الموقع"}</h2>
            <button type="button" aria-label="إغلاق" className="rounded-lg p-1.5 text-muted hover:bg-brand-50" onClick={() => setEditing(null)}>
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div>
            <Label htmlFor="name_ar">اسم الموقع</Label>
            <Input id="name_ar" required minLength={2} maxLength={80} value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} placeholder="قاعة 204" />
          </div>
          <div>
            <Label htmlFor="code" hint="أحرف إنجليزية كبيرة وأرقام وشرطة">رمز الموقع</Label>
            <Input
              id="code"
              required
              dir="ltr"
              className="ltr-chunk text-left"
              pattern="[A-Za-z0-9][A-Za-z0-9\-]{1,31}"
              maxLength={32}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="ROOM-204"
            />
            {editing !== "new" && <p className="mt-1 text-xs text-warning-ink">تغيير الرمز يُبطل رموز QR المطبوعة سابقًا لهذا الموقع.</p>}
          </div>
          <div>
            <Label htmlFor="building">المبنى</Label>
            <Input id="building" maxLength={60} value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="floor">الدور</Label>
            <Input id="floor" maxLength={30} value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="area">المنطقة</Label>
            <Input id="area" maxLength={60} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" loading={saving}>{editing === "new" ? "إضافة الموقع" : "حفظ التعديلات"}</Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>إلغاء</Button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-brand-200 bg-white px-6 py-14 text-center">
          <QrCode className="mx-auto size-10 text-brand-300" aria-hidden />
          <p className="mt-3 font-bold">لا توجد مواقع بعد</p>
          <p className="mt-1 text-sm text-muted">أضف أول موقع لتوليد رمز QR خاص به.</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {items.map((l) => {
            const url = reportUrl(l.code);
            const open = qrFor === l.id;
            return (
              <li key={l.id} className={cn("rounded-[var(--radius-card)] border border-line bg-white p-4", !l.is_active && "bg-[#faf9fc]")}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-bold">
                      {l.name_ar}
                      {!l.is_active && <span className="rounded-full bg-[#efedf3] px-2 py-0.5 text-xs font-semibold text-muted">موقوف</span>}
                    </p>
                    <p className="text-sm text-muted">
                      <span className="ltr-chunk">{l.code}</span>
                      {[l.building, l.floor, l.area].filter(Boolean).length > 0 && <>، {[l.building, l.floor, l.area].filter(Boolean).join("، ")}</>}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant={open ? "secondary" : "outline"} onClick={() => setQrFor(open ? null : l.id)} disabled={!url} aria-expanded={open}>
                      <QrCode className="size-4" aria-hidden />
                      رمز QR
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(l.id);
                        setForm(toForm(l));
                        setError(null);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      <Pencil className="size-4" aria-hidden />
                      تعديل
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggle(l)}>
                      {l.is_active ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                      {l.is_active ? "إيقاف" : "تفعيل"}
                    </Button>
                  </div>
                </div>

                {open && url && (
                  <div className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-[10rem_1fr]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/admin/locations/${l.id}/qr?format=svg`} alt={`رمز QR لموقع ${l.name_ar}`} className="size-40 rounded-xl border border-line bg-white p-1" />
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="font-semibold">رابط البلاغ</p>
                        <div className="mt-1 flex items-center gap-2 rounded-xl bg-brand-50 p-2.5">
                          <a href={url} target="_blank" rel="noreferrer" className="ltr-chunk min-w-0 flex-1 truncate text-brand-700 hover:underline">{url}</a>
                          <CopyButton value={url} />
                        </div>
                      </div>
                      {!l.is_active && <p className="text-warning-ink">هذا الموقع موقوف: من يمسح الرمز سيرى رسالة ويُطلب منه اختيار موقع آخر.</p>}
                      <div className="flex flex-wrap gap-2">
                        <a className={buttonClasses("outline", "sm")} href={`/api/admin/locations/${l.id}/qr?format=png&download=1`}>
                          <Download className="size-4" aria-hidden />PNG
                        </a>
                        <a className={buttonClasses("outline", "sm")} href={`/api/admin/locations/${l.id}/qr?format=svg&download=1`}>
                          <Download className="size-4" aria-hidden />SVG
                        </a>
                        <Link className={buttonClasses("primary", "sm")} href={`/admin/locations/${l.id}/poster`}>
                          <Printer className="size-4" aria-hidden />ملصق للطباعة
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
