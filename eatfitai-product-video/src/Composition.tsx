import type { ReactNode } from "react";
import { Audio, Video } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const FPS = 30;
export const DURATION_IN_FRAMES = 50 * FPS;

const colors = {
  bg: "#04100d",
  ink: "#f7fff9",
  muted: "#c6d3cf",
  line: "rgba(255,255,255,0.16)",
  glass: "rgba(5,14,18,0.68)",
  green: "#39e878",
  mint: "#99ffc4",
  cyan: "#43d5ff",
  yellow: "#ffd166",
  coral: "#ff7a66",
};

const sec = (value: number) => Math.round(value * FPS);
const ease = Easing.bezier(0.16, 1, 0.3, 1);

const clamp = (frame: number, input: [number, number], output: [number, number]) =>
  interpolate(frame, input, output, {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const musicVolume = (frame: number) => {
  const intro = interpolate(frame, [0, sec(0.8)], [0, 0.82], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outro = interpolate(frame, [DURATION_IN_FRAMES - sec(2.4), DURATION_IN_FRAMES], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const voiceDucking = interpolate(frame, [sec(0.8), sec(1.8), sec(43), sec(48.5)], [0.78, 0.46, 0.46, 0.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return intro * outro * voiceDucking;
};

const voiceVolume = (frame: number) => {
  const intro = interpolate(frame, [0, sec(0.18)], [0, 0.96], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outro = interpolate(frame, [DURATION_IN_FRAMES - sec(1.2), DURATION_IN_FRAMES], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return intro * outro;
};

const sfxCues = [
  { from: 7.4, duration: 0.2, file: "tap.wav", volume: 0.38 },
  { from: 14.2, duration: 0.2, file: "tap.wav", volume: 0.34 },
  { from: 23.6, duration: 0.42, file: "camera-shutter.wav", volume: 0.5 },
  { from: 28.2, duration: 0.72, file: "success-ting.wav", volume: 0.42 },
  { from: 35.4, duration: 0.34, file: "soft-pop.wav", volume: 0.4 },
  { from: 40.4, duration: 0.72, file: "success-ting.wav", volume: 0.3 },
];

type Stage = "left" | "right" | "center";

type Scene = {
  start: number;
  duration: number;
  eyebrow: string;
  title: string;
  caption: string;
  metric: string;
  clip: string;
  trim?: number;
  speed?: number;
  accent: string;
  mochi: string;
  stage: Stage;
};

const scenes: Scene[] = [
  {
    start: 7,
    duration: 6,
    eyebrow: "TRANG CHỦ",
    title: "Mochi theo dõi mỗi ngày",
    caption: "Theo dõi nước, bữa ăn hôm nay và mục tiêu sức khỏe ngay trên màn hình chính.",
    metric: "Nước + bữa ăn",
    clip: "01-home-mochi-dashboard.mp4",
    trim: 1,
    speed: 1.48,
    accent: colors.green,
    mochi: "meal-coach.png",
    stage: "right",
  },
  {
    start: 13,
    duration: 5,
    eyebrow: "TÌM KIẾM",
    title: "Món yêu thích trong vài giây",
    caption: "Tìm món, lưu lại và tra cứu nhanh khi cần.",
    metric: "Tìm → lưu",
    clip: "02-menu-search-save.mp4",
    trim: 1,
    speed: 1.85,
    accent: colors.yellow,
    mochi: "meal-coach.png",
    stage: "left",
  },
  {
    start: 18,
    duration: 5,
    eyebrow: "CÔNG THỨC",
    title: "Gợi ý hợp mục tiêu",
    caption: "Công thức nấu ăn phù hợp với khẩu vị và mục tiêu dinh dưỡng của bạn.",
    metric: "Recipe AI",
    clip: "03-recipe-suggestions.mp4",
    trim: 7,
    speed: 1.72,
    accent: colors.mint,
    mochi: "meal-coach.png",
    stage: "center",
  },
  {
    start: 23,
    duration: 5,
    eyebrow: "AI SCAN",
    title: "Quét món ăn tự nhiên",
    caption: "Nhận diện món bằng camera, tính calo và dinh dưỡng ngay lập tức.",
    metric: "Camera scan",
    clip: "04a-scan-entry-clean.mp4",
    trim: 0.6,
    speed: 1.38,
    accent: colors.cyan,
    mochi: "scan-thinking.png",
    stage: "left",
  },
  {
    start: 28,
    duration: 7,
    eyebrow: "AI NHẬN DIỆN",
    title: "Calo hiện ra tức thì",
    caption: "Món ăn, độ tin cậy và thông tin dinh dưỡng được gom vào một màn hình review.",
    metric: "Calo + dinh dưỡng",
    clip: "04b-scan-result-clean.mp4",
    speed: 1.55,
    accent: colors.cyan,
    mochi: "scan-success.png",
    stage: "right",
  },
  {
    start: 35,
    duration: 5,
    eyebrow: "THAO TÁC NHANH",
    title: "Tất cả trong một chạm",
    caption: "Thêm bữa ăn, quét mã vạch và xem lịch sử nhanh hơn.",
    metric: "Quick actions",
    clip: "04c-scan-review.mp4",
    trim: 1.2,
    speed: 1.45,
    accent: colors.green,
    mochi: "scan-success.png",
    stage: "left",
  },
  {
    start: 40,
    duration: 5,
    eyebrow: "THỐNG KÊ",
    title: "Theo dõi tiến bộ",
    caption: "Biểu đồ calo, macro và xu hướng sức khỏe theo tuần.",
    metric: "Weekly progress",
    clip: "05-stats-progress.mp4",
    trim: 2,
    speed: 1.72,
    accent: colors.mint,
    mochi: "weekly-report.png",
    stage: "center",
  },
];

const BrandBar = ({ accent }: { accent: string }) => {
  const frame = useCurrentFrame();
  const glow = 0.55 + Math.sin(frame / 18) * 0.2;
  return (
    <div
      style={{
        position: "absolute",
        left: 56,
        right: 56,
        top: 38,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        color: colors.ink,
        fontWeight: 900,
        fontSize: 23,
        letterSpacing: 0.2,
        zIndex: 30,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Img src={staticFile("assets/icon.png")} style={{ width: 48, height: 48, borderRadius: 15 }} />
        EatFitAI
      </div>
      <div
        style={{
          color: colors.ink,
          fontSize: 18,
          fontWeight: 850,
          padding: "10px 16px",
          borderRadius: 999,
          border: `1px solid ${accent}`,
          background: `rgba(57,232,120,${glow * 0.12})`,
          boxShadow: `0 0 34px ${accent}33`,
        }}
      >
        Public APK v1 · footage thật
      </div>
    </div>
  );
};

const ClipBackdrop = ({ scene }: { scene: Scene }) => {
  const frame = useCurrentFrame();
  const zoom = clamp(frame, [0, sec(scene.duration)], [1, 1.13]);
  const pan = Math.sin(frame / 36) * 24;
  return (
    <AbsoluteFill style={{ background: colors.bg, overflow: "hidden" }}>
      <Video
        src={staticFile(`v1-footage/${scene.clip}`)}
        muted
        loop
        objectFit="cover"
        trimBefore={sec(scene.trim ?? 0)}
        playbackRate={scene.speed ?? 1}
        style={{
          position: "absolute",
          inset: -90,
          width: 2100,
          height: 1260,
          filter: "blur(34px) saturate(1.35)",
          opacity: 0.36,
          transform: `scale(${zoom}) translate(${pan}px, ${-pan * 0.35}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(4,16,13,0.95) 0%, rgba(4,16,13,0.62) 42%, rgba(4,16,13,0.86) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: -140,
          background: `radial-gradient(circle at 24% 24%, ${scene.accent}45, transparent 28%), radial-gradient(circle at 76% 72%, ${scene.accent}34, transparent 32%)`,
          filter: "blur(42px)",
          opacity: 0.78,
          transform: `rotate(${frame * 0.05}deg)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.25), transparent 34%, rgba(0,0,0,0.42))",
        }}
      />
    </AbsoluteFill>
  );
};

const phoneLayout = (stage: Stage) => {
  if (stage === "left") return { startX: 110, endX: 160, y: 76, rotate: -4, w: 492, h: 960 };
  if (stage === "right") return { startX: 1320, endX: 1248, y: 74, rotate: 4, w: 492, h: 960 };
  return { startX: 728, endX: 728, y: 60, rotate: -1.5, w: 464, h: 944 };
};

const PhoneFrame = ({
  scene,
  compact = false,
  delay = 0,
}: {
  scene: Scene;
  compact?: boolean;
  delay?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: { damping: 18, stiffness: 120, mass: 0.9 },
  });
  const layout = phoneLayout(scene.stage);
  const sceneProgress = clamp(frame, [0, sec(scene.duration)], [0, 1]);
  const x = interpolate(sceneProgress, [0, 1], [layout.startX, layout.endX]);
  const float = Math.sin(frame / 19) * 8;
  const width = compact ? 322 : layout.w;
  const height = compact ? 705 : layout.h;
  const scale = compact ? 1 : 0.96 + enter * 0.04;

  return (
    <div
      style={{
        position: "absolute",
        left: compact ? undefined : x,
        right: compact ? 92 : undefined,
        top: compact ? 136 : layout.y + float,
        width,
        height,
        borderRadius: compact ? 42 : 64,
        padding: compact ? 10 : 14,
        background: "linear-gradient(145deg, #22332d, #020706)",
        border: `1px solid ${colors.line}`,
        boxShadow: `0 46px 120px rgba(0,0,0,0.55), 0 0 80px ${scene.accent}22`,
        transform: `translateY(${(1 - enter) * 90}px) rotate(${layout.rotate + Math.sin(frame / 45) * 1.2}deg) scale(${scale})`,
        opacity: enter,
        zIndex: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: compact ? 34 : 50,
          overflow: "hidden",
          background: "#050b10",
        }}
      >
        <Video
          src={staticFile(`v1-footage/${scene.clip}`)}
          muted
          objectFit="cover"
          trimBefore={sec(scene.trim ?? 0)}
          playbackRate={scene.speed ?? 1}
          style={{
            width: "100%",
            height: "100%",
          }}
        />
      </div>
    </div>
  );
};

const GhostPhone = ({ scene, x, y, rotate }: { scene: Scene; x: number; y: number; rotate: number }) => {
  const frame = useCurrentFrame();
  const show = clamp(frame, [16, 30], [0, 1]);
  return (
    <div
      style={{
        position: "absolute",
        left: x + Math.sin(frame / 28) * 12,
        top: y + Math.cos(frame / 34) * 10,
        width: 250,
        height: 520,
        borderRadius: 42,
        overflow: "hidden",
        opacity: show * 0.42,
        transform: `rotate(${rotate}deg)`,
        filter: "saturate(0.9)",
        border: `1px solid ${colors.line}`,
        zIndex: 5,
      }}
    >
      <Video
        src={staticFile(`v1-footage/${scene.clip}`)}
        muted
        loop
        objectFit="cover"
        trimBefore={sec(scene.trim ?? 0)}
        playbackRate={(scene.speed ?? 1) * 1.2}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
};

const KineticTitle = ({ children, accent }: { children: string; accent: string }) => {
  const frame = useCurrentFrame();
  const words = children.split(" ");
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0 18px" }}>
      {words.map((word, index) => {
        const show = clamp(frame, [5 + index * 3, 18 + index * 3], [0, 1]);
        return (
          <span
            key={`${word}-${index}`}
            style={{
              display: "inline-block",
              color: colors.ink,
              fontSize: 78,
              lineHeight: 0.98,
              fontWeight: 980,
              letterSpacing: -3.2,
              textShadow: `0 0 30px ${accent}22`,
              opacity: show,
              transform: `translateY(${(1 - show) * 44}px) rotate(${(1 - show) * -3}deg)`,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

const Caption = ({ scene }: { scene: Scene }) => {
  const frame = useCurrentFrame();
  const show = clamp(frame, [12, 28], [0, 1]);
  const left = scene.stage === "right" ? 110 : scene.stage === "left" ? 840 : 110;
  const top = scene.stage === "center" ? 656 : 214;
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: scene.stage === "center" ? 660 : 720,
        zIndex: 22,
      }}
    >
      <div
        style={{
          color: scene.accent,
          fontSize: 22,
          fontWeight: 950,
          letterSpacing: 4,
          marginBottom: 18,
          opacity: show,
        }}
      >
        {scene.eyebrow}
      </div>
      <KineticTitle accent={scene.accent}>{scene.title}</KineticTitle>
      <div
        style={{
          marginTop: 24,
          padding: "20px 24px",
          borderRadius: 30,
          background: colors.glass,
          border: `1px solid ${colors.line}`,
          backdropFilter: "blur(18px)",
          color: colors.muted,
          fontSize: 28,
          lineHeight: 1.28,
          fontWeight: 720,
          opacity: show,
          transform: `translateY(${(1 - show) * 22}px)`,
        }}
      >
        {scene.caption}
      </div>
    </div>
  );
};

const FloatingChip = ({
  children,
  accent,
  x,
  y,
  delay,
}: {
  children: ReactNode;
  accent: string;
  x: number;
  y: number;
  delay: number;
}) => {
  const frame = useCurrentFrame();
  const show = clamp(frame, [delay, delay + 12], [0, 1]);
  return (
    <div
      style={{
        position: "absolute",
        left: x + Math.sin((frame + delay) / 18) * 10,
        top: y + Math.cos((frame + delay) / 22) * 9,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 18px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.1)",
        border: `1px solid ${colors.line}`,
        color: colors.ink,
        fontSize: 21,
        fontWeight: 900,
        opacity: show,
        transform: `scale(${0.86 + show * 0.14})`,
        zIndex: 24,
        boxShadow: `0 18px 50px ${accent}22`,
      }}
    >
      <span style={{ width: 12, height: 12, borderRadius: 999, background: accent }} />
      {children}
    </div>
  );
};

const MoChiSticker = ({ scene }: { scene: Scene }) => {
  const frame = useCurrentFrame();
  const show = clamp(frame, [18, 32], [0, 1]);
  const left = scene.stage === "right" ? 96 : scene.stage === "left" ? 1580 : 1450;
  const top = scene.stage === "center" ? 612 : 720;
  return (
    <div
      style={{
        position: "absolute",
        left,
        top: top + Math.sin(frame / 9) * 10,
        width: 194,
        height: 194,
        borderRadius: 44,
        padding: 8,
        background: "rgba(255,255,255,0.08)",
        border: `1px solid ${colors.line}`,
        boxShadow: `0 28px 70px ${scene.accent}33`,
        opacity: show,
        transform: `scale(${0.75 + show * 0.25}) rotate(${Math.sin(frame / 17) * 4}deg)`,
        zIndex: 28,
      }}
    >
      <Img src={staticFile(`mochi/${scene.mochi}`)} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
  );
};

const SceneBlock = ({ scene }: { scene: Scene }) => {
  const frame = useCurrentFrame();
  const exit = clamp(frame, [sec(scene.duration) - 12, sec(scene.duration)], [1, 0]);
  const chipX = scene.stage === "right" ? 112 : scene.stage === "left" ? 846 : 1020;
  const ghostX = scene.stage === "right" ? 1040 : 600;

  return (
    <AbsoluteFill style={{ opacity: exit }}>
      <ClipBackdrop scene={scene} />
      <BrandBar accent={scene.accent} />
      <GhostPhone scene={scene} x={ghostX} y={132} rotate={scene.stage === "left" ? 8 : -8} />
      <PhoneFrame scene={scene} />
      <Caption scene={scene} />
      <FloatingChip accent={scene.accent} x={chipX} y={790} delay={30}>
        {scene.metric}
      </FloatingChip>
      <FloatingChip accent={colors.green} x={chipX + 245} y={856} delay={40}>
        MoChi dẫn luồng
      </FloatingChip>
      <MoChiSticker scene={scene} />
    </AbsoluteFill>
  );
};

const MiniPhone = ({
  scene,
  x,
  y,
  rotate,
  delay,
}: {
  scene: Scene;
  x: number;
  y: number;
  rotate: number;
  delay: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 16, stiffness: 110 } });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + Math.sin((frame + delay) / 24) * 10,
        width: 292,
        height: 620,
        borderRadius: 46,
        padding: 10,
        background: "#07110e",
        border: `1px solid ${colors.line}`,
        boxShadow: "0 34px 90px rgba(0,0,0,0.45)",
        transform: `scale(${0.78 + pop * 0.22}) rotate(${rotate}deg)`,
        opacity: pop,
        overflow: "hidden",
      }}
    >
      <div style={{ width: "100%", height: "100%", borderRadius: 38, overflow: "hidden" }}>
        <Video
          src={staticFile(`v1-footage/${scene.clip}`)}
          muted
          objectFit="cover"
          trimBefore={sec(scene.trim ?? 0)}
          playbackRate={scene.speed ?? 1}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
};

const Intro = () => {
  const frame = useCurrentFrame();
  const show = clamp(frame, [8, 28], [0, 1]);
  const scene = scenes[0];
  return (
    <AbsoluteFill>
      <ClipBackdrop scene={scene} />
      <BrandBar accent={colors.green} />
      <MiniPhone scene={scenes[1]} x={1110} y={180} rotate={-8} delay={6} />
      <MiniPhone scene={scenes[3]} x={1370} y={110} rotate={5} delay={14} />
      <MiniPhone scene={scenes[6]} x={890} y={250} rotate={3} delay={22} />
      <div
        style={{
          position: "absolute",
          left: 96,
          top: 190,
          width: 850,
          zIndex: 20,
          opacity: show,
          transform: `translateY(${(1 - show) * 42}px)`,
        }}
      >
        <div style={{ color: colors.green, fontSize: 29, fontWeight: 950, letterSpacing: 5, marginBottom: 22 }}>
          ĂN ĐÚNG MỤC TIÊU
        </div>
        <div style={{ color: colors.ink, fontSize: 108, lineHeight: 0.92, fontWeight: 980, letterSpacing: -5 }}>
          Scan nhanh.
          <br />
          Ghi bữa gọn.
          <br />
          Theo dõi rõ.
        </div>
        <div
          style={{
            marginTop: 32,
            color: colors.muted,
            fontSize: 32,
            lineHeight: 1.25,
            fontWeight: 780,
          }}
        >
          Ứng dụng AI dinh dưỡng thông minh.
        </div>
      </div>
      <Img
        src={staticFile("mochi/meal-coach.png")}
        style={{
          position: "absolute",
          left: 690 + Math.sin(frame / 12) * 10,
          bottom: 86 + Math.cos(frame / 9) * 10,
          width: 250,
          height: 250,
          objectFit: "contain",
          transform: `rotate(${Math.sin(frame / 16) * 5}deg)`,
          zIndex: 25,
        }}
      />
    </AbsoluteFill>
  );
};

const Closing = () => {
  const frame = useCurrentFrame();
  const show = clamp(frame, [4, 24], [0, 1]);
  const scene = scenes[6];
  return (
    <AbsoluteFill>
      <ClipBackdrop scene={scene} />
      <BrandBar accent={colors.green} />
      <MiniPhone scene={scenes[1]} x={106} y={246} rotate={-6} delay={6} />
      <MiniPhone scene={scenes[2]} x={390} y={146} rotate={4} delay={14} />
      <MiniPhone scene={scenes[4]} x={674} y={242} rotate={-3} delay={22} />
      <MiniPhone scene={scenes[6]} x={1415} y={170} rotate={5} delay={30} />
      <div
        style={{
          position: "absolute",
          left: 960,
          top: 208,
          width: 790,
          color: colors.ink,
          opacity: show,
          transform: `translateY(${(1 - show) * 34}px)`,
          zIndex: 30,
        }}
      >
        <div style={{ color: colors.green, fontSize: 25, fontWeight: 950, letterSpacing: 4 }}>V1 READY</div>
        <h2 style={{ margin: "24px 0 0", fontSize: 82, lineHeight: 0.98, fontWeight: 980, letterSpacing: -3 }}>
          Ăn khỏe.
          <br />
          Sống tốt.
        </h2>
        <div style={{ display: "flex", gap: 14, marginTop: 32, flexWrap: "wrap" }}>
          {["Thực đơn", "Gợi ý món", "Scan AI", "Thống kê", "MoChi"].map((item, index) => (
            <FloatingChip
              key={item}
              accent={[colors.green, colors.yellow, colors.cyan, colors.mint, colors.coral][index]}
              x={960 + (index % 2) * 250}
              y={580 + Math.floor(index / 2) * 76}
              delay={28 + index * 4}
            >
              {item}
            </FloatingChip>
          ))}
        </div>
      </div>
      <Img
        src={staticFile("mochi/scan-success.png")}
        style={{
          position: "absolute",
          right: 100,
          bottom: 72 + Math.sin(frame / 11) * 10,
          width: 250,
          height: 250,
          objectFit: "contain",
          zIndex: 36,
        }}
      />
    </AbsoluteFill>
  );
};

export const EatFitAIProductIntro = () => {
  return (
    <AbsoluteFill style={{ fontFamily: "Inter, Segoe UI, Arial, sans-serif", background: colors.bg }}>
      <Audio src={staticFile("audio/eatfitai-beat.wav")} loop volume={musicVolume} />
      <Audio src={staticFile("audio/eatfitai-voice-final.mp3")} volume={voiceVolume} />
      {sfxCues.map((cue) => (
        <Sequence key={`${cue.file}-${cue.from}`} from={sec(cue.from)} durationInFrames={sec(cue.duration)}>
          <Audio src={staticFile(`audio/sfx/${cue.file}`)} volume={() => cue.volume} />
        </Sequence>
      ))}
      <Sequence durationInFrames={sec(7)}>
        <Intro />
      </Sequence>
      {scenes.map((scene) => (
        <Sequence
          key={`${scene.start}-${scene.title}`}
          from={sec(scene.start)}
          durationInFrames={sec(scene.duration)}
          premountFor={FPS}
        >
          <SceneBlock scene={scene} />
        </Sequence>
      ))}
      <Sequence from={sec(45)} durationInFrames={sec(5)} premountFor={FPS}>
        <Closing />
      </Sequence>
    </AbsoluteFill>
  );
};
