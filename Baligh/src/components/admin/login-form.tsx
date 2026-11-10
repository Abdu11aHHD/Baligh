"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

export function LoginForm({ signedInNonAdmin }: { signedInNonAdmin: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    await getSupabaseBrowser().auth.signOut();
    router.refresh();
  }

  if (signedInNonAdmin !== null) {
    return (
      <Alert
        tone="warning"
        title="هذا الحساب لا يملك صلاحية مشرف"
        action={
          <Button size="sm" variant="outline" onClick={signOut}>
            تسجيل الخروج والدخول بحساب آخر
          </Button>
        }
      >
        سجّلت الدخول بالبريد <span className="ltr-chunk">{signedInNonAdmin}</span>، لكنه غير مضاف إلى قائمة المشرفين.
      </Alert>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
          const { error: authError } = await getSupabaseBrowser().auth.signInWithPassword({ email: email.trim(), password });
          if (authError) {
            setError(authError.status === 400 ? "البريد الإلكتروني أو كلمة المرور غير صحيحة." : "تعذّر تسجيل الدخول. حاول مرة أخرى.");
            return;
          }
          router.replace("/admin");
          router.refresh();
        } catch {
          setError("تعذّر الاتصال بخدمة المصادقة.");
        } finally {
          setLoading(false);
        }
      }}
    >
      <div>
        <Label htmlFor="email">البريد الإلكتروني</Label>
        <Input id="email" type="email" dir="ltr" className="text-left" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="password">كلمة المرور</Label>
        <Input id="password" type="password" dir="ltr" className="text-left" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <Alert tone="danger">{error}</Alert>}
      <Button type="submit" className="w-full" size="lg" loading={loading}>
        تسجيل الدخول
      </Button>
    </form>
  );
}
