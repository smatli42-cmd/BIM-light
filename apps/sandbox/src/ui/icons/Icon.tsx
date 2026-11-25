// Komponenta ikony (koncepce rozhraní, část 6): jedna sada SVG pro světlý i tmavý motiv, barva z textu.
import { ICONS, type IconName } from './paths.ts';

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      class="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width={1.5}
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {ICONS[name].map((d, i) => {
        if (!d.startsWith('c:')) return <path key={i} d={d} />;
        const [cx, cy, r] = d.slice(2).split(',').map(Number);
        return <circle key={i} cx={cx} cy={cy} r={r} />;
      })}
    </svg>
  );
}

/** Tlačítko s ikonou a bublinou (název – zkratka, popis). */
export function IconButton(props: {
  icon: IconName;
  label: string;
  shortcut?: string | undefined;
  description?: string | undefined;
  testid?: string | undefined;
  pressed?: boolean | undefined;
  disabled?: boolean | undefined;
  onClick: () => void;
}) {
  const head = props.shortcut ? `${props.label} – ${props.shortcut}` : props.label;
  return (
    <button
      class="icon-btn"
      data-testid={props.testid}
      aria-label={props.label}
      aria-pressed={props.pressed}
      disabled={props.disabled}
      title={props.description ? `${head}\n${props.description}` : head}
      onClick={props.onClick}
    >
      <Icon name={props.icon} />
    </button>
  );
}
