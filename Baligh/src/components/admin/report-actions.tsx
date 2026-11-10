"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label, Select, Textarea } from "@/components/ui/field";
import { apiFetch, ApiRequestError } from "@/lib/api-types";
import {
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  PRIORITIES,
  PRIORITY_LABELS,
  STATUSES,
  STATUS_LABELS,
  type Department,
  type Priority,
  type Status,
} from "@/lib/constants";

export function ReportActions(props: { id: string; status: Status; priority: Priority; department: Department }) {
  const router = useRouter();
  const [status, setStatus] = useState(props.status);
  const [priority, setPriority] = useState(props.priority);
  const [department, setDepartment] = useState(props.department);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const dirty = status !== props.status || priority !== props.priority || department !== props.department || note.trim().length > 0;

  async function save(override?: Partial<{ status: Status }>) {
    setSaving(true);
    setMsg(null);
    const body: Record<string, string> = {};
    const nextStatus = override?.status ?? status;
    if (nextStatus !== props.status) body.status = nextStatus;
    if (priority !== props.priority) body.priority = priority;
    if (department !== props.department) body.department = department;
    if (note.trim()) body.note = note.trim();
    try {
      await apiFetch(`/api/admin/reports/${props.id}`, { method: "PATCH", body: JSON.stringify(body), timeoutMs: 20_000 });
      setNote("");
      if (override?.status) setStatus(override.status);
      setMsg({ tone: "success", text: "تم حفظ التعديلات." });
      router.refresh();
    } catch (e) {
      setMsg({ tone: "danger", text: (e as ApiRequestError).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <aside className="h-fit space-y-4 rounded-[var(--radius-card)] border border-line bg-white p-5 lg:sticky lg:top-6" aria-labelledby="actions-title">
      <h2 id="actions-title" className="font-bold">إجراءات المشرف</h2>
      <div>
        <Label htmlFor="st">الحالة</Label>
        <Select id="st" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </Select>
      </div>
      <div>
        <Label htmlFor="pr">الأولوية</Label>
        <Select id="pr" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
          {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
        </Select>
      </div>
      <div>
        <Label htmlFor="dp">الجهة المسؤولة</Label>
        <Select id="dp" value={department} onChange={(e) => setDepartment(e.target.value as Department)}>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{DEPARTMENT_LABELS[d]}</option>)}
        </Select>
      </div>
      <div>
        <Label htmlFor="nt" hint="لا تظهر للمتدرب">ملاحظة داخلية</Label>
        <Textarea id="nt" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثل: تم التواصل مع فني التكييف" />
      </div>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <Button className="w-full" loading={saving} disabled={!dirty} onClick={() => save()}>
        حفظ التعديلات
      </Button>
      {props.status !== "resolved" && props.status !== "closed" && (
        <Button variant="secondary" className="w-full" disabled={saving} onClick={() => save({ status: "resolved" })}>
          <CheckCircle2 className="size-4" aria-hidden />
          تحديد كمحلول
        </Button>
      )}
    </aside>
  );
}
