import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { Drawer } from "expo-router/drawer";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useNavigation } from "expo-router";


// expo-router v6 bundles its own drawer types that clash with the standalone
// package's; the narrow shape below is all this component actually uses.
type DrawerContentComponentProps = any;
import { F, S } from "@/lib/fonts";
import { useAuth } from "@/lib/auth";

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter();
  const { user } = useAuth();

  const navigate = (route: string) => {
    props.navigation.closeDrawer();
    router.push(route as any);
  };

  return (
    <View style={styles.drawer}>
      {/* Nav links */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={false}
      >
        <Pressable style={styles.navItem} onPress={() => navigate("/alarms")} accessibilityRole="button" accessibilityLabel="Alarms">
          <Ionicons name="alarm-outline" size={24} color="#f5f5f7" style={styles.navIcon} />
          <Text style={styles.navText}>Alarms</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => navigate("/search")} accessibilityRole="button" accessibilityLabel="Sounds">
          <Ionicons name="search-outline" size={24} color="#f5f5f7" style={styles.navIcon} />
          <Text style={styles.navText}>Sounds</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => navigate("/gratitude")} accessibilityRole="button" accessibilityLabel="Gratitude journal">
          <Ionicons name="create-outline" size={24} color="#f5f5f7" style={styles.navIcon} />
          <Text style={styles.navText}>Gratitude</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => navigate("/habit-track")} accessibilityRole="button" accessibilityLabel="Habit tracker">
          <Ionicons name="checkmark-circle-outline" size={24} color="#f5f5f7" style={styles.navIcon} />
          <Text style={styles.navText}>Track</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => navigate("/profile-page?from=drawer")} accessibilityRole="button" accessibilityLabel="You">
          <Ionicons name="person-outline" size={24} color="#f5f5f7" style={styles.navIcon} />
          <Text style={styles.navText}>You</Text>
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
    </View>
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
    <Pressable onPress={() => router.push("/edit-alarm" as any)} accessibilityRole="button" accessibilityLabel="Add alarm">
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
    <Drawer
      initialRouteName="alarms"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: "#020805",
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: "#f5f5f7",
        headerTitleStyle: {
          fontFamily: F.semibold,
          fontSize: S.body,
        },
        drawerStyle: { backgroundColor: "#04120b", width: 280 },
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
          title: "Alarms",
          headerLeft: () => <HamburgerButton />,
          headerRight: () => <AddAlarmButton />,
        }}
      />
      <Drawer.Screen
        name="search"
        options={{
          title: "Sounds",
          headerLeft: () => <HamburgerButton />,
          headerRight: () => <SuggestButton />,
        }}
      />
      <Drawer.Screen
        name="profile-page"
        options={{ title: "You", drawerItemStyle: { display: "none" } }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawer: {
    flex: 1,
    backgroundColor: "#04120b",
    paddingTop: 60,
  },
  scrollContent: {
    paddingTop: 4,
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
