import { Math as CesiumMath, type Viewer } from "cesium";
import type { CameraConfig } from "../projects/types";

export function captureCamera(viewer: Viewer): CameraConfig {
  const { camera } = viewer;
  const position = camera.positionCartographic;
  return {
    longitude: CesiumMath.toDegrees(position.longitude),
    latitude: CesiumMath.toDegrees(position.latitude),
    height: position.height,
    heading: CesiumMath.toDegrees(camera.heading),
    pitch: CesiumMath.toDegrees(camera.pitch),
    roll: CesiumMath.toDegrees(camera.roll),
  };
}
