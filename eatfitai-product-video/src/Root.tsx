import "./index.css";
import { Composition } from "remotion";
import {
  DURATION_IN_FRAMES,
  EatFitAIProductIntro,
  FPS,
} from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="EatFitAIProductIntro"
        component={EatFitAIProductIntro}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
