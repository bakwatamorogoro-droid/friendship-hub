import { Link } from "@tanstack/react-router";
import { BadgeCheck, GraduationCap, LoaderCircle, Search, UserRound, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { useRegisteredStudent } from "@/lib/student-registration";

export function StudentIdentity({ identity }: { identity: ReturnType<typeof useRegisteredStudent> }) {
  const { student, reg, searching, error, lookup, changeReg } = identity;
  if (student) return (
    <section className="student-identity border-y border-primary/20 bg-primary/5 px-4 py-5" aria-label="Taarifa za mwanafunzi">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><UserRound className="h-5 w-5" /></span>
          <div className="min-w-0"><p className="flex items-center gap-1.5 text-xs font-semibold text-primary"><BadgeCheck className="h-4 w-4" /> REG imethibitishwa</p><h2 className="mt-1 break-words text-lg font-bold text-foreground">{student.full_name}</h2></div>
        </div>
        <Button type="button" variant="ghost" size="icon" title="Badili mwanafunzi" aria-label="Badili mwanafunzi" onClick={() => changeReg("")}><ArrowLeftRight className="h-4 w-4" /></Button>
      </div>
      <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        {[['REG Namba', student.registration_number], ['Namba ya Simu', student.phone], ['Kozi', student.course], ['Mwaka wa Masomo', student.year_of_study]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-0.5 break-words font-medium text-foreground">{value}</dd></div>)}
      </dl>
    </section>
  );
  return (
    <section className="space-y-3" aria-label="Thibitisha REG">
      <Label htmlFor="student-reg">REG Namba ya Chuo *</Label>
      <div className="flex gap-2">
        <Input id="student-reg" value={reg} maxLength={60} onChange={(e) => changeReg(e.target.value)} placeholder="Mf. MUM2021-04-07625" autoCapitalize="characters" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void lookup(reg); } }} aria-invalid={Boolean(error)} aria-describedby={error ? "student-reg-error" : undefined} />
        <Button type="button" variant="outline" onClick={() => lookup(reg)} disabled={searching}>{searching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} {searching ? "Inatafuta…" : "Tafuta"}</Button>
      </div>
      {error && <p id="student-reg-error" role="alert" className="text-sm text-destructive">{error}</p>}
      <Link to="/jisajili" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><GraduationCap className="h-4 w-4" /> Jisajili Mwanafunzi</Link>
    </section>
  );
}