import { Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube, ExternalLink } from "lucide-react";
import { useSiteSettings, useOfficialLinks } from "@/lib/use-site-settings";
import { useI18n } from "@/lib/i18n";

export function Footer() {
  const s = useSiteSettings();
  const links = useOfficialLinks();
  const { t } = useI18n();
  return (
    <footer className="site-footer mt-16">
      <div className="page-shell grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <h3 className="mb-3 text-lg font-bold tracking-tight">{t("site.about")}</h3>
          <p className="text-sm leading-relaxed opacity-90">{t("site.about_text")}</p>
          <div className="mt-5 flex gap-2">
            <a href="#" aria-label="Facebook" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 transition hover:-translate-y-0.5 hover:bg-white/20"><Facebook className="h-4 w-4" /></a>
            <a href="#" aria-label="Twitter" className="h-9 w-9 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 transition"><Twitter className="h-4 w-4" /></a>
            <a href="#" aria-label="Instagram" className="h-9 w-9 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 transition"><Instagram className="h-4 w-4" /></a>
            <a href="#" aria-label="YouTube" className="h-9 w-9 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 transition"><Youtube className="h-4 w-4" /></a>
          </div>
        </div>
        <div>
          <h4 className="footer-heading mb-4">{t("site.important_links")}</h4>
          <ul className="space-y-2.5 text-sm">
            {links.length === 0 && <li className="opacity-70">{t("site.no_links")}</li>}
            {links.map((l) => (
              <li key={l.id}>
                <a href={l.url} target="_blank" rel="noreferrer noopener"
                   className="footer-link">
                  <ExternalLink className="h-3.5 w-3.5" />{l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="footer-heading mb-4">{t("site.services")}</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/huduma" className="footer-link">{t("nav.services")}</Link></li>
            <li><Link to="/changamoto" className="opacity-90 hover:opacity-100 hover:underline">{t("chal.title")}</Link></li>
            <li><Link to="/mikopo" className="opacity-90 hover:opacity-100 hover:underline">{t("home.loan_form_title")}</Link></li>
            <li><Link to="/mahafa" className="opacity-90 hover:opacity-100 hover:underline">{t("nav.grad")}</Link></li>
            <li><Link to="/matangazo" className="opacity-90 hover:opacity-100 hover:underline">{t("nav.news")}</Link></li>
            <li>
              <Link to="/ubunifu" className="opacity-90 hover:opacity-100 hover:underline">
                {t("nav.innovation")}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="footer-heading mb-4">{t("site.contact")}</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2"><Mail className="h-4 w-4 mt-0.5 shrink-0" /><span className="break-all">{s?.email ?? "mumso@chuo.ac.tz"}</span></li>
            <li className="flex items-start gap-2"><Phone className="h-4 w-4 mt-0.5 shrink-0" /><span>{s?.phone ?? "+255 700 000 000"}</span></li>
            <li className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 shrink-0" /><span>{s?.address ?? "Ofisi ya MUMSO, Chuo cha MUM, Morogoro"}</span></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-5 text-center text-xs opacity-90 space-y-1">
        <div>© {new Date().getFullYear()} Muslim University of Morogoro Students Organization (MUMSO). {t("site.rights")}</div>
        <div className="text-[11px] opacity-80">
          {t("site.designed_by")} <span className="font-semibold">Viwango</span>
          <Link
            to="/login"
            aria-label={t("site.system")}
            title={t("site.system")}
            className="ml-2 select-none text-white/20 transition hover:text-white/70"
          >
            ·
          </Link>
        </div>
      </div>

    </footer>
  );
}
