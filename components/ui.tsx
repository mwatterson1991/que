import { Children, Fragment, isValidElement, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { C, R, SP, TYPE, PRESS_OPACITY, type TypeKind } from "@/lib/tokens";

let Haptics: any = null;
try { Haptics = require("expo-haptics"); } catch {}

/**
 * ui.tsx — the primitives every screen is built from.
 *
 * They are UIKit shapes, drawn with UIKit's dark values and a white accent:
 *
 *   Screen      black ground
 *   Txt         text in one of Apple's text styles and one label colour
 *   Icon        a Feather glyph — the app's one icon set (thin line)
 *   Section     inset grouped list (title3 header, rounded cell group, footer)
 *   Row         a 56pt list cell: icon · title/subtitle · value · accessory
 *   Toggle      the native Switch, tinted like Apple's
 *   Button      prominent (white) / gray / plain / destructive — 54pt
 *   IconButton  a tinted glyph with a 44pt hit area (nav bar items)
 *   Field       a 52pt text field on `fill`, radius 16, 17pt text
 *   SearchField Field with a search glyph and a clear button
 *   Divider     a separator line
 *   Empty       a centred empty-state message
 *
 * Nothing here has a shadow, a gradient or a blur. If a screen needs a
 * shape that is not here, add it here, not in the screen.
 */

// ─── Screen ──────────────────────────────────────────────────────────────────

export function Screen({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.screen, style]} {...rest}>
      {children}
    </View>
  );
}

// ─── Txt ─────────────────────────────────────────────────────────────────────

export type Tone = "primary" | "secondary" | "tertiary" | "accent" | "danger" | "onAccent";

const TONE: Record<Tone, string> = {
  primary: C.label,
  secondary: C.labelSecondary,
  tertiary: C.labelTertiary,
  accent: C.accent,
  danger: C.danger,
  onAccent: C.onAccent,
};

export function Txt({
  kind = "body",
  tone = "primary",
  style,
  children,
  ...rest
}: TextProps & { kind?: TypeKind; tone?: Tone }) {
  return (
    <Text
      style={[TYPE[kind], { color: TONE[tone] }, style]}
      maxFontSizeMultiplier={kind === "clock" || kind === "clockHero" ? 1.2 : 1.6}
      {...rest}
    >
      {children}
    </Text>
  );
}

// ─── Icon (Feather — the app's one icon set) ─────────────────────────────────

/** A Feather glyph name. Feather is the app's icon set: thin, consistent line icons. */
export type IconName = keyof typeof Feather.glyphMap;
type IoniconName = keyof typeof Ionicons.glyphMap;
/** Feather names, plus legacy Ionicons names that older screens still pass. Prefer Feather. */
export type AnyIconName = IconName | IoniconName;

/**
 * The app's icon. Wraps Feather with the defaults a glyph next to body text
 * wants: 22pt, label white. Pass `color={C.labelTertiary}` for inactive glyphs.
 *
 *   <Icon name="bell" />
 *   <Icon name="chevron-right" size={20} color={C.labelTertiary} />
 */
