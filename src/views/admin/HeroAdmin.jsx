"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useStaff } from "@/views/admin/AdminLayout";
import { errMsg } from "@/lib/api";
import { DEFAULT_HERO_CONFIG } from "@/lib/hero";
import { PageHead } from "@/components/admin/AdminKit";
import { Loading, ErrorState } from "@/components/common/States";

export default function HeroAdmin() {
  const { http } = useStaff();
  const [h, setH] = useState(null);
  const [err, setErr] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState(null);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [newUrl, setNewUrl] = useState("");
  const [newLine1, setNewLine1] = useState("NOW SHOWING");
  const [newLine2, setNewLine2] = useState("");
  const [newLine3, setNewLine3] = useState("CHANDIGARH");

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
      updateSlide(idx, { image_url: url });
      toast.success("Image uploaded — click Save to publish");
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
        const fallback =
          file.name
            .replace(/\.[^.]+$/, "")
            .replace(/[-_]+/g, " ")
            .toUpperCase()
            .slice(0, 11) || "TRAILRZ";
        uploaded.push({
          image_url: url,
          line_1: (newLine1.trim() || "NOW SHOWING").toUpperCase().slice(0, 11),
          line_2: (newLine2.trim() || fallback).toUpperCase().slice(0, 11),
          line_3: newLine3.trim().toUpperCase().slice(0, 11),
        });
      }
      setH((cur) => ({
        ...cur,
        slides: [...cur.slides, ...uploaded].slice(0, 12),
      }));
      setNewLine2("");
      toast.success(`${uploaded.length} slide(s) added — click Save to publish`);
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
          image_url: u,
          line_1: (newLine1.trim() || "NOW SHOWING").toUpperCase().slice(0, 11),
          line_2: (newLine2.trim() || "TRAILRZ").toUpperCase().slice(0, 11),
          line_3: newLine3.trim().toUpperCase().slice(0, 11),
        },
      ].slice(0, 12),
    }));
    setNewUrl("");
    setNewLine2("");
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
      toast.error("Keep at least one slide");
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
      toast.success("Hero slides saved");
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
      toast.success("Hero slides reset to defaults");
    } catch (er) {
      toast.error(errMsg(er));
    } finally {
      setSaving(false);
    }
  };

  const activeSlide = h.slides[previewIdx] || h.slides[0];
  const pad = (s) => (s || "").toUpperCase().padEnd(11, " ").slice(0, 11);

  return (
    <div data-testid="admin-hero">
      <PageHead
        title="Hero section"
        sub="Set each hero background image and its 3 departure board lines (max 11 characters per line)."
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

      {/* Preview matching the homepage hero & board */}
      <div className="relative overflow-hidden bg-black text-parchment border hairline mb-6 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 min-h-[210px] dark-zone">
        <img
          src={activeSlide?.image_url || "/img/hero.jpg"}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/35" aria-hidden />

        <div className="relative z-10 flex flex-wrap gap-1.5">
          {h.slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setPreviewIdx(idx)}
              className={`px-2.5 py-1 text-xs border ${
                idx === previewIdx
                  ? "border-beam bg-beam text-ink font-semibold"
                  : "border-white/25 bg-black/65 text-[#cfc6b6]"
              }`}
            >
              Slide {idx + 1}
            </button>
          ))}
        </div>

        <div className="relative z-10 bg-black/80 border border-[#2a2622] p-3 space-y-1">
          {[activeSlide?.line_1 || "NOW SHOWING", activeSlide?.line_2 || "", activeSlide?.line_3 || ""].map(
            (row, ri) => (
              <div key={ri} className="flex gap-[2px]">
                {pad(row)
                  .split("")
                  .map((ch, ci) => (
                    <span
                      key={ci}
                      className="inline-flex items-center justify-center w-6 h-8 bg-[#0c0b0a] border border-[#2a2622] font-serial text-beam text-sm leading-none"
                    >
                      {ch === " " ? "\u00a0" : ch}
                    </span>
                  ))}
              </div>
            )
          )}
        </div>
      </div>

      <form onSubmit={save} className="space-y-4">
        <fieldset className="bg-surface border hairline p-5">
          <legend className="eyebrow px-1">Images &amp; board lines ({h.slides.length}/12)</legend>

          <div className="space-y-3 mt-2">
            {h.slides.map((s, idx) => (
              <div
                key={idx}
                data-testid={`hero-slide-${idx}`}
                className="border hairline p-3 bg-parchment/40 grid grid-cols-1 lg:grid-cols-[88px_1fr_auto] gap-3 items-center"
              >
                <img
                  src={s.image_url}
                  alt={s.line_2}
                  onClick={() => setPreviewIdx(idx)}
                  title="Preview this slide"
                  className="w-[88px] h-14 object-cover border hairline bg-black cursor-pointer"
                />

                <div className="grid sm:grid-cols-3 gap-2">
                  <input
                    required
                    maxLength={11}
                    aria-label="Line 1"
                    data-testid={`hero-slide-line1-${idx}`}
                    value={s.line_1}
                    onChange={(e) => updateSlide(idx, { line_1: e.target.value.toUpperCase() })}
                    placeholder="NOW SHOWING"
                    className="field h-10 bg-surface font-serial uppercase text-sm"
                  />
                  <input
                    required
                    maxLength={11}
                    aria-label="Line 2"
                    data-testid={`hero-slide-line2-${idx}`}
                    value={s.line_2}
                    onChange={(e) => updateSlide(idx, { line_2: e.target.value.toUpperCase() })}
                    placeholder="THEATRE"
                    className="field h-10 bg-surface font-serial uppercase text-sm"
                  />
                  <input
                    maxLength={11}
                    aria-label="Line 3"
                    data-testid={`hero-slide-line3-${idx}`}
                    value={s.line_3}
                    onChange={(e) => updateSlide(idx, { line_3: e.target.value.toUpperCase() })}
                    placeholder="MOHALI"
                    className="field h-10 bg-surface font-serial uppercase text-sm"
                  />
                  <input
                    required
                    aria-label="Image URL"
                    data-testid={`hero-slide-url-${idx}`}
                    value={s.image_url}
                    onChange={(e) => updateSlide(idx, { image_url: e.target.value })}
                    placeholder="https://... or /img/hero.jpg"
                    className="sm:col-span-3 field h-10 bg-surface text-sm"
                  />
                </div>

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
            ))}
          </div>

          {h.slides.length < 12 && (
            <div className="mt-4 pt-4 border-t hairline space-y-2.5">
              <div className="grid sm:grid-cols-3 gap-2">
                <input
                  value={newLine1}
                  onChange={(e) => setNewLine1(e.target.value.toUpperCase())}
                  placeholder="Line 1 (NOW SHOWING)"
                  maxLength={11}
                  className="field h-10 text-sm bg-surface font-serial uppercase"
                />
                <input
                  value={newLine2}
                  onChange={(e) => setNewLine2(e.target.value.toUpperCase())}
                  placeholder="Line 2 (THEATRE)"
                  maxLength={11}
                  className="field h-10 text-sm bg-surface font-serial uppercase"
                />
                <input
                  value={newLine3}
                  onChange={(e) => setNewLine3(e.target.value.toUpperCase())}
                  placeholder="Line 3 (MOHALI)"
                  maxLength={11}
                  className="field h-10 text-sm bg-surface font-serial uppercase"
                />
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <label className="btn-line h-10 text-sm cursor-pointer">
                  <Upload className="h-4 w-4" aria-hidden />
                  {uploadingIdx === "new" ? "Uploading…" : "Upload image"}
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
