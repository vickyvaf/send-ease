import { Composition } from "remotion";
import { SendeaseComposition } from "./Composition";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="SendeasePreview"
        component={SendeaseComposition}
        durationInFrames={900} // 30 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
