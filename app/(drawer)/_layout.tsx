import { View, Text, Pressable, StyleSheet } from "react-native";
import { Drawer } from "expo-router/drawer";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { DrawerActions } from "@react-navigation/routers";
import {
  DrawerContentScrollView,
  type DrawerContentComponentProps,
} from "@react-navigation/drawer";
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
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={false}
      >
        <Pressable style={styles.navItem} onPress={() => navigate("/alarms")} accessibilityRole="button" accessibilityLabel="Alarms">
          <Ionicons name="alarm-outline" size={24} color="#f5f5f7" style={styles.navIcon} />
          <Text style={styles.navText}>Alarms</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => navigate("/chat")} accessibilityRole="button" accessibilityLabel="Chat">
          <Ionicons name="chatbubble-outline" size={24} color="#f5f5f7" style={styles.navIcon} />
          <Text style={styles.navText}>Chat</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => navigate("/search")} accessibilityRole="button" accessibilityLabel="Sounds">
          <Ionicons name="search-outline" size={24} color="#f5f5f7" style={styles.navIcon} />
          <Text style={styles.navText}>Sounds</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => navigate("/gratitude")} accessibilityRole="button" accessibilityLabel="Gratitude log">
          <Ionicons name="heart-outline" size={24} color="#f5f5f7" style={styles.navIcon} />
          <Text style={styles.navText}>Gratitude</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => navigate("/habit-track")} accessibilityRole="button" accessibilityLabel="Habit tracker">
          <Ionicons name="checkmark-circle-outline" size={24} color="#f5f5f7" style={styles.navIcon} />
          <Text style={styles.navText}>Habits</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => navigate("/profile-page?from=drawer")} accessibilityRole="button" accessibilityLabel="Profile">
          <Ionicons name="person-outline" size={24} color="#f5f5f7" style={styles.navIcon} />
          <Text style={styles.navText}>Profile</Text>
        </Pressable>
      </DrawerContentScrollView>

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
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      style={{ marginLeft: 16, padding: 4 }}
      accessibilityRole="button"
      accessibilityLabel="Open menu"
    >
      <Ionicons name="menu-outline" size={26} color="#f5f5f7" />
    </Pressable>
  );
}

function ProfileButton() {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push("/profile-page" as any)} accessibilityRole="button" accessibilityLabel="Profile">
      <Ionicons
        name="person-outline"
        size={20}
        color="#f5f5f7"
        style={{ marginRight: 16 }}
      />
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
          backgroundColor: "#000000",
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: "#f5f5f7",
        headerTitleStyle: {
          fontFamily: F.semibold,
          fontSize: S.body,
        },
        drawerStyle: { backgroundColor: "#000000", width: 280 },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{ headerShown: false, drawerItemStyle: { display: "none" } }}
      />
      <Drawer.Screen
        name="chat"
        options={{
          title: "Morning Q",
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
      <Drawer.Screen name="create" options={{ title: "Create", drawerItemStyle: { display: "none" } }} />
      <Drawer.Screen
        name="profile-page"
        options={{ title: "Profile", drawerItemStyle: { display: "none" } }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawer: {
    flex: 1,
    backgroundColor: "#000000",
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
    color: "#71717a",
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
