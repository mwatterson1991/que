import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import AuroraBackground from "@/components/AuroraBackground";
import { Drawer } from "expo-router/drawer";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useNavigation, useLocalSearchParams } from "expo-router";


// expo-router v6 bundles its own drawer types that clash with the standalone
// package's; the narrow shape below is all this component actually uses.
type DrawerContentComponentProps = any;
import { F, S } from "@/lib/fonts";
import { Glass, GlassButton } from "@/components/Glass";
import { NavGlassButton, NavGlassTitle } from "../_layout";
import { useAuth } from "@/lib/auth";

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter();
  const { user } = useAuth();

  const navigate = (route: string) => {
    props.navigation.closeDrawer();
    router.push(route as any);
  };

  // Every destination carries from=drawer so its back control knows to
  // return here rather than unwinding to whatever screen came before.
  const NAV = [
    { route: "/alarms", icon: "alarm-outline", label: "Wake", a11y: "Wake — your alarms" },
    { route: "/search", icon: "musical-notes-outline", label: "Listen", a11y: "Listen — sounds and channels" },
    { route: "/habit-track?from=drawer", icon: "repeat-outline", label: "Habits", a11y: "Habits — daily tracking" },
    { route: "/gratitude?from=drawer", icon: "create-outline", label: "Gratitude", a11y: "Gratitude journal" },
    { route: "/profile-page?from=drawer", icon: "stats-chart-outline", label: "Progress", a11y: "Progress — your positivity graph" },
  ] as const;

  return (
    <Glass scrim="strong" style={styles.drawer}>
      {/* Nav links */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={false}
      >
        {NAV.map((item) => (
          <Pressable
            key={item.route}
            style={styles.navItem}
            onPress={() => navigate(item.route)}
            accessibilityRole="button"
            accessibilityLabel={item.a11y}
          >
            <Ionicons name={item.icon as any} size={24} color="#f5f5f7" style={styles.navIcon} />
            <Text style={styles.navText}>{item.label}</Text>
          </Pressable>
        ))}

        <View style={styles.navSep} />

        <Pressable
          style={styles.navItem}
          onPress={() => navigate("/goodnight")}
          accessibilityRole="button"
          accessibilityLabel="Goodnight — wind down for sleep"
        >
          <Ionicons name="moon-outline" size={24} color="#f5f5f7" style={styles.navIcon} />
          <Text style={styles.navText}>Goodnight</Text>
        </Pressable>

        <Pressable
          style={styles.navItem}
          onPress={() => navigate("/settings")}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Ionicons name="settings-outline" size={24} color="#f5f5f7" style={styles.navIcon} />
          <Text style={styles.navText}>Settings</Text>
        </Pressable>
      </ScrollView>

      {/* Bottom section */}
      <View style={styles.bottomSection}>
        {user ? (
          <Text style={styles.bottomText}>
            Signed in as {user.email}
          </Text>
        ) : (
          <>
            <Text style={styles.bottomText}>
              Save your alarms, share mantras, and personalize your experience.
            </Text>
            <Pressable onPress={() => navigate("/auth")} accessibilityRole="button">
              <GlassButton tone="bright" phase={0.2}>
                <Text style={styles.signUpText}>Sign up or log in</Text>
              </GlassButton>
            </Pressable>
          </>
        )}
      </View>
    </Glass>
  );
}

// The nav's three pieces are all NavGlassButton / NavGlassTitle (defined in
// the root layout) so the drawer and the stack render the identical shapes.
// Only the phase differs left to right, so the sheen crosses the nav rather
// than flashing across all of it at once.
const RIGHT_PHASE = 0.68;

function AdaptiveLeft() {
  const navigation = useNavigation();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const cameFromDrawer = from === "drawer";

  return (
    <NavGlassButton
      icon={cameFromDrawer ? "menu-outline" : "chevron-back"}
      label={cameFromDrawer ? "Open menu" : "Go back"}
      onPress={() => (cameFromDrawer ? (navigation as any).openDrawer() : router.back())}
    />
  );
}