export function Icon({
  name,
  size = 22,
  color = C.label,
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  return <Feather name={name} size={size} color={color} style={style} />;
}

/**
 * Ionicons names older screens still pass, mapped to the Feather glyph that
 * means the same thing, so they render as thin line icons without a change
 * at the call site. Anything not listed here and not a Feather name falls
 * back to Ionicons — a filled glyph, which is the cue to migrate it.
 */
const LEGACY: Partial<Record<IoniconName, IconName>> = {
  add: "plus",
  close: "x",
  checkmark: "check",
  "checkmark-circle": "check-circle",
  "chevron-back": "chevron-left",
  "chevron-forward": "chevron-right",
  "chevron-up": "chevron-up",
  "chevron-down": "chevron-down",
  "arrow-back": "arrow-left",
  "arrow-forward": "arrow-right",
  alarm: "bell",
  notifications: "bell",
  "notifications-outline": "bell",
  person: "user",
  "person-outline": "user",
  mail: "mail",
  "mail-outline": "mail",
  "phone-portrait": "smartphone",
  water: "droplet",
  "musical-notes": "music",
  book: "book",
  "stats-chart": "bar-chart-2",
  "ellipsis-horizontal": "more-horizontal",
  "ellipsis-horizontal-circle": "more-horizontal",
  "play-back": "rewind",
  "play-forward": "fast-forward",
  play: "play",
  pause: "pause",
  trash: "trash-2",
  "trash-outline": "trash-2",
  pencil: "edit-3",
  create: "edit-3",
  settings: "settings",
  "settings-outline": "settings",
  search: "search",
  moon: "moon",
  sunny: "sun",
  "log-out": "log-out",
  "log-out-outline": "log-out",
  "information-circle": "info",
  "help-circle": "help-circle",
  refresh: "refresh-cw",
  share: "share",
  "share-outline": "share",
  heart: "heart",
  "heart-outline": "heart",
  star: "star",
  "star-outline": "star",
  "volume-high": "volume-2",
  "volume-mute": "volume-x",
  headset: "headphones",
  cloud: "cloud",
  "cloud-outline": "cloud",
  time: "clock",
  "time-outline": "clock",
  calendar: "calendar",
  "calendar-outline": "calendar",
  flame: "zap",
  "lock-closed": "lock",
  "lock-closed-outline": "lock",
  eye: "eye",
  "eye-off": "eye-off",
};

/** Feather when the name is (or maps to) a Feather name; Ionicons only for unmapped legacy names. */
function Glyph({
  name,
  size,
  color,
  style,
}: {
  name: AnyIconName;
  size: number;
  color: string;
  style?: StyleProp<TextStyle>;
}) {
  const feather = name in Feather.glyphMap ? (name as IconName) : LEGACY[name as IoniconName];
  if (feather) return <Feather name={feather} size={size} color={color} style={style} />;
  return <Ionicons name={name as IoniconName} size={size} color={color} style={style} />;
}

// ─── Divider ─────────────────────────────────────────────────────────────────

export function Divider({ inset = 0, style }: { inset?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.separator, inset ? { marginLeft: inset } : null, style]} />;
}

// ─── Section (inset grouped list) ────────────────────────────────────────────

export function Section({
  header,
  footer,
  children,
  style,
}: {
  /** Sentence case. Rendered as a title3 semibold heading, not a tiny uppercase footnote. */
  header?: string;
  footer?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[styles.section, style]}>
      {header ? (
        <Txt kind="title3" style={styles.sectionHeader}>
          {header}
        </Txt>
      ) : null}
      <View style={styles.group}>
        {items.map((child, i) => (
          <Fragment key={(child as any).key ?? i}>
            {i > 0 && <Divider inset={SP.screen} />}
            {child}
          </Fragment>
        ))}
      </View>
      {footer ? (
        <Txt kind="footnote" tone="secondary" style={styles.sectionFooter}>
          {footer}
        </Txt>
      ) : null}
    </View>
  );
}

// ─── Row (list cell) ─────────────────────────────────────────────────────────

