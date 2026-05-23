import type { ReactNode } from "react";
import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

export const FPS = 30;
export const DURATION_IN_FRAMES = 72 * FPS;

const colors = {
  bg: "#07120f",
  bg2: "#101629",
  panel: "rgba(255,255,255,0.08)",
  line: "rgba(255,255,255,0.15)",
  text: "#f7fff9",
  muted: "#b9c7c1",
  green: "#24d36b",
  greenSoft: "#8ff2bf",
  blue: "#33c7ff",
  yellow: "#ffd166",
  coral: "#ff7a59",
};

const sec = (value: number) => Math.round(value * FPS);
const ease = Easing.bezier(0.16, 1, 0.3, 1);

const clamp = (frame: number, input: [number, number], output: [number, number]) =>
  interpolate(frame, input, output, {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const fadeVolume = (frame: number) => {
  const intro = interpolate(frame, [0, 60], [0, 0.62], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outro = interpolate(frame, [DURATION_IN_FRAMES - 120, DURATION_IN_FRAMES], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return intro * outro;
};

type Scene = {
  start: number;
  duration: number;
  kicker: string;
  title: string;
  body: string;
  primary: string;
  secondary?: string;
  assets: string[];
  accent: string;
  layout?: "single" | "duo" | "proof";
};

const scenes: Scene[] = [
  {
    start: 0,
    duration: 6,
    kicker: "VẤN ĐỀ MỖI NGÀY",
    title: "Ăn đúng mục tiêu, không cần đoán mò",
    body: "EatFitAI gom nhật ký, macro và thói quen ăn uống vào một luồng rõ ràng.",
    primary: "Launch thật trên APK v1",
    assets: ["01-launch-intro.png"],
    accent: colors.green,
  },
  {
    start: 6,
    duration: 10,
    kicker: "DASHBOARD",
    title: "Một màn hình để biết hôm nay còn bao nhiêu",
    body: "Calo, đạm, tinh bột, chất béo và nước được đặt ngay trước mắt.",
    primary: "Mục tiêu 2.150 kcal",
    secondary: "UI tiếng Việt sạch",
    assets: ["02-home-dashboard.png"],
    accent: colors.greenSoft,
  },
  {
    start: 16,
    duration: 12,
    kicker: "NHẬT KÝ",
    title: "Tìm món, chỉnh khẩu phần, lưu lại ngay",
    body: "Luồng thêm món dùng dữ liệu thật từ app và được kiểm chứng bằng API readback.",
    primary: "Search + detail + save",
    secondary: "Không lộ private media URL",
    assets: ["04-food-detail.png", "05-diary-after-add.png"],
    accent: colors.yellow,
    layout: "duo",
  },
  {
    start: 28,
    duration: 15,
    kicker: "AI QUICK ADD",
    title: "MoChi mở nhanh scan, công thức và ghi giọng nói",
    body: "Nguồn ảnh là màn hình quick action thật. Clip scan/review/save cần capture lại khi ADB reconnect.",
    primary: "Nhận diện món ăn",
    secondary: "Gợi ý công thức",
    assets: ["06-quick-actions.png", "02-home-dashboard.png"],
    accent: colors.blue,
    layout: "duo",
  },
  {
    start: 43,
    duration: 12,
    kicker: "VOICE / TEXT",
    title: "Ghi nhanh bằng lệnh, rồi đối chiếu lại",
    body: "Flow voice-text đã có readback qua backend, phù hợp cho thao tác nhanh trong ngày.",
    primary: "Nói để ghi chép nhanh",
    secondary: "Backend connected",
    assets: ["06-quick-actions.png", "03-diary-readback.png"],
    accent: colors.coral,
    layout: "duo",
  },
  {
    start: 55,
    duration: 11,
    kicker: "TIẾN ĐỘ",
    title: "Theo dõi macro, hồ sơ và mục tiêu cá nhân",
    body: "Thống kê theo ngày và hồ sơ cơ thể giúp người dùng hiểu tiến độ thay vì chỉ nhập dữ liệu.",
    primary: "Stats + Profile",
    secondary: "Dữ liệu seeded production",
    assets: ["07-stats.png", "08-profile.png"],
    accent: colors.green,
    layout: "duo",
  },
  {
    start: 66,
    duration: 6,
    kicker: "V1 RELEASE PROOF",
    title: "APK v1 sẵn sàng kiểm thử công khai",
    body: "Package com.eatfitai.app, versionName 1.0.0, versionCode 1, non-debuggable.",
    primary: "Real device 2201116SG",
    secondary: "API production healthy",
    assets: ["09-release-proof.png"],
    accent: colors.greenSoft,
    layout: "proof",
  },
];

const Screen = ({
  src,
  frame,
  tilt = -3,
  scale = 1,
}: {
  src: string;
  frame: number;
  tilt?: number;
  scale?: number;
}) => {
  const enter = clamp(frame, [0, 24], [0.78, 1]);
  const drift = Math.sin((frame / FPS) * 0.9) * 8;
  return (
    <div
      style={{
        width: 430,
        height: 860,
        borderRadius: 60,
        padding: 16,
        background: "linear-gradient(145deg, #18231f, #030807)",
        boxShadow: "0 44px 120px rgba(0,0,0,0.42)",
        border: `1px solid ${colors.line}`,
        transform: `translateY(${(1 - enter) * 48 + drift}px) rotate(${tilt}deg) scale(${scale})`,
        opacity: enter,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 46,
          overflow: "hidden",
          background: "#07120f",
        }}
      >
        <Img
          src={staticFile(`v1-real-app/${src}`)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>
    </div>
  );
};

const Badge = ({
  children,
  accent,
  delay,
  frame,
}: {
  children: ReactNode;
  accent: string;
  delay: number;
  frame: number;
}) => {
  const shown = clamp(frame, [delay, delay + 18], [0, 1]);
  return (
    <div
      style={{
        opacity: shown,
        transform: `translateY(${(1 - shown) * 18}px)`,
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        padding: "16px 22px",
        borderRadius: 999,
        background: colors.panel,
        border: `1px solid ${colors.line}`,
        color: colors.text,
        fontSize: 25,
        fontWeight: 800,
        letterSpacing: 0.2,
      }}
    >
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 999,
          background: accent,
          boxShadow: `0 0 24px ${accent}`,
        }}
      />
      {children}
    </div>
  );
};

const CopyBlock = ({ scene, frame }: { scene: Scene; frame: number }) => {
  const title = clamp(frame, [8, 34], [0, 1]);
  const body = clamp(frame, [24, 58], [0, 1]);
  return (
    <div style={{ width: 760 }}>
      <div
        style={{
          color: scene.accent,
          fontSize: 26,
          fontWeight: 900,
          letterSpacing: 4,
          opacity: title,
        }}
      >
        {scene.kicker}
      </div>
      <h1
        style={{
          margin: "26px 0 0",
          color: colors.text,
          fontSize: 82,
          lineHeight: 1.02,
          fontWeight: 950,
          letterSpacing: -2.5,
          opacity: title,
          transform: `translateY(${(1 - title) * 34}px)`,
        }}
      >
        {scene.title}
      </h1>
      <p
        style={{
          margin: "26px 0 0",
          maxWidth: 690,
          color: colors.muted,
          fontSize: 31,
          lineHeight: 1.36,
          fontWeight: 560,
          opacity: body,
          transform: `translateY(${(1 - body) * 24}px)`,
        }}
      >
        {scene.body}
      </p>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 34 }}>
        <Badge accent={scene.accent} delay={40} frame={frame}>
          {scene.primary}
        </Badge>
        {scene.secondary ? (
          <Badge accent={colors.green} delay={52} frame={frame}>
            {scene.secondary}
          </Badge>
        ) : null}
      </div>
    </div>
  );
};

const Background = ({ accent, frame }: { accent: string; frame: number }) => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(circle at 18% 18%, rgba(36,211,107,0.20), transparent 30%), radial-gradient(circle at 84% 28%, rgba(51,199,255,0.16), transparent 34%), linear-gradient(135deg, #07120f 0%, #101629 100%)",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: -220,
        background: `conic-gradient(from ${frame * 0.2}deg, transparent, ${accent}33, transparent, #ffffff12, transparent)`,
        filter: "blur(72px)",
        opacity: 0.75,
      }}
    />
    <div
      style={{
        position: "absolute",
        right: 90,
        top: 80,
        width: 210,
        height: 210,
        borderRadius: 999,
        border: `2px solid ${colors.line}`,
      }}
    />
    <div
      style={{
        position: "absolute",
        left: 76,
        bottom: 78,
        color: "rgba(255,255,255,0.06)",
        fontSize: 180,
        fontWeight: 950,
      }}
    >
      EatFitAI
    </div>
  </AbsoluteFill>
);

