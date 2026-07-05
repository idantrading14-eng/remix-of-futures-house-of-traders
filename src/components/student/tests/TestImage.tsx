import { useTestImageUrl } from "@/hooks/useTestImageUrl";

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | null | undefined;
}

/** Image that resolves either a public URL or a storage path in `test-images`. */
export default function TestImage({ src, ...rest }: Props) {
  const resolved = useTestImageUrl(src);
  if (!resolved) return null;
  return <img src={resolved} {...rest} />;
}
