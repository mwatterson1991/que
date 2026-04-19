import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Alert, StyleSheet } from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { F } from "@/lib/fonts";
import { useColors } from "@/lib/theme";
import { useProfile } from "@/lib/useSupabase";

export default function EditProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const c = useColors();
  const { profile, update } = useProfile();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setUsername(profile.username || "");
      setBio(profile.bio || "");
    }
  }, [profile]);

  const save = async () => {
    const result = await update({
      first_name: firstName,
      last_name: lastName,
      username: username || null,
      bio: bio || null,
    });
    if (result?.error) {
      Alert.alert("Error", result.error.message);
    } else {
      router.back();
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={save}>
          <Text style={{ color: c.fg, fontSize: 17, fontFamily: F.medium }}>Save</Text>
        </Pressable>
      ),
    });
  }, [navigation, firstName, lastName, username, bio, c.fg]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.scroll}>
      <View style={styles.field}>
        <Text style={[styles.label, { color: c.fgDim }]}>First Name</Text>
        <TextInput
          value={firstName}
          onChangeText={setFirstName}
          style={[styles.input, { color: c.fg }]}
          placeholderTextColor={c.fgFaint}
        />
      </View>
      <View style={[styles.sep, { backgroundColor: c.panelHigh }]} />

      <View style={styles.field}>
        <Text style={[styles.label, { color: c.fgDim }]}>Last Name</Text>
        <TextInput
          value={lastName}
          onChangeText={setLastName}
          style={[styles.input, { color: c.fg }]}
          placeholderTextColor={c.fgFaint}
        />
      </View>
      <View style={[styles.sep, { backgroundColor: c.panelHigh }]} />

      <View style={styles.field}>
        <Text style={[styles.label, { color: c.fgDim }]}>Username</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          style={[styles.input, { color: c.fg }]}
          placeholderTextColor={c.fgFaint}
          autoCapitalize="none"
        />
      </View>
      <View style={[styles.sep, { backgroundColor: c.panelHigh }]} />

      <View style={styles.field}>
        <Text style={[styles.label, { color: c.fgDim }]}>Bio</Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          style={[styles.input, styles.bioInput, { color: c.fg }]}
          placeholderTextColor={c.fgFaint}
          placeholder="Tell us about yourself..."
          multiline
          numberOfLines={3}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 48,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  label: {
    fontSize: 15,
    fontFamily: F.regular,
    width: 110,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: F.regular,
    textAlign: "right",
  },
  bioInput: {
    textAlign: "right",
    minHeight: 60,
    textAlignVertical: "top",
  },
  sep: {
    height: StyleSheet.hairlineWidth,
  },
});