function SuggestButton() {
  const router = useRouter();
  // We pass a query param that search.tsx reads via useFocusEffect to open the modal
  return (
    <NavGlassButton
      icon="add"
      label="Suggest a session"
      phase={RIGHT_PHASE}
      onPress={() => router.setParams({ suggest: "1" })}
    />
  );
}

function AddAlarmButton() {
  const router = useRouter();
  return (
    <NavGlassButton
      icon="add"
      label="Add alarm"
      phase={RIGHT_PHASE}
      iconSize={24}
      onPress={() => router.push("/alarm-config" as any)}
    />
  );
}

function HamburgerButton() {
  const navigation = useNavigation();
  return (
    <NavGlassButton
      icon="menu-outline"
      label="Open menu"
      onPress={() => (navigation as any).openDrawer()}
    />
  );
}

export default function DrawerLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: "#020805" }}>
      <AuroraBackground />
    <Drawer
      initialRouteName="alarms"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        // No bar: the header area is empty and the three glass pieces float
        // over the aurora that the navigator itself is painting.
        headerTransparent: true,
        headerBackground: () => null,
        headerStyle: {
          backgroundColor: "transparent",
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: "#f5f5f7",
        headerTitleAlign: "center",
        headerTitle: ({ children }) => <NavGlassTitle>{children}</NavGlassTitle>,
        sceneStyle: { backgroundColor: "transparent" },
        drawerStyle: { backgroundColor: "transparent", width: 280 },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{ headerShown: false, drawerItemStyle: { display: "none" } }}
      />
      {/* Chat is parked for now — reachable by route only, not in the menu */}
      <Drawer.Screen
        name="chat"
        options={{
          title: "Morning Que",
          drawerItemStyle: { display: "none" },
          headerTitle: ({ children }) => <NavGlassTitle serif>{children}</NavGlassTitle>,
          headerLeft: () => <HamburgerButton />,
        }}
      />
      <Drawer.Screen
        name="alarms"
        options={{
          title: "Wake",
          headerLeft: () => <HamburgerButton />,
          headerRight: () => <AddAlarmButton />,
        }}
      />
      <Drawer.Screen
        name="search"
        options={{
          title: "Listen",
          headerLeft: () => <HamburgerButton />,
          headerRight: () => <SuggestButton />,
        }}
      />
      <Drawer.Screen
        name="habit-track"
        options={{
          title: "Habits",
          drawerItemStyle: { display: "none" },
          headerLeft: () => <AdaptiveLeft />,
        }}
      />
      <Drawer.Screen
        name="gratitude"
        options={{
          title: "Gratitude",
          drawerItemStyle: { display: "none" },
          headerLeft: () => <AdaptiveLeft />,
          // The writing surface keeps its solid black header — the glass
          // pieces still float on it, but nothing shows through behind them.
          headerTransparent: false,
          headerBackground: undefined,
          headerStyle: { backgroundColor: "#000000" },
          sceneStyle: { backgroundColor: "#000000" },
        }}
      />
      <Drawer.Screen
        name="profile-page"
        options={{
          title: "Progress",
          drawerItemStyle: { display: "none" },
          headerLeft: () => <AdaptiveLeft />,
        }}
      />
    </Drawer>
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    flex: 1,
    paddingTop: 60,
  },
  scrollContent: {
    paddingTop: 4,
  },
  navSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginVertical: 10,
    marginHorizontal: 20,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  navIcon: {
    marginRight: 12,
  },
  navText: {
    color: "#f5f5f7",
    fontSize: S.title,
    fontFamily: F.medium,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  bottomText: {
    color: "#8b8b93",
    fontSize: S.caption,
    lineHeight: 20,
    marginBottom: 16,
    fontFamily: F.regular,
  },
  signUpText: {
    color: "#ffffff",
    fontSize: S.body,
    fontFamily: F.semibold,
  },
});
