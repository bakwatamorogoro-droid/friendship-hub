import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Image as ImageIcon, LoaderCircle, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createStorageUrl, useResolvedUrl } from "@/lib/storage-url";
import { useI18n } from "@/lib/i18n";

type Row = Record<string, any>;

/**
 * Kidhibiti cha picha za mwanzo (banner) chenye onyesho la moja kwa moja,
 * mpangilio na ufutaji wa haraka.
 */
export function BannerManager() {
  const { t } = useI18n();
  const [images, setImages] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [caption, setCaption] = useState("");

  const reload = async () => {
    const { data } = await (supabase.from("hero_images") as any)
      .select("id,url,caption,sort_order")
      .order("sort_order", { ascending: true });
    setImages((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    void reload();
  }, []);

  const upload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("bm.too_large"));
      return;
    }
    if (!/^image\//.test(file.type)) {
      toast.error(t("bm.only_images"));
      return;
    }
    setBusy(true);
    try {
      const path = `banner-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("hero-images").upload(path, file);
      if (upErr) throw upErr;
      const url = await createStorageUrl("hero-images", path);
      const nextOrder = images.reduce((max, i) => Math.max(max, Number(i.sort_order ?? 0)), 0) + 1;
      const { error } = await (supabase.from("hero_images") as any).insert({
        url,
        caption: caption.trim() || null,
        sort_order: nextOrder,
      });
      if (error) throw error;
      toast.success(t("bm.uploaded"));
      setCaption("");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const move = async (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setImages(next);
    await Promise.all(
      next.map((row, i) =>
        (supabase.from("hero_images") as any).update({ sort_order: i + 1 }).eq("id", row.id),
      ),
    );
  };

  const remove = async (row: Row) => {
    if (!confirm(t("bm.confirm_delete"))) return;
    const { error } = await (supabase.from("hero_images") as any).delete().eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("common.delete"));
    await reload();
  };

  const saveCaption = async (row: Row, value: string) => {
    const { error } = await (supabase.from("hero_images") as any)
      .update({ caption: value.trim() || null })
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("bm.caption_saved"));
    setImages((list) => list.map((i) => (i.id === row.id ? { ...i, caption: value.trim() } : i)));
  };

  return (
    <div className="mw-panel">
      <div className="mw-panel-head">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <ImageIcon className="h-5 w-5 text-primary" /> {t("mgmt.tab_banner")}
        </h2>
        <span className="mw-count">{images.length}</span>
      </div>

      <div className="bm-upload">
        <p className="mw-form-lead">{t("bm.lead")}</p>
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="banner-caption">{t("bm.caption")}</Label>
            <Input
              id="banner-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={t("bm.caption_ph")}
              maxLength={120}
            />
          </div>
          <Label className="bm-upload-btn">
            {busy ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {busy ? t("common.loading") : t("bm.choose")}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
                e.target.value = "";
              }}
            />
          </Label>
        </div>
      </div>

      {loading ? (
        <p className="mw-empty">{t("common.loading")}</p>
      ) : images.length === 0 ? (
        <p className="mw-empty">{t("bm.empty")}</p>
      ) : (
        <ul className="bm-grid">
          {images.map((row, i) => (
            <li key={row.id} className="bm-card">
              <div className="bm-preview">
                <BannerImage url={row.url} />
                <span className="bm-index">{i + 1}</span>
              </div>
              <div className="bm-card-body">
                <CaptionInput row={row} onSave={saveCaption} />
                <div className="bm-actions">
                  <Button
                    size="icon"
                    variant="outline"
                    title={t("bm.move_up")}
                    aria-label={t("bm.move_up")}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    title={t("bm.move_down")}
                    aria-label={t("bm.move_down")}
                    disabled={i === images.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    title={t("common.delete")}
                    aria-label={t("common.delete")}
                    onClick={() => remove(row)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BannerImage({ url }: { url: string }) {
  const resolved = useResolvedUrl(url);
  return <img src={resolved ?? url} alt="" loading="lazy" />;
}

function CaptionInput({ row, onSave }: { row: Row; onSave: (row: Row, value: string) => void }) {
  const { t } = useI18n();
  const [value, setValue] = useState<string>(row.caption ?? "");
  const dirty = (row.caption ?? "") !== value;
  return (
    <div className="bm-caption">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("bm.caption_ph")}
        maxLength={120}
      />
      {dirty && (
        <Button size="sm" onClick={() => onSave(row, value)}>
          {t("common.save")}
        </Button>
      )}
    </div>
  );
}
