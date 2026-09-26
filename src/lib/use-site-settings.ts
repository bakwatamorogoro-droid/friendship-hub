import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  logo_url: string | null;
  mum_logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  system_enabled: boolean | null;
  maintenance_message: string | null;
  maintenance_ends_at: string | null;
  theme_primary: string | null;
  theme_accent: string | null;
  theme_background: string | null;
  president_name: string | null;
  president_title: string | null;
  president_message: string | null;
  president_photo_url: string | null;
};

export function useSiteSettings() {
  const [s, setS] = useState<SiteSettings | null>(null);
  useEffect(() => {
    (supabase.from("site_settings") as any)
      .select("logo_url,mum_logo_url,phone,email,address,system_enabled,maintenance_message,maintenance_ends_at,theme_primary,theme_accent,theme_background,president_name,president_title,president_message,president_photo_url")
      .limit(1).maybeSingle()
      .then(({ data }: any) => setS((data as SiteSettings) ?? null));
  }, []);
  return s;
}

export function useFormCategories(serviceKey: string) {
  const [cats, setCats] = useState<{ id: string; label: string }[]>([]);
  useEffect(() => {
    supabase.from("form_categories").select("id,label")
      .eq("service_key", serviceKey).eq("active", true).order("sort_order")
      .then(({ data }) => setCats((data as any) ?? []));
  }, [serviceKey]);
  return cats;
}

export function useDepartmentCategories(departmentId: string | null | undefined) {
  const [cats, setCats] = useState<{ id: string; label: string }[]>([]);
  useEffect(() => {
    if (!departmentId) { setCats([]); return; }
    (supabase.from("form_categories") as any)
      .select("id,label")
      .eq("department_id", departmentId)
      .eq("active", true)
      .order("sort_order")
      .then(({ data }: any) => setCats((data as any) ?? []));
  }, [departmentId]);
  return cats;
}

export function useServiceEnabled() {
  const [map, setMap] = useState<Record<string, boolean>>({});
  useEffect(() => {
    supabase.from("service_status").select("key,enabled")
      .then(({ data }) => {
        const m: Record<string, boolean> = {};
        (data ?? []).forEach((r: any) => { m[r.key] = r.enabled; });
        setMap(m);
      });
  }, []);
  return map;
}

export type Department = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  leader_name: string | null;
  leader_contact: string | null;
  icon: string | null;
  sort_order: number;
};

export function useDepartments() {
  const [list, setList] = useState<Department[]>([]);
  useEffect(() => {
    supabase.from("departments")
      .select("id,name,slug,description,leader_name,leader_contact,icon,sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => setList((data as any) ?? []));
  }, []);
  return list;
}

export function useDepartmentBySlug(slug: string) {
  const [dept, setDept] = useState<Department | null>(null);
  useEffect(() => {
    supabase.from("departments")
      .select("id,name,slug,description,leader_name,leader_contact,icon,sort_order")
      .eq("slug", slug).maybeSingle()
      .then(({ data }) => setDept((data as any) ?? null));
  }, [slug]);
  return dept;
}

export type OfficialLink = { id: string; label: string; url: string; sort_order: number; active: boolean };

export function useOfficialLinks() {
  const [links, setLinks] = useState<OfficialLink[]>([]);
  useEffect(() => {
    (supabase.from("official_links") as any)
      .select("id,label,url,sort_order,active,image_url,description")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }: any) => setLinks((data as OfficialLink[]) ?? []));
  }, []);
  return links;
}