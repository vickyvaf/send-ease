import { Composition } from "remotion";
import { SendeaseComposition } from "./Composition";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="SendeasePreview"
        component={SendeaseComposition}
        durationInFrames={1234} // 41.13 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
