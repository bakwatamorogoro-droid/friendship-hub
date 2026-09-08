ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS excerpt text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS deadline_note text;

ALTER TABLE public.service_status
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS deadline_note text;

ALTER TABLE public.official_links
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS description text;

DROP TRIGGER IF EXISTS update_announcements_updated_at ON public.announcements;
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.ai_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  kind text NOT NULL DEFAULT 'general',
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_knowledge TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_knowledge TO authenticated;
GRANT ALL ON public.ai_knowledge TO service_role;

ALTER TABLE public.ai_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published knowledge"
  ON public.ai_knowledge FOR SELECT
  USING (published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage knowledge"
  ON public.ai_knowledge FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_ai_knowledge_updated_at ON public.ai_knowledge;
CREATE TRIGGER update_ai_knowledge_updated_at
  BEFORE UPDATE ON public.ai_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.ai_knowledge (title, content, kind) VALUES
('MUMSO ni nini', 'MUMSO (Mount Meru University Muslim Students Organization / Serikali ya Wanafunzi) ni chombo rasmi cha wanafunzi kinachowaunganisha wanafunzi na uongozi wa chuo. Mfumo huu wa mtandao unaruhusu wanafunzi kutuma huduma, kuripoti matatizo ya mikopo, kutoa taarifa za misiba, kufuatilia maombi yao, na kupata matangazo rasmi.', 'general'),
('Huduma zinazopatikana', 'Huduma kuu: (1) Huduma za Wanafunzi — maombi ya kitaaluma, kifedha, afya na ushauri; (2) Huduma ya Mikopo (HESLB) — disbursement, allocation, appeal, marekebisho ya taarifa; (3) Taarifa za Misiba — kutoa taarifa ya msiba; (4) Changamoto — kuripoti changamoto yoyote; (5) Mahafali; (6) Matangazo. Kila huduma ina fomu yake ya kujaza na baada ya kutuma unapata namba ya kumbukumbu ya kufuatilia kwenye ukurasa wa Fuatilia.', 'services'),
('Jinsi ya kufuatilia ombi', 'Baada ya kutuma fomu yoyote, unapata namba ya kumbukumbu (tracking code). Nenda ukurasa wa "Fuatilia", weka namba hiyo au namba yako ya usajili (REG NO) ili kuona hali ya ombi: Imepokelewa, Inafanyiwa kazi, au Imekamilika.', 'tracking'),
('Mikopo ya HESLB', 'Matatizo ya mikopo yanayoshughulikiwa: kutopata disbursement, kupata kiasi kidogo (allocation), appeal ya kutokupata mkopo, makosa ya taarifa binafsi, matatizo ya akaunti ya benki, na kutolewa kwenye mfumo. Weka taarifa sahihi za jina, REG NO, mwaka wa masomo na maelezo ya tatizo ili kiongozi wa mikopo aweze kufuatilia HESLB.', 'loans'),
('Muda wa mwisho wa huduma', 'Kila huduma inaweza kuwa na muda wa mwisho (deadline) uliowekwa na kiongozi wa idara au menejimenti. Muda uliobaki huoneshwa kwenye ukurasa wa huduma kwa siku, masaa na dakika. Baada ya muda kuisha, tuma taarifa mapema au wasiliana na kiongozi wa idara.', 'deadlines'),
('Uongozi na paneli za viongozi', 'Kila kiongozi aliyeidhinishwa na menejimenti anapata paneli yake ya kushughulikia maombi ya idara yake. Wanafunzi hawajisajili kwenye mfumo — menejimenti pekee inathibitisha na kuidhinisha akaunti za viongozi. Barua pepe haitumiki kuthibitisha akaunti.', 'leadership'),
('Mawasiliano', 'Kwa msaada wa haraka tumia fomu ya huduma inayohusiana na tatizo lako, au wasiliana na uongozi kwa namba na barua pepe zilizoonyeshwa chini ya ukurasa. Ukurasa wa Viongozi unaonyesha kila kiongozi, wadhifa wake na mawasiliano yake.', 'contact')
ON CONFLICT DO NOTHING;