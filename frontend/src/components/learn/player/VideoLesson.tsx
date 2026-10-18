"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { Icon, IconButton } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { LessonContent, VideoView } from "@/lib/types";

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * The design's dark 16:9 player with its custom controls, driving a real <video>. HLS (Mux) plays natively on
 * Safari and through hls.js elsewhere. The resume position is saved every 15 seconds and on pause.
 */
export function VideoLesson({ lesson, cover, section, onEnded }: { lesson: LessonContent; cover: string | null; section: string; onEnded: () => void }) {
  const video = useQuery({
    queryKey: ["video", lesson.id],
    queryFn: () => api.get<VideoView>(`/me/lessons/${lesson.id}/video`),
    retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 2,
  });
  const el = useRef<HTMLVideoElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(lesson.positionSeconds);
  const [total, setTotal] = useState(lesson.durationMinutes * 60);
  const [captions, setCaptions] = useState(false);
  const saved = useRef(lesson.positionSeconds);

  const url = video.data?.status === "READY" ? video.data.streamUrl : null;

  // Attach the source (hls.js only when the browser can't play HLS itself).
  useEffect(() => {
    const v = el.current;
    if (!v || !url) return;
    let hls: { destroy(): void } | undefined;
    const isHls = url.includes(".m3u8");
    if (isHls && !v.canPlayType("application/vnd.apple.mpegurl")) {
      import("hls.js").then(({ default: Hls }) => {
        if (!Hls.isSupported()) return;
        const h = new Hls();
        h.loadSource(url);
        h.attachMedia(v);
        hls = h;
      });
    } else {
      v.src = url;
    }
    const resume = () => {
      if (lesson.positionSeconds > 5 && lesson.positionSeconds < (v.duration || Infinity) - 5) v.currentTime = lesson.positionSeconds;
    };
    v.addEventListener("loadedmetadata", resume, { once: true });
    return () => {
      v.removeEventListener("loadedmetadata", resume);
      hls?.destroy();
    };
  }, [url, lesson.positionSeconds]);

  const save = (seconds: number) => {
    if (Math.abs(seconds - saved.current) < 5) return;
    saved.current = seconds;
    api.put(`/me/lessons/${lesson.id}/position`, { seconds: Math.floor(seconds) }).catch(() => undefined);
  };

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => el.current && save(el.current.currentTime), 15_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- save only reads refs
  }, [playing]);

  const toggle = () => {
    const v = el.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => undefined);
    else v.pause();
  };

  if (video.isLoading) return <div className="ob-skeleton" style={{ aspectRatio: "16/9", borderRadius: 20 }} aria-hidden />;

  const pct = total ? Math.min(100, (current / total) * 100) : 0;
  const unavailable = !url;
  return (
    <div ref={frame} style={{ aspectRatio: "16/9", borderRadius: 20, background: "var(--ink-950)", position: "relative", overflow: "hidden", display: "grid", placeItems: "center" }}>
      <video
        ref={el}
        playsInline
        preload="metadata"
        poster={video.data?.thumbnailUrl ?? cover ?? undefined}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false);
          if (el.current) save(el.current.currentTime);
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setTotal(e.currentTarget.duration || total)}
        onEnded={() => {
          setPlaying(false);
          save(0);
          onEnded();
        }}
        onClick={toggle}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: playing ? 1 : 0.55, transition: "opacity 360ms" }}
      >
        {captions && <track kind="captions" default />}
      </video>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: playing ? "transparent" : "linear-gradient(rgba(14,16,36,.35), transparent 30%, transparent 60%, rgba(14,16,36,.8))", transition: "background 360ms" }} />
      <div style={{ position: "absolute", left: 28, top: 24, color: "rgba(255,255,255,.7)", font: "500 13px var(--font-body)", pointerEvents: "none" }}>{section}</div>
      {unavailable ? (
        <div style={{ position: "relative", textAlign: "center", color: "#fff" }}>
          <Icon name="monitor-play" size={36} />
          <div style={{ font: "600 15px var(--font-display)", marginTop: 10 }}>{video.data?.status === "PROCESSING" || video.data?.status === "WAITING_UPLOAD" ? "This video is still processing" : "No video for this lesson yet"}</div>
          {lesson.content && <div style={{ color: "var(--ink-300)", fontSize: 13, marginTop: 4, maxWidth: 420 }}>{lesson.content}</div>}
        </div>
      ) : (
        !playing && <IconButton icon="play" label="Play" variant="primary" round size="lg" onClick={toggle} style={{ width: 72, height: 72, position: "relative" }} />
      )}
      {!unavailable && (
        <div className="flex items-center gap-3.5" style={{ position: "absolute", left: 20, right: 20, bottom: 16, color: "#fff", font: "500 12px var(--font-mono)" }}>
          <button type="button" aria-label={playing ? "Pause" : "Play"} onClick={toggle} style={{ background: "none", border: 0, color: "#fff", cursor: "pointer", padding: 0, display: "grid" }}>
            <Icon name={playing ? "pause" : "play"} size={18} />
          </button>
          <span>{fmt(current)}</span>
          <div
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.round(total)}
            aria-valuenow={Math.round(current)}
            tabIndex={0}
            onKeyDown={(e) => {
              const v = el.current;
              if (!v) return;
              if (e.key === "ArrowRight") v.currentTime = Math.min(total, v.currentTime + 5);
              if (e.key === "ArrowLeft") v.currentTime = Math.max(0, v.currentTime - 5);
            }}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              if (el.current) el.current.currentTime = ((e.clientX - r.left) / r.width) * total;
            }}
            style={{ flex: 1, height: 6, borderRadius: 4, background: "rgba(255,255,255,.2)", cursor: "pointer" }}
          >
            <div style={{ width: pct + "%", height: "100%", borderRadius: 4, background: "var(--coral-500)" }} />
          </div>
          <span>{fmt(total)}</span>
          <button type="button" aria-label="Captions" aria-pressed={captions} onClick={() => setCaptions((c) => !c)} style={{ background: "none", border: 0, color: captions ? "var(--coral-400)" : "#fff", cursor: "pointer", padding: 0, display: "grid" }}>
            <Icon name="captions" size={18} />
          </button>
          <button type="button" aria-label="Full screen" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : frame.current?.requestFullscreen())} style={{ background: "none", border: 0, color: "#fff", cursor: "pointer", padding: 0, display: "grid" }}>
            <Icon name="maximize" size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