export function Row({
  title,
  subtitle,
  value,
  icon,
  iconColor = C.accent,
  accessory = "chevron",
  right,
  onPress,
  destructive = false,
  disabled = false,
  accessibilityLabel,
  style,
}: {
  title: string;
  subtitle?: string;
  value?: string;
  /** A Feather name (preferred). Legacy Ionicons names still render. */
  icon?: AnyIconName;
  iconColor?: string;
  /** chevron (default for tappable rows), none, or a custom node. */
  accessory?: "chevron" | "none" | ReactNode;
  /** Right-side control, e.g. a <Toggle />. Replaces value + accessory. */
  right?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const tappable = !!onPress && !disabled;
  const showChevron = tappable && accessory === "chevron" && !right;
  const content = (
    <>
      {icon && (
        <Glyph name={icon} size={22} color={destructive ? C.danger : iconColor} style={styles.rowIcon} />
      )}
      <View style={styles.rowBody}>
        <Txt
          kind="body"
          tone={destructive ? "danger" : "primary"}
          numberOfLines={1}
          style={disabled && { opacity: 0.4 }}
        >
          {title}
        </Txt>
        {subtitle ? (
          <Txt kind="footnote" tone="secondary" numberOfLines={2}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right ?? (
        <>
          {value ? (
            <Txt kind="body" tone="secondary" numberOfLines={1} style={styles.rowValue}>
              {value}
            </Txt>
          ) : null}
          {showChevron ? (
            <Icon name="chevron-right" size={20} color={C.labelTertiary} style={styles.chevron} />
          ) : accessory !== "chevron" && accessory !== "none" ? (
            accessory
          ) : null}
        </>
      )}
    </>
  );

  if (!tappable) {
    return (
      <View
        style={[styles.row, style]}
        accessible={!right}
        accessibilityLabel={accessibilityLabel ?? (value ? `${title}, ${value}` : title)}
      >
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed, style]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (value ? `${title}, ${value}` : title)}
    >
      {content}
    </Pressable>
  );
}

// ─── Toggle (native Switch) ──────────────────────────────────────────────────

export function Toggle({
  value,
  onValueChange,
  accessibilityLabel,
  disabled,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
}) {
  return (
    <Switch
      value={value}
      disabled={disabled}
      onValueChange={(v) => {
        Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle?.Light);
        onValueChange(v);
      }}
      trackColor={{ true: C.switchOn, false: C.fillHighest }}
      ios_backgroundColor={C.fillHighest}
      thumbColor={C.label}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

// ─── Button ──────────────────────────────────────────────────────────────────

export type ButtonTone = "prominent" | "gray" | "plain" | "destructive";

export function Button({
  title,
  tone = "prominent",
  icon,
  style,
  textStyle,
  disabled,
  onPress,
  haptic = true,
  ...rest
}: Omit<PressableProps, "style" | "children"> & {
  title: string;
  tone?: ButtonTone;
  /** A Feather name (preferred). Legacy Ionicons names still render. */
  icon?: AnyIconName;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  haptic?: boolean;
}) {
  const labelTone: Tone =
    tone === "prominent" ? "onAccent" : tone === "destructive" ? "danger" : tone === "plain" ? "accent" : "primary";
  const iconColor = TONE[labelTone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={(e) => {
        if (haptic) Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle?.Light);
        onPress?.(e);
      }}
      style={({ pressed }) => [
        styles.btn,
        styles[`btn_${tone}`],
        pressed && { opacity: PRESS_OPACITY },
        disabled && { opacity: 0.35 },
        style,
      ]}
      {...rest}
    >
      {icon && <Glyph name={icon} size={20} color={iconColor} />}
      <Txt kind="headline" tone={labelTone} style={textStyle}>
        {title}
      </Txt>
    </Pressable>
  );
}

// ─── IconButton (nav bar item) ───────────────────────────────────────────────

export function IconButton({
  icon,
  label,
  size = 24,
  color = C.accent,
  /** A translucent disc behind the glyph, for placement over artwork. */
  disc = false,
  disabled,
  style,
  onPress,
  ...rest
}: Omit<PressableProps, "style" | "children"> & {
  /** A Feather name (preferred). Legacy Ionicons names still render. */
  icon: AnyIconName;
  label: string;
  size?: number;
  color?: string;
  disc?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconBtn,
        disc && styles.iconBtnDisc,
        pressed && { opacity: PRESS_OPACITY },
        disabled && { opacity: 0.35 },
        style,
      ]}
      {...rest}
    >
      <Glyph name={icon} size={disc ? Math.min(size, 20) : size} color={disc ? C.label : color} />
    </Pressable>
  );
}

// ─── Field / SearchField ─────────────────────────────────────────────────────

export type FieldProps = Omit<TextInputProps, "style"> & {
  /** Leading Feather glyph. */
  icon?: IconName;
  /** When given, a clear glyph appears while there is text and calls this on press. */
  onClear?: () => void;
  /** Container style (the rounded fill). */
  style?: StyleProp<ViewStyle>;
  /** The TextInput's own style, for the rare alignment tweak. */
  inputStyle?: StyleProp<TextStyle>;
};

