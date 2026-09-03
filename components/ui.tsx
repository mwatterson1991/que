import { Children, Fragment, isValidElement, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, R, SP, TYPE, PRESS_OPACITY, type TypeKind } from "@/lib/tokens";

let Haptics: any = null;
try { Haptics = require("expo-haptics"); } catch {}

/**
 * ui.tsx — the primitives every screen is built from.
 *
 * They are UIKit shapes, drawn with UIKit's dark values:
 *
 *   Screen      black ground
 *   Txt         text in one of Apple's text styles and one label colour
 *   Section     inset grouped list (header, rounded cell group, footer)
 *   Row         a 44pt list cell: icon · title/subtitle · value · accessory
 *   Toggle      the native Switch, tinted like Apple's
 *   Button      prominent (orange) / gray / plain / destructive
 *   IconButton  a tinted glyph with a 44pt hit area (nav bar items)
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
  header?: string;
  footer?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[styles.section, style]}>
      {header ? (
        <Txt kind="footnote" tone="secondary" style={styles.sectionHeader}>
          {header.toUpperCase()}
        </Txt>
      ) : null}
      <View style={styles.group}>
        {items.map((child, i) => (
          <Fragment key={(child as any).key ?? i}>
            {i > 0 && <Divider inset={SP.lg} />}
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
  icon?: keyof typeof Ionicons.glyphMap;
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
        <Ionicons name={icon} size={22} color={destructive ? C.danger : iconColor} style={styles.rowIcon} />
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
            <Ionicons name="chevron-forward" size={18} color={C.labelTertiary} style={styles.chevron} />
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
  icon?: keyof typeof Ionicons.glyphMap;
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
      {icon && <Ionicons name={icon} size={20} color={iconColor} />}
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
  size = 26,
  color = C.accent,
  /** A translucent disc behind the glyph, for placement over artwork. */
  disc = false,
  disabled,
  style,
  onPress,
  ...rest
}: Omit<PressableProps, "style" | "children"> & {
  icon: keyof typeof Ionicons.glyphMap;
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
      <Ionicons name={icon} size={size} color={disc ? C.label : color} />
    </Pressable>
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

  section: {
    paddingHorizontal: SP.screen,
    marginTop: SP.xl,
  },
  sectionHeader: {
    marginLeft: SP.lg,
    marginBottom: SP.sm,
  },
  sectionFooter: {
    marginHorizontal: SP.lg,
    marginTop: SP.sm,
  },
  group: {
    backgroundColor: C.fill,
    borderRadius: R.md,
    overflow: "hidden",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: SP.row,
    paddingHorizontal: SP.lg,
    paddingVertical: SP.md,
    backgroundColor: C.fill,
  },
  rowPressed: {
    backgroundColor: C.fillHigh,
  },
  rowIcon: {
    marginRight: SP.md,
    width: 26,
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
    minHeight: 50,
    paddingHorizontal: SP.xl,
    borderRadius: R.lg,
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
  iconBtnDisc: {
    borderRadius: R.pill,
    backgroundColor: C.overlayFill,
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
