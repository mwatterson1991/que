import { View, Text, Pressable, StyleSheet } from "react-native";
import { Drawer } from "expo-router/drawer";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  DrawerContentScrollView,
  type DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { F } from "@/lib/fonts";
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
        <Pressable style={styles.navItem} onPress={() => navigate("/")} accessibilityRole="button" accessibilityLabel="Chat">
          <Ionicons name="chatbubble-outline" size={24} color="#f5f5f7" style={styles.navIcon} />
          <Text style={styles.navText}>Chat</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => navigate("/alarms")} accessibilityRole="button" accessibilityLabel="Alarms">
          <Ionicons name="alarm-outline" size={24} color="#f5f5f7" style={styles.navIcon} />
          <Text style={styles.navText}>Alarms</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => navigate("/search")} accessibilityRole="button" accessibilityLabel="Search">
          <Ionicons name="search-outline" size={24} color="#f5f5f7" style={styles.navIcon} />
          <Text style={styles.navText}>Search</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => navigate("/create")} accessibilityRole="button" accessibilityLabel="Create">
          <Ionicons name="add" size={24} color="#f5f5f7" style={styles.navIcon} />
          <Text style={styles.navText}>Create</Text>
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
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: "#0b0b0f",
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: "#f5f5f7",
        headerTitleStyle: {
          fontFamily: F.semibold,
          fontSize: 17,
        },
        drawerStyle: { backgroundColor: "#000000", width: 280 },
        sceneContainerStyle: { flex: 1, backgroundColor: "#0b0b0f" },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: "Morning Q",
          headerTitleStyle: {
            fontFamily: "Lora",
            fontSize: 21,
            fontWeight: "400",
            color: "#f5f5f7",
          },
          headerRight: () => <ProfileButton />,
        }}
      />
      <Drawer.Screen
        name="alarms"
        options={{
          title: "Alarms",
          headerRight: () => <AddAlarmButton />,
        }}
      />
      <Drawer.Screen name="search" options={{ title: "Search" }} />
      <Drawer.Screen name="create" options={{ title: "Create" }} />
      <Drawer.Screen name="profile" options={{ title: "Profile", drawerItemStyle: { display: "none" } }} />
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
    fontSize: 24,
    fontFamily: F.medium,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  bottomText: {
    color: "#71717a",
    fontSize: 14,
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
    fontSize: 16,
    fontFamily: F.semibold,
  },
});