const SceneView = ({ scene }: { scene: Scene }) => {
  const frame = useCurrentFrame();
  const presence = Math.min(
    clamp(frame, [0, 24], [0, 1]),
    clamp(frame, [sec(scene.duration) - 24, sec(scene.duration)], [1, 0]),
  );
  const [first, second] = scene.assets;
  const proof = scene.layout === "proof";
  const duo = scene.layout === "duo";

  return (
    <AbsoluteFill style={{ opacity: presence }}>
      <Background accent={scene.accent} frame={frame + sec(scene.start)} />
      <div
        style={{
          position: "absolute",
          left: 90,
          right: 90,
          top: 70,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: colors.text,
          fontWeight: 900,
          letterSpacing: 0.8,
          fontSize: 26,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Img src={staticFile("assets/icon.png")} style={{ width: 56, height: 56, borderRadius: 16 }} />
          EatFitAI v1
        </div>
        <div style={{ color: colors.muted, fontSize: 22 }}>Public APK release proof</div>
      </div>
      <div
        style={{
          position: "absolute",
          inset: "150px 90px 88px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 84,
        }}
      >
        <CopyBlock scene={scene} frame={frame} />
        <div
          style={{
            width: 790,
            height: 850,
            position: "relative",
            display: "grid",
            placeItems: "center",
          }}
        >
          {duo ? (
            <>
              <div style={{ position: "absolute", left: 44, top: 40 }}>
                <Screen src={first} frame={frame} tilt={-5} scale={0.92} />
              </div>
              <div style={{ position: "absolute", right: 34, top: 12 }}>
                <Screen src={second || first} frame={frame + 12} tilt={5} scale={0.92} />
              </div>
            </>
          ) : proof ? (
            <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
              <Screen src={first} frame={frame} tilt={-2} scale={0.82} />
              <div
                style={{
                  width: 278,
                  padding: "34px 30px",
                  borderRadius: 34,
                  background: colors.panel,
                  border: `1px solid ${colors.line}`,
                  color: colors.text,
                  boxShadow: "0 32px 80px rgba(0,0,0,0.28)",
                }}
              >
                <div style={{ color: scene.accent, fontSize: 23, fontWeight: 900 }}>APK FACTS</div>
                {["v1.0.0", "versionCode 1", "non-debuggable", "clean install"].map((item, index) => (
                  <div
                    key={item}
                    style={{
                      marginTop: index === 0 ? 22 : 16,
                      fontSize: 26,
                      fontWeight: 820,
                      color: index === 0 ? colors.text : colors.muted,
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Screen src={first} frame={frame} tilt={scene.start === 0 ? 0 : -4} scale={1} />
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const EatFitAIProductIntro: React.FC = () => {
  return (
    <AbsoluteFill style={{ fontFamily: "Inter, Segoe UI, Arial, sans-serif", background: colors.bg }}>
      <Audio src={staticFile("audio/eatfitai-beat.wav")} loop volume={fadeVolume} />
      {scenes.map((scene) => (
        <Sequence
          key={`${scene.start}-${scene.title}`}
          from={sec(scene.start)}
          durationInFrames={sec(scene.duration)}
          premountFor={FPS}
        >
          <SceneView scene={scene} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
