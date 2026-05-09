import type { CSSProperties, ReactNode } from "react";
import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  staticFile,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const FPS = 30;
export const DURATION_IN_FRAMES = 48 * FPS;

const colors = {
  ink: "#10231f",
  muted: "#60726c",
  panel: "#ffffff",
  soft: "#f3faf6",
  green: "#0f6b57",
  greenDark: "#064336",
  mint: "#7ee6b5",
  coral: "#ff7a59",
  lemon: "#ffd166",
  blue: "#2f80ed",
  line: "#d9eee5",
};

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.45, 0, 0.55, 1);

const fit: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const shadow = "0 28px 70px rgba(16, 35, 31, 0.16)";

const clamp = (
  frame: number,
  input: [number, number],
  output: [number, number],
  easing = easeOut,
) =>
  interpolate(frame, input, output, {
    easing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const scenePresence = (frame: number, duration: number) => {
  const enter = clamp(frame, [0, 24], [0.35, 1]);
  const exit = clamp(frame, [duration - 24, duration], [1, 0], Easing.in(Easing.cubic));
  return Math.min(enter, exit);
};

const beatPulse = (frame: number, fps: number) => {
  const beat = (frame % (fps / 2)) / (fps / 2);
  return interpolate(beat, [0, 0.28, 1], [1, 0.92, 1], {
    easing: easeInOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

const fadeVolume = (frame: number, duration: number) => {
  const intro = interpolate(frame, [0, 36], [0, 0.78], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outro = interpolate(frame, [duration - 72, duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return intro * outro;
};

const Eyebrow = ({ children, color = colors.green }: { children: ReactNode; color?: string }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 12,
      color,
      fontSize: 26,
      fontWeight: 700,
      letterSpacing: 0,
      textTransform: "uppercase",
    }}
  >
    <span
      style={{
        width: 44,
        height: 4,
        borderRadius: 999,
        background: color,
        display: "inline-block",
      }}
    />
    {children}
  </div>
);

const TextBlock = ({
  eyebrow,
  title,
  body,
  frame,
  color = colors.ink,
}: {
  eyebrow: string;
  title: string;
  body: string;
  frame: number;
  color?: string;
}) => {
  const titleIn = clamp(frame, [0, 30], [0.18, 1]);
  const bodyIn = clamp(frame, [14, 48], [0, 1]);

  return (
    <div style={{ maxWidth: 770 }}>
      <div
        style={{
          opacity: titleIn,
          transform: `translateY(${(1 - titleIn) * 28}px)`,
        }}
      >
        <Eyebrow color={color}>{eyebrow}</Eyebrow>
        <h1
          style={{
            margin: "30px 0 0",
            fontSize: 92,
            lineHeight: 1,
            letterSpacing: 0,
            color: colors.ink,
            fontWeight: 840,
          }}
        >
          {title}
        </h1>
      </div>
      <p
        style={{
          margin: "30px 0 0",
          maxWidth: 640,
          color: colors.muted,
          fontSize: 35,
          lineHeight: 1.34,
          letterSpacing: 0,
          opacity: bodyIn,
          transform: `translateY(${(1 - bodyIn) * 20}px)`,
        }}
      >
        {body}
      </p>
    </div>
  );
};

const ProductMark = ({ frame }: { frame: number }) => {
  const pulse = beatPulse(frame, FPS);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        transform: `scale(${pulse})`,
        transformOrigin: "left center",
      }}
    >
      <div
        style={{
          width: 90,
          height: 90,
          borderRadius: 26,
          background: colors.panel,
          boxShadow: "0 18px 42px rgba(15, 107, 87, 0.24)",
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
        }}
      >
        <Img src={staticFile("assets/icon.png")} style={{ width: 88, height: 88 }} />
      </div>
      <div>
        <div
          style={{
            color: colors.ink,
            fontSize: 48,
            fontWeight: 850,
            lineHeight: 1,
            letterSpacing: 0,
          }}
        >
          EatFitAI
        </div>
        <div
          style={{
            marginTop: 8,
            color: colors.green,
            fontSize: 23,
            fontWeight: 700,
            letterSpacing: 0,
          }}
        >
          AI nutrition companion
        </div>
      </div>
    </div>
  );
};

const PhoneFrame = ({
  children,
  frame,
  tilt = -4,
}: {
  children: ReactNode;
  frame: number;
  tilt?: number;
}) => {
  const enter = clamp(frame, [0, 34], [0.42, 1]);
  return (
    <div
      style={{
        width: 430,
        height: 820,
        borderRadius: 58,
        background: "#101614",
        padding: 18,
        boxShadow: "0 42px 90px rgba(8, 28, 22, 0.28)",
        transform: `rotate(${tilt}deg) translateY(${(1 - enter) * 50}px)`,
        opacity: enter,
      }}
    >
      <div
        style={{
          position: "relative",
          height: "100%",
          borderRadius: 44,
          overflow: "hidden",
          background: "#f8fffb",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 16,
            left: "50%",
            width: 118,
            height: 24,
            transform: "translateX(-50%)",
            borderRadius: 999,
            background: "#101614",
            zIndex: 5,
          }}
        />
        {children}
      </div>
    </div>
  );
};

const MacroBar = ({
  label,
  value,
  color,
  frame,
  delay,
}: {
  label: string;
  value: number;
  color: string;
  frame: number;
  delay: number;
}) => {
  const width = clamp(frame, [delay, delay + 30], [0, value]);
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: colors.muted }}>
        <span>{label}</span>
        <strong style={{ color: colors.ink }}>{value}%</strong>
      </div>
      <div
        style={{
          marginTop: 8,
          height: 12,
          borderRadius: 999,
          background: "#e9f5ef",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${width}%`,
            height: "100%",
            borderRadius: 999,
            background: color,
          }}
        />
      </div>
    </div>
  );
};

const DashboardPhone = ({ frame }: { frame: number }) => {
  const calories = Math.round(clamp(frame, [28, 74], [0, 1420]));
  return (
    <PhoneFrame frame={frame}>
      <div style={{ padding: "62px 32px 0" }}>
        <div style={{ fontSize: 23, color: colors.muted, fontWeight: 700 }}>Nhật ký hôm nay</div>
        <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 118,
              height: 118,
              borderRadius: "50%",
              background: `conic-gradient(${colors.green} 0deg ${calories / 5}deg, #e7f4ee ${calories / 5}deg 360deg)`,
              display: "grid",
              placeItems: "center",
            }}
          >
            <div
              style={{
                width: 82,
                height: 82,
                borderRadius: "50%",
                background: colors.panel,
                display: "grid",
                placeItems: "center",
                color: colors.greenDark,
                fontWeight: 850,
                fontSize: 24,
              }}
            >
              {calories}
            </div>
          </div>
          <div>
            <div style={{ color: colors.ink, fontSize: 34, fontWeight: 840 }}>Còn 680 kcal</div>
            <div style={{ color: colors.muted, fontSize: 19, marginTop: 8 }}>Theo mục tiêu cá nhân</div>
          </div>
        </div>
        <div
          style={{
            marginTop: 28,
            border: `1px solid ${colors.line}`,
            borderRadius: 8,
            padding: 20,
            background: "#ffffff",
            boxShadow: "0 18px 45px rgba(18, 56, 42, 0.08)",
          }}
        >
          <div style={{ color: colors.ink, fontSize: 24, fontWeight: 820 }}>Điểm nổi bật từ AI</div>
          <div style={{ marginTop: 8, color: colors.muted, fontSize: 18, lineHeight: 1.35 }}>
            Bữa trưa cân bằng tốt. Bổ sung thêm rau xanh cho bữa tối.
          </div>
        </div>
        <MacroBar label="Protein" value={72} color={colors.blue} frame={frame} delay={42} />
        <MacroBar label="Carbs" value={58} color={colors.lemon} frame={frame} delay={48} />
        <MacroBar label="Fat" value={41} color={colors.coral} frame={frame} delay={54} />
        <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {["Bữa sáng", "Bữa trưa", "Ăn vặt", "Bữa tối"].map((meal, index) => (
            <div
              key={meal}
              style={{
                padding: "14px 12px",
                borderRadius: 8,
                color: index === 1 ? "#ffffff" : colors.greenDark,
                background: index === 1 ? colors.green : "#edf8f2",
                fontSize: 18,
                fontWeight: 760,
                textAlign: "center",
              }}
            >
              {meal}
            </div>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
};

const FloatingFood = ({
  src,
  frame,
  delay,
  style,
}: {
  src: string;
  frame: number;
  delay: number;
  style: CSSProperties;
}) => {
  const show = clamp(frame, [delay, delay + 24], [0, 1]);
  const float = Math.sin((frame - delay) / 24) * 10;
  return (
    <div
      style={{
        position: "absolute",
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: shadow,
        border: "8px solid #ffffff",
        opacity: show,
        transform: `translateY(${(1 - show) * 42 + float}px) scale(${0.9 + show * 0.1})`,
        ...style,
      }}
    >
      <Img src={staticFile(src)} style={fit} />
    </div>
  );
};

const HeroScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 8 * fps;
  const presence = scenePresence(frame, duration);

  return (
    <AbsoluteFill
      style={{
        padding: 112,
        transform: `scale(${0.98 + presence * 0.02})`,
        opacity: presence,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: "100%" }}>
        <div>
          <ProductMark frame={frame} />
          <div style={{ marginTop: 78 }}>
            <TextBlock
              eyebrow="Product intro"
              title="Dinh dưỡng thông minh, dễ theo dõi."
              body="EatFitAI giúp người dùng ghi bữa ăn, hiểu macro và nhận gợi ý cá nhân hóa từ AI trong một trải nghiệm mobile gọn gàng."
              frame={frame}
            />
          </div>
        </div>
        <div style={{ position: "relative", width: 780, height: 860 }}>
          <DashboardPhone frame={frame} />
          <FloatingFood
            src="assets/pho-bowl.jpg"
            frame={frame}
            delay={26}
            style={{ right: 30, top: 72, width: 290, height: 220 }}
          />
          <FloatingFood
            src="assets/apple.jpg"
            frame={frame}
            delay={40}
            style={{ right: 190, bottom: 96, width: 220, height: 180 }}
          />
          <FloatingFood
            src="assets/broccoli.jpg"
            frame={frame}
            delay={54}
            style={{ right: 0, bottom: 260, width: 210, height: 190 }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ScanPhone = ({ frame }: { frame: number }) => {
  const scanY = clamp(frame % 90, [0, 90], [82, 560], Easing.inOut(Easing.sin));
  const confidence = Math.round(clamp(frame, [32, 76], [0, 92]));
  const labels = [
    { text: "Cơm", top: 250, left: 62, color: colors.lemon },
    { text: "Gà", top: 390, left: 220, color: colors.coral },
    { text: "Rau", top: 500, left: 72, color: colors.mint },
  ];

  return (
    <PhoneFrame frame={frame} tilt={3}>
      <Img src={staticFile("assets/chicken.jpg")} style={fit} />
      <div style={{ position: "absolute", inset: 0, background: "rgba(4, 32, 25, 0.34)" }} />
      <div
        style={{
          position: "absolute",
          left: 44,
          right: 44,
          top: 96,
          height: 520,
          borderRadius: 8,
          border: `3px solid ${colors.mint}`,
          boxShadow: "0 0 0 999px rgba(4, 32, 25, 0.16)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 50,
          right: 50,
          top: scanY,
          height: 4,
          borderRadius: 999,
          background: colors.mint,
          boxShadow: "0 0 22px rgba(126, 230, 181, 0.85)",
        }}
      />
      {labels.map((label, index) => {
        const show = clamp(frame, [42 + index * 12, 64 + index * 12], [0, 1]);
        return (
          <div
            key={label.text}
            style={{
              position: "absolute",
              top: label.top,
              left: label.left,
              opacity: show,
              transform: `scale(${0.88 + show * 0.12})`,
            }}
          >
            <div
              style={{
                width: 92,
                height: 58,
                border: `3px solid ${label.color}`,
                borderRadius: 6,
              }}
            />
            <div
              style={{
                marginTop: 8,
                display: "inline-flex",
                padding: "8px 12px",
                borderRadius: 999,
                background: colors.panel,
                color: colors.ink,
                fontSize: 17,
                fontWeight: 820,
                boxShadow: "0 12px 30px rgba(0,0,0,0.16)",
              }}
            >
              {label.text} {confidence}%
            </div>
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 30,
          right: 30,
          bottom: 34,
          padding: 20,
          borderRadius: 8,
          background: "rgba(255, 255, 255, 0.92)",
        }}
      >
        <div style={{ color: colors.greenDark, fontSize: 23, fontWeight: 850 }}>Nhận diện thực phẩm</div>
        <div style={{ color: colors.muted, fontSize: 17, marginTop: 6 }}>Xác nhận trước khi thêm vào nhật ký</div>
      </div>
    </PhoneFrame>
  );
};

const ScanScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 8 * fps;
  const presence = scenePresence(frame, duration);

  return (
    <AbsoluteFill
      style={{
        padding: "104px 112px",
        opacity: presence,
        display: "grid",
        gridTemplateColumns: "0.95fr 1.05fr",
        alignItems: "center",
        gap: 72,
      }}
    >
      <div style={{ position: "relative", height: 860, display: "grid", placeItems: "center" }}>
        <ScanPhone frame={frame} />
        <div
          style={{
            position: "absolute",
            right: 30,
            top: 92,
            width: 300,
            padding: 24,
            borderRadius: 8,
            background: colors.greenDark,
            color: "#ffffff",
            boxShadow: shadow,
            opacity: clamp(frame, [52, 82], [0, 1]),
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 850 }}>AI Vision</div>
          <div style={{ marginTop: 10, fontSize: 18, lineHeight: 1.35, color: "#c9f6df" }}>
            YOLO phát hiện món ăn, backend chuẩn hóa kết quả trước khi lưu.
          </div>
        </div>
      </div>
      <TextBlock
        eyebrow="Quét AI"
        title="Từ một tấm ảnh thành dữ liệu dinh dưỡng."
        body="Người dùng chụp món ăn, AI đề xuất thành phần, mức tin cậy và cho phép xác nhận trước khi thêm vào nhật ký."
        frame={frame}
        color={colors.coral}
      />
    </AbsoluteFill>
  );
};

const GoalCard = ({
  title,
  value,
  unit,
  color,
  frame,
  delay,
}: {
  title: string;
  value: number;
  unit: string;
  color: string;
  frame: number;
  delay: number;
}) => {
  const show = clamp(frame, [delay, delay + 22], [0, 1]);
  const count = Math.round(clamp(frame, [delay, delay + 42], [0, value]));
  return (
    <div
      style={{
        padding: 28,
        borderRadius: 8,
        background: colors.panel,
        boxShadow: "0 20px 60px rgba(12, 66, 49, 0.1)",
        border: `1px solid ${colors.line}`,
        opacity: show,
        transform: `translateY(${(1 - show) * 34}px)`,
      }}
    >
      <div style={{ color: colors.muted, fontSize: 24, fontWeight: 740 }}>{title}</div>
      <div style={{ marginTop: 14, color: colors.ink, fontSize: 58, fontWeight: 860 }}>
        {count}
        <span style={{ marginLeft: 10, color, fontSize: 28 }}>{unit}</span>
      </div>
    </div>
  );
};

const PersonalizedScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 10 * fps;
  const presence = scenePresence(frame, duration);

  return (
    <AbsoluteFill
      style={{
        padding: 112,
        opacity: presence,
        display: "grid",
        gridTemplateColumns: "0.9fr 1.1fr",
        alignItems: "center",
        gap: 80,
      }}
    >
      <TextBlock
        eyebrow="Cá nhân hóa"
        title="Mục tiêu thay đổi theo cơ thể và tiến độ."
        body="Calories và macro được tính từ hồ sơ, mức vận động, lịch sử ăn uống và phản hồi thực tế của người dùng."
        frame={frame}
        color={colors.blue}
      />
      <div style={{ position: "relative", height: 750 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 8,
            background: colors.greenDark,
            transform: "rotate(2deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 24,
            borderRadius: 8,
            background: "#f8fffb",
            padding: 34,
            boxShadow: shadow,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: colors.green, fontSize: 24, fontWeight: 820 }}>AI đề xuất mục tiêu</div>
              <div style={{ marginTop: 10, color: colors.ink, fontSize: 42, fontWeight: 860 }}>Gói dinh dưỡng hôm nay</div>
            </div>
            <div
              style={{
                padding: "12px 18px",
                borderRadius: 999,
                color: colors.greenDark,
                background: "#dff8ea",
                fontSize: 22,
                fontWeight: 850,
              }}
            >
              Tin cậy 91%
            </div>
          </div>
          <div style={{ marginTop: 42, display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 24 }}>
            <GoalCard title="Calories" value={2100} unit="kcal" color={colors.green} frame={frame} delay={28} />
            <GoalCard title="Protein" value={132} unit="g" color={colors.blue} frame={frame} delay={38} />
            <GoalCard title="Carbs" value={248} unit="g" color={colors.lemon} frame={frame} delay={48} />
            <GoalCard title="Fat" value={68} unit="g" color={colors.coral} frame={frame} delay={58} />
          </div>
          <div
            style={{
              marginTop: 32,
              height: 165,
              borderRadius: 8,
              background: "#eef9f3",
              padding: 22,
              display: "flex",
              alignItems: "end",
              gap: 14,
            }}
          >
            {[46, 62, 58, 70, 66, 82, 76, 88, 91].map((height, index) => {
              const show = clamp(frame, [70 + index * 4, 90 + index * 4], [0, 1]);
              return (
                <div
                  key={height + index}
                  style={{
                    width: 56,
                    height: `${show * height}%`,
                    borderRadius: "8px 8px 0 0",
                    background: index > 5 ? colors.green : "#b7e9d1",
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const WorkflowCard = ({
  title,
  body,
  color,
  frame,
  delay,
}: {
  title: string;
  body: string;
  color: string;
  frame: number;
  delay: number;
}) => {
  const show = clamp(frame, [delay, delay + 28], [0, 1]);
  return (
    <div
      style={{
        minHeight: 360,
        padding: 34,
        borderRadius: 8,
        background: colors.panel,
        border: `1px solid ${colors.line}`,
        boxShadow: "0 20px 56px rgba(16, 35, 31, 0.1)",
        opacity: show,
        transform: `translateY(${(1 - show) * 46}px)`,
      }}
    >
      <div style={{ width: 66, height: 10, borderRadius: 999, background: color }} />
      <div style={{ marginTop: 42, color: colors.ink, fontSize: 42, lineHeight: 1.05, fontWeight: 860 }}>
        {title}
      </div>
      <div style={{ marginTop: 22, color: colors.muted, fontSize: 25, lineHeight: 1.36 }}>{body}</div>
    </div>
  );
};

const WorkflowScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 10 * fps;
  const presence = scenePresence(frame, duration);

  return (
    <AbsoluteFill style={{ padding: 112, opacity: presence }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 80 }}>
        <TextBlock
          eyebrow="Luồng sử dụng"
          title="Ghi lại bữa ăn theo cách tự nhiên hơn."
          body="Tìm món, tạo món thủ công, thêm bằng ảnh hoặc giọng nói; mọi dữ liệu quay về nhật ký và thống kê."
          frame={frame}
          color={colors.green}
        />
        <div
          style={{
            width: 390,
            padding: 26,
            borderRadius: 8,
            background: colors.greenDark,
            color: "#ffffff",
            boxShadow: shadow,
            opacity: clamp(frame, [60, 90], [0, 1]),
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 860 }}>Backend proxy</div>
          <div style={{ marginTop: 10, fontSize: 20, lineHeight: 1.35, color: "#c9f6df" }}>
            Mobile gọi API chuẩn, AI provider nằm sau lớp kiểm soát.
          </div>
        </div>
      </div>
      <div style={{ marginTop: 72, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 26 }}>
        <WorkflowCard
          title="Nhật ký bữa ăn"
          body="Theo dõi calories, macro và bữa ăn trong ngày với trạng thái rõ ràng."
          color={colors.green}
          frame={frame}
          delay={36}
        />
        <WorkflowCard
          title="Giọng nói"
          body="Ghi nhanh ý định như thêm món hoặc xác nhận khẩu phần qua backend voice flow."
          color={colors.coral}
          frame={frame}
          delay={52}
        />
        <WorkflowCard
          title="Thống kê"
          body="So sánh tuần/tháng, nhận tín hiệu tiến độ và điểm cần điều chỉnh."
          color={colors.blue}
          frame={frame}
          delay={68}
        />
      </div>
    </AbsoluteFill>
  );
};

const NodeBox = ({
  label,
  detail,
  color,
  frame,
  delay,
}: {
  label: string;
  detail: string;
  color: string;
  frame: number;
  delay: number;
}) => {
  const show = clamp(frame, [delay, delay + 24], [0, 1]);
  return (
    <div
      style={{
        width: 305,
        minHeight: 178,
        padding: 26,
        borderRadius: 8,
        background: colors.panel,
        border: `1px solid ${colors.line}`,
        boxShadow: "0 22px 60px rgba(16, 35, 31, 0.1)",
        opacity: show,
        transform: `translateY(${(1 - show) * 28}px)`,
      }}
    >
      <div style={{ width: 54, height: 8, borderRadius: 999, background: color }} />
      <div style={{ marginTop: 28, color: colors.ink, fontSize: 31, fontWeight: 860 }}>{label}</div>
      <div style={{ marginTop: 12, color: colors.muted, fontSize: 20, lineHeight: 1.35 }}>{detail}</div>
    </div>
  );
};

const SystemScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 12 * fps;
  const presence = scenePresence(frame, duration);
  const logoIn = clamp(frame, [170, 214], [0, 1]);

  return (
    <AbsoluteFill style={{ padding: 112, opacity: presence }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 0.92fr", gap: 80, alignItems: "center", height: "100%" }}>
        <div>
          <TextBlock
            eyebrow="Sản phẩm hoàn chỉnh"
            title="Mobile app, API và AI trong cùng một hệ thống."
            body="EatFitAI được thiết kế cho demo sản phẩm nghiêm túc: dữ liệu có kiểm soát, AI có fallback, và trải nghiệm người dùng tập trung vào hành động hằng ngày."
            frame={frame}
            color={colors.coral}
          />
          <div style={{ marginTop: 68, display: "flex", alignItems: "center", gap: 18, opacity: logoIn }}>
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: 24,
                background: colors.panel,
                overflow: "hidden",
                boxShadow: "0 18px 42px rgba(15, 107, 87, 0.2)",
              }}
            >
              <Img src={staticFile("assets/icon.png")} style={{ width: 88, height: 88 }} />
            </div>
            <div>
              <div style={{ color: colors.ink, fontSize: 46, fontWeight: 880 }}>EatFitAI</div>
              <div style={{ color: colors.green, fontSize: 28, fontWeight: 780 }}>
                Ăn đúng hơn, hiểu cơ thể hơn.
              </div>
            </div>
          </div>
        </div>
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
            <NodeBox label="Expo Mobile" detail="Ghi bữa ăn, quét AI, giọng nói, thống kê." color={colors.green} frame={frame} delay={42} />
            <NodeBox label=".NET API" detail="Auth, diary, profile, validation, fallback." color={colors.blue} frame={frame} delay={58} />
            <NodeBox label="AI Provider" detail="YOLO vision, Gemini nutrition, voice parse." color={colors.coral} frame={frame} delay={74} />
            <NodeBox label="Supabase" detail="Lưu hồ sơ, nhật ký, mục tiêu và telemetry." color={colors.lemon} frame={frame} delay={90} />
          </div>
          <div
            style={{
              marginTop: 30,
              padding: "24px 28px",
              borderRadius: 8,
              background: colors.greenDark,
              color: "#ffffff",
              boxShadow: shadow,
              opacity: clamp(frame, [118, 150], [0, 1]),
            }}
          >
            <div style={{ fontSize: 31, fontWeight: 860 }}>Sẵn sàng cho video demo, pitch deck và social teaser.</div>
            <div style={{ marginTop: 10, fontSize: 21, color: "#c9f6df" }}>
              MP4 16:9, nhạc nền tự tạo, text tiếng Việt sạch UTF-8.
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Background = () => {
  const frame = useCurrentFrame();
  const progress = clamp(frame, [0, DURATION_IN_FRAMES], [0, 1], Easing.linear);
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, #f8fbff 0%, #effcf5 48%, #fff7f2 100%)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(15, 107, 87, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 107, 87, 0.06) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          transform: `translateX(${-progress * 80}px) translateY(${-progress * 40}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 12,
          background: `linear-gradient(90deg, ${colors.green}, ${colors.coral}, ${colors.blue}, ${colors.lemon})`,
        }}
      />
    </AbsoluteFill>
  );
};

const BeatTicks = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const activeBeat = Math.floor(frame / (fps / 2)) % 16;
  return (
    <div
      style={{
        position: "absolute",
        left: 112,
        right: 112,
        bottom: 44,
        display: "grid",
        gridTemplateColumns: "repeat(16, 1fr)",
        gap: 8,
        opacity: 0.45,
      }}
    >
      {Array.from({ length: 16 }).map((_, index) => (
        <div
          key={index}
          style={{
            height: 5,
            borderRadius: 999,
            background: index === activeBeat ? colors.green : "#badccc",
            transform: `scaleY(${index === activeBeat ? 1.9 : 1})`,
          }}
        />
      ))}
    </div>
  );
};

export const EatFitAIProductIntro = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        fontFamily: "'Segoe UI', 'Inter', 'Arial', sans-serif",
        overflow: "hidden",
      }}
    >
      <Audio
        src={staticFile("audio/eatfitai-beat.wav")}
        volume={(audioFrame) => fadeVolume(audioFrame, DURATION_IN_FRAMES)}
      />
      <Background />
      <Sequence durationInFrames={8 * FPS} premountFor={FPS}>
        <HeroScene />
      </Sequence>
      <Sequence from={8 * FPS} durationInFrames={8 * FPS} premountFor={FPS}>
        <ScanScene />
      </Sequence>
      <Sequence from={16 * FPS} durationInFrames={10 * FPS} premountFor={FPS}>
        <PersonalizedScene />
      </Sequence>
      <Sequence from={26 * FPS} durationInFrames={10 * FPS} premountFor={FPS}>
        <WorkflowScene />
      </Sequence>
      <Sequence from={36 * FPS} durationInFrames={12 * FPS} premountFor={FPS}>
        <SystemScene />
      </Sequence>
      <BeatTicks />
      <div
        style={{
          position: "absolute",
          top: 44,
          right: 112,
          color: colors.greenDark,
          fontSize: 22,
          fontWeight: 800,
          opacity: clamp(frame, [0, 40], [0, 0.74]),
        }}
      >
        EatFitAI Product Film
      </div>
    </AbsoluteFill>
  );
};
