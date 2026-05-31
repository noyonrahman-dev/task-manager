import OpengraphImage, {
  alt as ogAlt,
  contentType as ogContentType,
  size as ogSize,
} from "./opengraph-image";

// Reuse the OpenGraph image generator for the Twitter card to keep both
// platforms perfectly in sync.
export const runtime = "edge";
export const alt = ogAlt;
export const size = ogSize;
export const contentType = ogContentType;

export default OpengraphImage;
