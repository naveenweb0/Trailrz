"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useStaff } from "@/views/admin/AdminLayout";
import { errMsg } from "@/lib/api";
import { DEFAULT_HERO_CONFIG } from "@/lib/hero";
import { PageHead } from "@/components/admin/AdminKit";
import { Loading, ErrorState } from "@/components/common/States";

const F = ({ label, full, hint, children }) => (
  <label className={`block ${full ? "sm:col-span-2" : ""}`}>
    <span className="text-xs font-medium">{label}</span>
    <div className="mt-1">{children}</div>
    {hint && <p className="text-[11px] text-mineral mt-1">{hint}</p>}
  </label>
);

export default function HeroAdmin() {
  const { http } = useStaff();
  const [h, setH] = useState(null);
  const [err, setErr] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState(null);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [newUrl, setNewUrl] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    http
      .get("/admin/hero")
      .then((r) => setH(r.data.hero))
      .catch((e) => setErr(errMsg(e)));
  }, [http]);

  if (err) return <ErrorState message={err} />;
  if (!h) return <Loading />;

  const uploadFile = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await http.post("/admin/upload", fd);
    return data.url;
  };

  const replaceSlideImage = async (idx, file) => {
    if (!file) return;
    setUploadingIdx(idx);
    try {
      const url = await uploadFile(file);
      setH((cur) => ({
        ...cur,
        slides: cur.slides.map((s, j) => (j === idx ? { ...s, image_url: url } : s)),
      }));
      toast.success("Image uploaded — click Save hero changes to publish");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setUploadingIdx(null);
    }
  };

  const addSlideFromUpload = async (files) => {
    if (!files?.length) return;
    setUploadingIdx("new");
    try {
      const uploaded = [];
      for (const file of files) {
        const url = await uploadFile(file);
        const base =
          file.name
            .replace(/\.[^.]+$/, "")
            .replace(/[-_]+/g, " ")
            .toUpperCase()
            .slice(0, 11) || "TRAILRZ";
        uploaded.push({
          label: (newLabel.trim() || base).toUpperCase().slice(0, 20),
          image_url: url,
          description: newDesc.trim().slice(0, 220),
        });
      }
      setH((cur) => ({
        ...cur,
        slides: [...cur.slides, ...uploaded].slice(0, 12),
      }));
      setNewLabel("");
      setNewDesc("");
      toast.success(`${uploaded.length} slide(s) added — click Save hero changes to publish`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setUploadingIdx(null);
    }
  };

  const addSlideFromUrl = () => {
    const u = newUrl.trim();
    if (!/^https?:\/\//i.test(u) && !u.startsWith("/")) {
      toast.error("Enter a valid https:// or / image URL");
      return;
    }
    setH((cur) => ({
      ...cur,
      slides: [
        ...cur.slides,
        {
          label: (newLabel.trim() || "TRAILRZ").toUpperCase().slice(0, 20),
          image_url: u,
          description: newDesc.trim().slice(0, 220),
        },
      ].slice(0, 12),
    }));
    setNewUrl("");
    setNewLabel("");
    setNewDesc("");
  };

  const updateSlide = (idx, patch) => {
    setH((cur) => ({
      ...cur,
      slides: cur.slides.map((it, j) => (j === idx ? { ...it, ...patch } : it)),
    }));
  };

  const moveSlide = (idx, dir) => {
    const next = idx + dir;
    if (next < 0 || next >= h.slides.length) return;
    const copy = [...h.slides];
    const [item] = copy.splice(idx, 1);
    copy.splice(next, 0, item);
    setH({ ...h, slides: copy });
    setPreviewIdx(next);
  };

  const removeSlide = (idx) => {
    if (h.slides.length <= 1) {
      toast.error("Keep at least one hero image slide");
      return;
    }
    const nextSlides = h.slides.filter((_, j) => j !== idx);
    setH({ ...h, slides: nextSlides });
    setPreviewIdx((p) => Math.min(p, nextSlides.length - 1));
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await http.put("/admin/hero", h);
      setH(data.hero);
      toast.success("Hero section saved");
    } catch (er) {
      toast.error(errMsg(er));
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = async () => {
    setSaving(true);
    try {
      const { data } = await http.put("/admin/hero", DEFAULT_HERO_CONFIG);
      setH(data.hero);
      setPreviewIdx(0);
      toast.success("Hero section reset to defaults");
    } catch (er) {
      toast.error(errMsg(er));
    } finally {
      setSaving(false);
    }
  };

  const activeSlide = h.slides[previewIdx] || h.slides[0];
  const previewImg = activeSlide?.image_url || "/img/hero.jpg";
  const previewDesc = activeSlide?.description || h.subtext;

  return (
    <div data-testid="admin-hero">
      <PageHead
        title="Hero section"
        sub="Customize the homepage hero headline, tagline, buttons, departure board, and per-image descriptions."
      >
        <button
          type="button"
          onClick={resetDefaults}
          disabled={saving}
          data-testid="hero-reset"
          className="btn-line h-10 text-sm"
        >
          <RotateCcw className="h-4 w-4" aria-hidden /> Reset defaults
        </button>
      </PageHead>

      {/* Live Preview */}
      <div className="relative overflow-hidden bg-black text-parchment border hairline mb-6 p-6 sm:p-8 min-h-[260px] flex flex-col justify-between dark-zone">
        <img
          src={previewImg}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/35" aria-hidden />
        <div className="relative z-10 flex flex-wrap justify-between gap-4 items-start">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#cfc6b6]">
            {h.eyebrow || "Now curating · Chandigarh / Mohali / Panchkula"}
          </p>
          <div className="flex flex-col items-end gap-2">
            {h.show_board && (
              <div className="bg-black/75 border border-[#2a2622] px-3 py-2 text-[10px] font-serial text-beam">
                {h.board_title || "NOW SHOWING"} · {activeSlide?.label || "CANDLELIGHT"}
              </div>
            )}
            {h.slides.length > 1 && (
              <div className="flex gap-1">
                {h.slides.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPreviewIdx(idx)}
                    className={`px-2 py-0.5 text-[10px] border ${
                      idx === previewIdx
                        ? "border-beam bg-beam text-ink font-semibold"
                        : "border-white/25 bg-black/60 text-[#cfc6b6]"
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="relative z-10 mt-8">
          <p className="font-display text-4xl sm:text-5xl leading-[0.88]">
            <span className="block">{h.headline_line_1}</span>
            {h.headline_line_2 && <span className="block sm:pl-12">{h.headline_line_2}</span>}
          </p>
          <div className="mt-4 pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-baseline gap-4">
              {h.tagline && <span className="font-display italic text-beam text-xl">{h.tagline}</span>}
              {previewDesc && <span className="text-xs text-[#cfc6b6] max-w-xs">{previewDesc}</span>}
            </div>
            <div className="flex gap-2">
              <span className="bg-beam text-ink px-3 py-1.5 text-xs font-semibold">{h.primary_cta_label}</span>
              {h.secondary_cta_label && (
                <span className="border border-parchment px-3 py-1.5 text-xs">{h.secondary_cta_label}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={save} className="space-y-4">
        <fieldset className="bg-surface border hairline p-5">
          <legend className="eyebrow px-1">Headline &amp; copy</legend>
          <div className="grid sm:grid-cols-2 gap-4 mt-2">
            <F
              label="Top eyebrow"
              full
              hint="Leave blank to automatically show 'Now curating ·' followed by your supported cities."
            >
              <input
                data-testid="hero-eyebrow"
                className="field bg-surface"
                placeholder="Now curating · Chandigarh / Mohali / Panchkula"
                value={h.eyebrow}
                onChange={(e) => setH({ ...h, eyebrow: e.target.value })}
              />
            </F>
            <F label="Headline line 1">
              <input
                data-testid="hero-line-1"
                required
                maxLength={40}
                className="field bg-surface"
                value={h.headline_line_1}
                onChange={(e) => setH({ ...h, headline_line_1: e.target.value })}
              />
            </F>
            <F label="Headline line 2">
              <input
                data-testid="hero-line-2"
                maxLength={40}
                className="field bg-surface"
                value={h.headline_line_2}
                onChange={(e) => setH({ ...h, headline_line_2: e.target.value })}
              />
            </F>
            <F label="Italic yellow tagline">
              <input
                data-testid="hero-tagline"
                maxLength={80}
                className="field bg-surface"
                value={h.tagline}
                onChange={(e) => setH({ ...h, tagline: e.target.value })}
              />
            </F>
            <F label="Default description (fallback if slide has no description)">
              <input
                data-testid="hero-subtext"
                maxLength={220}
                className="field bg-surface"
                value={h.subtext}
                onChange={(e) => setH({ ...h, subtext: e.target.value })}
              />
            </F>
            <F label="Primary button text">
              <input
                data-testid="hero-primary-label"
                required
                maxLength={40}
                className="field bg-surface"
                value={h.primary_cta_label}
                onChange={(e) => setH({ ...h, primary_cta_label: e.target.value })}
              />
            </F>
            <F label="Primary button link">
              <input
                data-testid="hero-primary-href"
                required
                maxLength={200}
                className="field bg-surface"
                value={h.primary_cta_href}
                onChange={(e) => setH({ ...h, primary_cta_href: e.target.value })}
              />
            </F>
            <F label="Secondary button text (optional)">
              <input
                data-testid="hero-secondary-label"
                maxLength={40}
                className="field bg-surface"
                value={h.secondary_cta_label}
                onChange={(e) => setH({ ...h, secondary_cta_label: e.target.value })}
              />
            </F>
            <F label="Secondary button link">
              <input
                data-testid="hero-secondary-href"
                maxLength={200}
                className="field bg-surface"
                value={h.secondary_cta_href}
                onChange={(e) => setH({ ...h, secondary_cta_href: e.target.value })}
              />
            </F>
          </div>
        </fieldset>

        <fieldset className="bg-surface border hairline p-5">
          <legend className="eyebrow px-1">Departure board</legend>
          <div className="grid sm:grid-cols-3 gap-4 mt-2">
            <label className="sm:col-span-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                data-testid="hero-show-board"
                checked={h.show_board}
                onChange={(e) => setH({ ...h, show_board: e.target.checked })}
              />
              Show split-flap departure board in hero
            </label>
            <F label="Board header">
              <input
                data-testid="hero-board-eyebrow"
                maxLength={60}
                className="field bg-surface"
                value={h.board_eyebrow}
                onChange={(e) => setH({ ...h, board_eyebrow: e.target.value })}
              />
            </F>
            <F label="Top flap line (max 11 chars shown)">
              <input
                data-testid="hero-board-title"
                maxLength={20}
                className="field bg-surface font-serial uppercase"
                value={h.board_title}
                onChange={(e) => setH({ ...h, board_title: e.target.value })}
              />
            </F>
            <F label="Board footnote">
              <input
                data-testid="hero-board-footnote"
                maxLength={120}
                className="field bg-surface"
                value={h.board_footnote}
                onChange={(e) => setH({ ...h, board_footnote: e.target.value })}
              />
            </F>
          </div>
        </fieldset>

        <fieldset className="bg-surface border hairline p-5">
          <legend className="eyebrow px-1">Hero background images &amp; per-image descriptions ({h.slides.length}/12)</legend>
          <p className="text-xs text-mineral mt-1 mb-4">
            Each image has its own departure board label and description. Keep 1 slide for a static hero, or multiple slides to rotate every 3.4 seconds. Remember to click <b>Save hero changes</b> below after editing or uploading.
          </p>

          <div className="space-y-3">
            {h.slides.map((s, idx) => (
              <div
                key={idx}
                data-testid={`hero-slide-${idx}`}
                className="border hairline p-3 bg-parchment/40 space-y-2.5"
              >
                <div className="grid grid-cols-1 md:grid-cols-[88px_180px_1fr_auto] gap-3 items-center">
                  <img
                    src={s.image_url}
                    alt={s.label}
                    onClick={() => setPreviewIdx(idx)}
                    title="Click to preview this slide"
                    className="w-[88px] h-14 object-cover border hairline bg-black cursor-pointer"
                  />
                  <input
                    required
                    maxLength={20}
                    aria-label="Slide flap label"
                    data-testid={`hero-slide-label-${idx}`}
                    value={s.label}
                    onChange={(e) => updateSlide(idx, { label: e.target.value })}
                    placeholder="CANDLELIGHT"
                    className="field h-10 bg-surface font-serial uppercase text-sm"
                  />
                  <input
                    required
                    aria-label="Slide image URL"
                    data-testid={`hero-slide-url-${idx}`}
                    value={s.image_url}
                    onChange={(e) => updateSlide(idx, { image_url: e.target.value })}
                    placeholder="https://... or /img/hero.jpg"
                    className="field h-10 bg-surface text-sm"
                  />
                  <div className="flex items-center gap-1.5">
                    <label className="btn-line h-10 px-3 text-xs cursor-pointer">
                      <Upload className="h-3.5 w-3.5" aria-hidden />
                      {uploadingIdx === idx ? "…" : "Upload"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        className="sr-only"
                        onChange={(e) => replaceSlideImage(idx, e.target.files?.[0])}
                      />
                    </label>
                    <button
                      type="button"
                      aria-label="Move slide up"
                      onClick={() => moveSlide(idx, -1)}
                      disabled={idx === 0}
                      className="btn-line h-10 px-2.5 disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Move slide down"
                      onClick={() => moveSlide(idx, 1)}
                      disabled={idx === h.slides.length - 1}
                      className="btn-line h-10 px-2.5 disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Remove slide"
                      data-testid={`hero-slide-remove-${idx}`}
                      onClick={() => removeSlide(idx)}
                      className="btn-line h-10 px-2.5 text-invalid"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <input
                  aria-label="Image description"
                  data-testid={`hero-slide-desc-${idx}`}
                  maxLength={220}
                  value={s.description || ""}
                  onChange={(e) => updateSlide(idx, { description: e.target.value })}
                  placeholder="Description shown in the hero when this image is active (optional — falls back to default description)"
                  className="field h-10 bg-surface text-sm"
                />
              </div>
            ))}
          </div>

          {h.slides.length < 12 && (
            <div className="mt-4 pt-4 border-t hairline space-y-2.5">
              <div className="flex flex-wrap gap-2 items-center">
                <label className="btn-line h-10 text-sm cursor-pointer">
                  <Upload className="h-4 w-4" aria-hidden />
                  {uploadingIdx === "new" ? "Uploading…" : "Upload new image"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    multiple
                    className="sr-only"
                    data-testid="hero-upload-new"
                    onChange={(e) => addSlideFromUpload([...(e.target.files || [])])}
                  />
                </label>
                <span className="text-xs text-mineral">or</span>
                <input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Label (e.g. JAZZ NIGHT)"
                  maxLength={20}
                  className="field h-10 text-sm w-44 bg-surface font-serial uppercase"
                />
                <input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="Paste https:// image URL"
                  data-testid="hero-new-url"
                  className="field h-10 text-sm flex-1 min-w-[200px] bg-surface"
                />
                <button
                  type="button"
                  onClick={addSlideFromUrl}
                  data-testid="hero-add-slide"
                  className="btn-line h-10 text-sm"
                >
                  <Plus className="h-4 w-4" aria-hidden /> Add slide
                </button>
              </div>
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Description for new image (optional)"
                maxLength={220}
                data-testid="hero-new-desc"
                className="field h-10 text-sm bg-surface"
              />
            </div>
          )}
        </fieldset>

        <div>
          <button type="submit" disabled={saving} data-testid="hero-save" className="btn-ink h-11 px-6 text-sm">
            {saving ? "Saving…" : "Save hero changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
