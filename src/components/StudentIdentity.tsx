import { Link } from "@tanstack/react-router";
import { BadgeCheck, GraduationCap, LoaderCircle, Search, UserRound, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { useRegisteredStudent } from "@/lib/student-registration";
import { useI18n } from "@/lib/i18n";

export function StudentIdentity({ identity }: { identity: ReturnType<typeof useRegisteredStudent> }) {
  const { t } = useI18n();
  const { student, reg, searching, error, lookup, changeReg } = identity;
  if (student) return (
    <section className="student-identity" aria-label={t("form.reg_verified")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><UserRound className="h-5 w-5" /></span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary"><BadgeCheck className="h-4 w-4" /> {t("form.reg_verified")}</p>
            <h2 className="mt-1 break-words text-lg font-bold text-foreground">{student.full_name}</h2>
          </div>
        </div>
        <Button type="button" variant="ghost" size="icon" title={t("form.change_student")} aria-label={t("form.change_student")} onClick={() => changeReg("")}><ArrowLeftRight className="h-4 w-4" /></Button>
      </div>
      <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        {[
          [t("form.reg_number"), student.registration_number],
          [t("form.phone"), student.phone],
          [t("form.course"), student.course],
          [t("form.year"), student.year_of_study],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 break-words font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
  return (
    <section className="student-lookup" aria-label={t("form.verify_reg")}>
      <p className="flex items-center gap-2 text-sm font-bold text-foreground">
        <GraduationCap className="h-4 w-4 text-primary" /> {t("form.verify_reg")}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{t("form.verify_first_hint")}</p>
      <div className="mt-3 space-y-2">
        <Label htmlFor="student-reg">{t("form.reg_number")} *</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input id="student-reg" value={reg} maxLength={60} onChange={(e) => changeReg(e.target.value)} placeholder={t("form.reg_placeholder")} autoCapitalize="characters" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void lookup(reg); } }} aria-invalid={Boolean(error)} aria-describedby={error ? "student-reg-error" : undefined} />
          <Button type="button" variant="outline" onClick={() => lookup(reg)} disabled={searching} className="sm:w-40">
            {searching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} {searching ? t("form.reg_searching") : t("common.search")}
          </Button>
        </div>
        {error && <p id="student-reg-error" role="alert" className="text-sm text-destructive">{error}</p>}
        <Link to="/jisajili" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><GraduationCap className="h-4 w-4" /> {t("form.register_student")}</Link>
      </div>
    </section>
  );
}
