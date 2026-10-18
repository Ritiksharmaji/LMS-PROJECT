import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { Icon as PhosphorIcon, IconWeight } from 'phosphor-react-native';
import { ArrowLeftIcon } from 'phosphor-react-native/src/icons/ArrowLeft';
import { ArrowRightIcon } from 'phosphor-react-native/src/icons/ArrowRight';
import { ArrowSquareOutIcon } from 'phosphor-react-native/src/icons/ArrowSquareOut';
import { ArrowsClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowsClockwise';
import { BellIcon } from 'phosphor-react-native/src/icons/Bell';
import { BookOpenIcon } from 'phosphor-react-native/src/icons/BookOpen';
import { BooksIcon } from 'phosphor-react-native/src/icons/Books';
import { BrainIcon } from 'phosphor-react-native/src/icons/Brain';
import { BriefcaseIcon } from 'phosphor-react-native/src/icons/Briefcase';
import { BuildingsIcon } from 'phosphor-react-native/src/icons/Buildings';
import { CalendarBlankIcon } from 'phosphor-react-native/src/icons/CalendarBlank';
import { CaretDownIcon } from 'phosphor-react-native/src/icons/CaretDown';
import { CaretLeftIcon } from 'phosphor-react-native/src/icons/CaretLeft';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { ChartBarIcon } from 'phosphor-react-native/src/icons/ChartBar';
import { ChartLineIcon } from 'phosphor-react-native/src/icons/ChartLine';
import { ChatCircleTextIcon } from 'phosphor-react-native/src/icons/ChatCircleText';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { CheckCircleIcon } from 'phosphor-react-native/src/icons/CheckCircle';
import { ClipboardTextIcon } from 'phosphor-react-native/src/icons/ClipboardText';
import { ClockIcon } from 'phosphor-react-native/src/icons/Clock';
import { CodeIcon } from 'phosphor-react-native/src/icons/Code';
import { CompassIcon } from 'phosphor-react-native/src/icons/Compass';
import { CpuIcon } from 'phosphor-react-native/src/icons/Cpu';
import { CreditCardIcon } from 'phosphor-react-native/src/icons/CreditCard';
import { DatabaseIcon } from 'phosphor-react-native/src/icons/Database';
import { EnvelopeSimpleIcon } from 'phosphor-react-native/src/icons/EnvelopeSimple';
import { EyeIcon } from 'phosphor-react-native/src/icons/Eye';
import { FeatherIcon } from 'phosphor-react-native/src/icons/Feather';
import { FileTextIcon } from 'phosphor-react-native/src/icons/FileText';
import { FlameIcon } from 'phosphor-react-native/src/icons/Flame';
import { GearSixIcon } from 'phosphor-react-native/src/icons/GearSix';
import { GraduationCapIcon } from 'phosphor-react-native/src/icons/GraduationCap';
import { HardDrivesIcon } from 'phosphor-react-native/src/icons/HardDrives';
import { HeartIcon } from 'phosphor-react-native/src/icons/Heart';
import { HouseIcon } from 'phosphor-react-native/src/icons/House';
import { ImageIcon } from 'phosphor-react-native/src/icons/Image';
import { InfinityIcon } from 'phosphor-react-native/src/icons/Infinity';
import { InfoIcon } from 'phosphor-react-native/src/icons/Info';
import { LinkSimpleIcon } from 'phosphor-react-native/src/icons/LinkSimple';
import { LockSimpleIcon } from 'phosphor-react-native/src/icons/LockSimple';
import { MagnifyingGlassIcon } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { MathOperationsIcon } from 'phosphor-react-native/src/icons/MathOperations';
import { MedalIcon } from 'phosphor-react-native/src/icons/Medal';
import { MonitorIcon } from 'phosphor-react-native/src/icons/Monitor';
import { MoonIcon } from 'phosphor-react-native/src/icons/Moon';
import { PaperPlaneRightIcon } from 'phosphor-react-native/src/icons/PaperPlaneRight';
import { PauseIcon } from 'phosphor-react-native/src/icons/Pause';
import { PenNibIcon } from 'phosphor-react-native/src/icons/PenNib';
import { PencilSimpleIcon } from 'phosphor-react-native/src/icons/PencilSimple';
import { PlayIcon } from 'phosphor-react-native/src/icons/Play';
import { PlayCircleIcon } from 'phosphor-react-native/src/icons/PlayCircle';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { PresentationChartIcon } from 'phosphor-react-native/src/icons/PresentationChart';
import { PulseIcon } from 'phosphor-react-native/src/icons/Pulse';
import { PushPinIcon } from 'phosphor-react-native/src/icons/PushPin';
import { QuestionIcon } from 'phosphor-react-native/src/icons/Question';
import { ReceiptIcon } from 'phosphor-react-native/src/icons/Receipt';
import { SealCheckIcon } from 'phosphor-react-native/src/icons/SealCheck';
import { ShieldCheckIcon } from 'phosphor-react-native/src/icons/ShieldCheck';
import { SignOutIcon } from 'phosphor-react-native/src/icons/SignOut';
import { SparkleIcon } from 'phosphor-react-native/src/icons/Sparkle';
import { SquaresFourIcon } from 'phosphor-react-native/src/icons/SquaresFour';
import { StarIcon } from 'phosphor-react-native/src/icons/Star';
import { SunIcon } from 'phosphor-react-native/src/icons/Sun';
import { TargetIcon } from 'phosphor-react-native/src/icons/Target';
import { TerminalWindowIcon } from 'phosphor-react-native/src/icons/TerminalWindow';
import { TrayIcon } from 'phosphor-react-native/src/icons/Tray';
import { TrendDownIcon } from 'phosphor-react-native/src/icons/TrendDown';
import { TrendUpIcon } from 'phosphor-react-native/src/icons/TrendUp';
import { UserIcon } from 'phosphor-react-native/src/icons/User';
import { UserPlusIcon } from 'phosphor-react-native/src/icons/UserPlus';
import { UsersIcon } from 'phosphor-react-native/src/icons/Users';
import { VideoCameraIcon } from 'phosphor-react-native/src/icons/VideoCamera';
import { WalletIcon } from 'phosphor-react-native/src/icons/Wallet';
import { WarningIcon } from 'phosphor-react-native/src/icons/Warning';
import { WarningCircleIcon } from 'phosphor-react-native/src/icons/WarningCircle';
import { XIcon } from 'phosphor-react-native/src/icons/X';

import { usePalette } from '../theme/ThemeProvider';

/** Same names as the web app's icon registry; each icon is imported on its own to keep the bundle small. */
const ICONS = {
  activity: PulseIcon,
  award: MedalIcon,
  'badge-check': SealCheckIcon,
  bell: BellIcon,
  'book-open': BookOpenIcon,
  brain: BrainIcon,
  briefcase: BriefcaseIcon,
  'building-2': BuildingsIcon,
  calendar: CalendarBlankIcon,
  'chart-column': ChartBarIcon,
  'chart-line': ChartLineIcon,
  check: CheckIcon,
  'chevron-down': CaretDownIcon,
  'chevron-left': CaretLeftIcon,
  'chevron-right': CaretRightIcon,
  'circle-alert': WarningCircleIcon,
  'circle-check': CheckCircleIcon,
  'circle-help': QuestionIcon,
  'circle-play': PlayCircleIcon,
  'clipboard-check': ClipboardTextIcon,
  clock: ClockIcon,
  code: CodeIcon,
  compass: CompassIcon,
  cpu: CpuIcon,
  'credit-card': CreditCardIcon,
  database: DatabaseIcon,
  'external-link': ArrowSquareOutIcon,
  eye: EyeIcon,
  feather: FeatherIcon,
  'file-text': FileTextIcon,
  flame: FlameIcon,
  'graduation-cap': GraduationCapIcon,
  heart: HeartIcon,
  house: HouseIcon,
  image: ImageIcon,
  inbox: TrayIcon,
  infinity: InfinityIcon,
  info: InfoIcon,
  'layout-dashboard': SquaresFourIcon,
  library: BooksIcon,
  link: LinkSimpleIcon,
  lock: LockSimpleIcon,
  'log-out': SignOutIcon,
  mail: EnvelopeSimpleIcon,
  'message-square': ChatCircleTextIcon,
  monitor: MonitorIcon,
  moon: MoonIcon,
  pause: PauseIcon,
  'pen-tool': PenNibIcon,
  pencil: PencilSimpleIcon,
  pin: PushPinIcon,
  play: PlayIcon,
  plus: PlusIcon,
  presentation: PresentationChartIcon,
  receipt: ReceiptIcon,
  search: MagnifyingGlassIcon,
  send: PaperPlaneRightIcon,
  settings: GearSixIcon,
  'shield-check': ShieldCheckIcon,
  sigma: MathOperationsIcon,
  sparkles: SparkleIcon,
  star: StarIcon,
  sun: SunIcon,
  target: TargetIcon,
  terminal: TerminalWindowIcon,
  'trending-down': TrendDownIcon,
  'trending-up': TrendUpIcon,
  'triangle-alert': WarningIcon,
  user: UserIcon,
  'user-plus': UserPlusIcon,
  users: UsersIcon,
  video: VideoCameraIcon,
  wallet: WalletIcon,
  x: XIcon,
  'arrow-right': ArrowRightIcon,
  'arrow-left': ArrowLeftIcon,
  server: HardDrivesIcon,
  'refresh-cw': ArrowsClockwiseIcon,
} satisfies Record<string, PhosphorIcon>;

export type IconName = keyof typeof ICONS;

const PLAIN = new Set<string>([
  'check',
  'chevron-down',
  'chevron-left',
  'chevron-right',
  'x',
  'plus',
  'arrow-right',
  'arrow-left',
  'external-link',
]);

export function isIconName(n: string): n is IconName {
  return n in ICONS;
}

/** Duotone by default; interface glyphs (arrows, carets, close) are drawn as plain lines. */
export function Icon({
  name,
  size = 20,
  color,
  weight,
  style,
}: {
  name: IconName | (string & {});
  size?: number;
  color?: string;
  weight?: IconWeight;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const key = isIconName(name) ? name : 'book-open';
  const Glyph = ICONS[key];
  return (
    <Glyph
      size={size}
      color={color ?? p.body}
      weight={weight ?? (PLAIN.has(key) ? 'regular' : 'duotone')}
      style={style}
    />
  );
}
