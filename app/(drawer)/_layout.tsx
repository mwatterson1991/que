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
import { useColors } from "@/lib/theme";

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter();
  const { user } = useAuth();
  const c = useColors();

  const navigate = (route: string) => {
    props.navigation.closeDrawer();
    router.push(route as any);
  };

  return (
    <View style={[styles.drawer, { backgroundColor: c.bgDeep }]}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={false}
      >
        <Pressable style={styles.navItem} onPress={() => navigate("/")}>
          <Ionicons name="chatbubble-outline" size={24} color={c.fg} style={styles.navIcon} />
          <Text style={[styles.navText, { color: c.fg }]}>Chat</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => navigate("/alarms")}>
          <Ionicons name="alarm-outline" size={24} color={c.fg} style={styles.navIcon} />
          <Text style={[styles.navText, { color: c.fg }]}>Alarms</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => navigate("/search")}>
          <Ionicons name="search-outline" size={24} color={c.fg} style={styles.navIcon} />
          <Text style={[styles.navText, { color: c.fg }]}>Search</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => navigate("/create")}>
          <Ionicons name="add" size={24} color={c.fg} style={styles.navIcon} />
          <Text style={[styles.navText, { color: c.fg }]}>Create</Text>
        </Pressable>
      </DrawerContentScrollView>

      <View style={styles.bottomSection}>
        {user ? (
          <Text style={[styles.bottomText, { color: c.fgDim }]}>
            Signed in as {user.email}
          </Text>
        ) : (
          <>
            <Text style={[styles.bottomText, { color: c.fgDim }]}>
              Save your alarms, share mantras, and personalize your experience.
            </Text>
            <Pressable
              style={[styles.signUpButton, { backgroundColor: c.fg }]}
              onPress={() => navigate("/auth")}
            >
              <Text style={[styles.signUpText, { color: c.fgInverted }]}>Sign up or log in</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

function AddAlarmButton() {
  const router = useRouter();
  const c = useColors();
  return (
    <Pressable onPress={() => router.push("/edit-alarm" as any)}>
      <Ionicons
        name="add"
        size={28}
        color={c.fg}
        style={{ marginRight: 16 }}
      />
    </Pressable>
  );
}

function ProfileButton() {
  const router = useRouter();
  const c = useColors();
  return (
    <Pressable onPress={() => router.push("/profile-page" as any)}>
      <Ionicons
        name="person-outline"
        size={20}
        color={c.fg}
        style={{ marginRight: 16 }}
      />
    </Pressable>
  );
}

export default function DrawerLayout() {
  const c = useColors();

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: c.bg,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: c.fg,
        headerTitleStyle: {
          fontFamily: F.semibold,
          fontSize: 17,
        },
        drawerStyle: { backgroundColor: c.bgDeep, width: 280 },
        sceneContainerStyle: { flex: 1, backgroundColor: c.bg },
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
            color: c.fg,
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
    fontSize: 24,
    fontFamily: F.medium,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  bottomText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    fontFamily: F.regular,
  },
  signUpButton: {
    borderRadius: 26,
    paddingVertical: 16,
    alignItems: "center",
  },
  signUpText: {
    fontSize: 16,
    fontFamily: F.semibold,
  },
});
