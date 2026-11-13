// 앱에서 쓰는 선 아이콘 (Artifact 시제품과 같은 모양)
import Svg, { Circle, Path, Rect } from "react-native-svg";

export type IconName = "home" | "measure" | "records" | "exercise" | "my" | "bell" | "phone" | "laptop" | "flip" | "logo";

export function Icon({ name, color, size = 24, width = 1.8 }: { name: IconName; color: string; size?: number; width?: number }) {
  const p = { stroke: color, strokeWidth: width, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === "home" && <Path d="M4 11l8-7 8 7v8.5a.5.5 0 0 1-.5.5H15v-6H9v6H4.5a.5.5 0 0 1-.5-.5z" {...p} />}
      {name === "measure" && (<><Path d="M4 8h3l2-3h6l2 3h3v11H4z" {...p} /><Circle cx={12} cy={13} r={3.5} {...p} /></>)}
      {name === "records" && <Path d="M4 19h16M6 15l4-4 3 3 5-6" {...p} />}
      {name === "exercise" && (<><Circle cx={12} cy={13} r={7} {...p} /><Path d="M12 9v4l2.5 2M9.5 3h5" {...p} /></>)}
      {name === "my" && (<><Circle cx={12} cy={8.5} r={3.8} {...p} /><Path d="M4.5 20c.8-3.8 3.9-5.8 7.5-5.8s6.7 2 7.5 5.8" {...p} /></>)}
      {name === "bell" && (<><Path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" {...p} /><Path d="M10 20.5a2 2 0 0 0 4 0" {...p} /></>)}
      {name === "phone" && (<><Rect x={6} y={2.5} width={12} height={19} rx={2.5} {...p} /><Circle cx={12} cy={9} r={2.5} {...p} /></>)}
      {name === "laptop" && (<><Rect x={2.5} y={5} width={13} height={10} rx={1.5} {...p} /><Path d="M1 18h16" {...p} /><Rect x={17.5} y={8} width={5} height={11} rx={1.2} {...p} /></>)}
      {name === "flip" && (<><Path d="M4 8h3l2-3h6l2 3h3v11H4z" {...p} /><Path d="M9.5 12.5a3 3 0 0 1 5-1.5l.5.5M14.5 14.5a3 3 0 0 1-5 1.5l-.5-.5" {...p} /></>)}
      {name === "logo" && (<><Circle cx={15} cy={6.5} r={3.5} {...p} /><Path d="M13 10.5 9 17M9 17h8" {...p} /></>)}
    </Svg>
  );
}
