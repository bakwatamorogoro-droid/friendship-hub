import { Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube, ExternalLink } from "lucide-react";
import { useSiteSettings, useOfficialLinks } from "@/lib/use-site-settings";

export function Footer() {
  const s = useSiteSettings();
  const links = useOfficialLinks();
  return (
    <footer className="mt-16 bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-12 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <h3 className="font-bold text-lg mb-3">Kuhusu MUMSO</h3>
          <p className="text-sm opacity-90 leading-relaxed">
            Muslim University of Morogoro Students Organization (MUMSO) — sauti ya mwanafunzi, mfumo rasmi wa mawasiliano, mikopo na huduma.
          </p>
          <div className="mt-4 flex gap-2">
            <a href="#" aria-label="Facebook" className="h-9 w-9 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 transition"><Facebook className="h-4 w-4" /></a>
            <a href="#" aria-label="Twitter" className="h-9 w-9 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 transition"><Twitter className="h-4 w-4" /></a>
            <a href="#" aria-label="Instagram" className="h-9 w-9 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 transition"><Instagram className="h-4 w-4" /></a>
            <a href="#" aria-label="YouTube" className="h-9 w-9 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 transition"><Youtube className="h-4 w-4" /></a>
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider">Tovuti Muhimu</h4>
          <ul className="space-y-2 text-sm">
            {links.length === 0 && <li className="opacity-70">Hakuna viungo bado.</li>}
            {links.map((l) => (
              <li key={l.id}>
                <a href={l.url} target="_blank" rel="noreferrer noopener"
                   className="inline-flex items-center gap-1.5 opacity-90 hover:opacity-100 hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" />{l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider">Huduma</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/huduma" className="opacity-90 hover:opacity-100 hover:underline">Huduma za Wanafunzi</Link></li>
            <li><Link to="/changamoto" className="opacity-90 hover:opacity-100 hover:underline">Huduma</Link></li>
            <li><Link to="/mikopo" className="opacity-90 hover:opacity-100 hover:underline">Fomu ya Mkopo (HESLB)</Link></li>
            <li><Link to="/mahafa" className="opacity-90 hover:opacity-100 hover:underline">Mahafali</Link></li>
            <li><Link to="/public" className="opacity-90 hover:opacity-100 hover:underline">Matangazo</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider">Wasiliana Nasi</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2"><Mail className="h-4 w-4 mt-0.5 shrink-0" /><span className="break-all">{s?.email ?? "mumso@chuo.ac.tz"}</span></li>
            <li className="flex items-start gap-2"><Phone className="h-4 w-4 mt-0.5 shrink-0" /><span>{s?.phone ?? "+255 700 000 000"}</span></li>
            <li className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 shrink-0" /><span>{s?.address ?? "Ofisi ya MUMSO, Chuo cha MUM, Morogoro"}</span></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs opacity-90 space-y-1 px-4">
        <div>© {new Date().getFullYear()} Muslim University of Morogoro Students Organization (MUMSO). Haki zote zimehifadhiwa.</div>
        <div className="text-[11px] opacity-80">
          Designed &amp; Developed by <span className="font-semibold">Viwango</span>
          <Link
            to="/login"
            aria-label="Mfumo"
            title="Mfumo"
            className="ml-2 select-none text-white/20 transition hover:text-white/70"
          >
            ·
          </Link>
        </div>
      </div>

    </footer>
  );
}