/**
 * A 52pt text field: `fill` ground, radius 16, 17pt body text. Thick and
 * intentional. Multiline callers should pass `multiline` and a taller
 * `style={{ height: ... }}`.
 */
export function Field({ icon, onClear, style, inputStyle, value, editable, ...rest }: FieldProps) {
  return (
    <View style={[styles.field, editable === false && { opacity: 0.5 }, style]}>
      {icon ? <Icon name={icon} size={20} color={C.labelSecondary} /> : null}
      <TextInput
        placeholderTextColor={C.labelTertiary}
        selectionColor={C.accent}
        cursorColor={C.accent}
        keyboardAppearance="dark"
        value={value}
        editable={editable}
        style={[styles.fieldInput, inputStyle]}
        {...rest}
      />
      {onClear && value ? (
        <Pressable
          onPress={onClear}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Clear text"
          style={({ pressed }) => pressed && { opacity: PRESS_OPACITY }}
        >
          <Icon name="x-circle" size={20} color={C.labelTertiary} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** A Field with a search glyph, search keyboard, and a clear button. */
export function SearchField({ placeholder = "Search", ...rest }: Omit<FieldProps, "icon">) {
  return (
    <Field
      icon="search"
      placeholder={placeholder}
      returnKeyType="search"
      autoCapitalize="none"
      autoCorrect={false}
      clearButtonMode="never"
      {...rest}
    />
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

export function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <View style={styles.empty}>
      <Txt kind="title3" tone="secondary" style={styles.center}>
        {title}
      </Txt>
      {body ? (
        <Txt kind="subheadline" tone="tertiary" style={[styles.center, { marginTop: SP.sm }]}>
          {body}
        </Txt>
      ) : null}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.separator,
  },

  // Plain list style: rows sit straight on the black ground with hairline
  // separators between them, the way Clock and Settings' top level do.
  // No grouped boxes.
  section: {
    marginTop: SP.xxl,
  },
  sectionHeader: {
    marginLeft: SP.screen,
    marginBottom: SP.md,
  },
  sectionFooter: {
    marginHorizontal: SP.screen,
    marginTop: SP.sm,
  },
  group: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: C.separator,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: SP.row,
    paddingHorizontal: SP.screen,
    paddingVertical: SP.rowY,
    backgroundColor: C.bg,
  },
  rowPressed: {
    backgroundColor: C.fill,
  },
  rowIcon: {
    marginRight: SP.md,
    width: 28,
    textAlign: "center",
  },
  rowBody: {
    flex: 1,
  },
  rowValue: {
    marginLeft: SP.md,
    flexShrink: 1,
  },
  chevron: {
    marginLeft: SP.sm,
  },

  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SP.sm,
    minHeight: SP.button,
    paddingHorizontal: SP.xl,
    borderRadius: R.lg,
    // Apple's continuous (squircle) corner, not a plain arc.
    borderCurve: "continuous",
    alignSelf: "stretch",
  },
  btn_prominent: { backgroundColor: C.accent },
  btn_gray: { backgroundColor: C.fillHigh },
  btn_plain: { backgroundColor: "transparent" },
  btn_destructive: { backgroundColor: "transparent" },

  iconBtn: {
    width: SP.hit,
    height: SP.hit,
    alignItems: "center",
    justifyContent: "center",
  },
  // A smaller disc inside the same 44pt hit area, so it reads as a quiet
  // control over artwork rather than a button.
  iconBtnDisc: {
    width: 34,
    height: 34,
    margin: (SP.hit - 34) / 2,
    borderRadius: R.pill,
    backgroundColor: C.overlayFill,
  },

  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.sm,
    minHeight: SP.field,
    paddingHorizontal: SP.lg,
    borderRadius: R.field,
    backgroundColor: C.fill,
  },
  fieldInput: {
    flex: 1,
    alignSelf: "stretch",
    paddingVertical: 0,
    fontSize: TYPE.body.fontSize,
    fontWeight: TYPE.body.fontWeight,
    letterSpacing: TYPE.body.letterSpacing,
    color: C.label,
  },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SP.xxxl,
  },
  center: {
    textAlign: "center",
  },
});
