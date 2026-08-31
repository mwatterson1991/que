import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import AuroraBackground from "@/components/AuroraBackground";
import { Drawer } from "expo-router/drawer";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useNavigation, useLocalSearchParams } from "expo-router";


// expo-router v6 bundles its own drawer types that clash with the standalone
// package's; the narrow shape below is all this component actually uses.
type DrawerContentComponentProps = any;
import { F, S } from "@/lib/fonts";
import { Glass } from "@/components/Glass";
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
            <Pressable
              style={styles.signUpButton}
              onPress={() => navigate("/auth")}
              accessibilityRole="button"
            >
              <Text style={styles.signUpText}>Sign up or log in</Text>
            </Pressable>
          </>
        )}
      </View>
    </Glass>
  );
}

function AdaptiveLeft() {
  const navigation = useNavigation();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const cameFromDrawer = from === "drawer";

  return (
    <Pressable
      onPress={() => (cameFromDrawer ? (navigation as any).openDrawer() : router.back())}
      style={{ marginLeft: 16, padding: 4 }}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={cameFromDrawer ? "Open menu" : "Go back"}
    >
      <Ionicons name={cameFromDrawer ? "menu-outline" : "chevron-back"} size={26} color="#f5f5f7" />
    </Pressable>
  );
}

function SuggestButton() {
  const router = useRouter();
  // We pass a query param that search.tsx reads via useFocusEffect to open the modal
  return (
    <Pressable
      onPress={() => router.setParams({ suggest: "1" })}
      style={{ marginRight: 16, padding: 4 }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Suggest a session"
    >
      <Ionicons name="add" size={26} color="#f5f5f7" />
    </Pressable>
  );
}

function AddAlarmButton() {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push("/alarm-config" as any)} accessibilityRole="button" accessibilityLabel="Add alarm">
      <Ionicons
        name="add"
        size={28}
        color="#f5f5f7"
        style={{ marginRight: 16 }}
      />
    </Pressable>
  );
}

function HamburgerButton() {
  const navigation = useNavigation();
  return (
    <Pressable
      onPress={() => (navigation as any).openDrawer()}
      style={{ marginLeft: 16, padding: 4 }}
      accessibilityRole="button"
      accessibilityLabel="Open menu"
    >
      <Ionicons name="menu-outline" size={26} color="#f5f5f7" />
    </Pressable>
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
        headerTransparent: true,
        headerBackground: () => <Glass style={{ flex: 1 }} />,
        headerStyle: {
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: "#f5f5f7",
        headerTitleStyle: {
          fontFamily: F.semibold,
          fontSize: S.body,
        },
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
          headerTitleStyle: {
            fontFamily: "Lora",
            fontSize: S.title,
            fontWeight: "400",
            color: "#f5f5f7",
          },
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
          headerTransparent: false,
          headerBackground: undefined,
          headerStyle: { backgroundColor: "#000000" },
          sceneStyle: { backgroundColor: "#000000" },
        }}
      />
      <Drawer.Screen
        name="profile-page"
        options={{ title: "Progress", drawerItemStyle: { display: "none" } }}
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
  signUpButton: {
    backgroundColor: "#f5f5f7",
    borderRadius: 26,
    paddingVertical: 16,
    alignItems: "center",
  },
  signUpText: {
    color: "#000000",
    fontSize: S.body,
    fontFamily: F.semibold,
  },
});
