import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Alert, StyleSheet } from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { F, S } from "@/lib/fonts";
import { useProfile } from "@/lib/useSupabase";

export default function EditProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { profile, update } = useProfile();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  // Populate fields from Supabase profile
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
        <Pressable onPress={save} accessibilityRole="button" accessibilityLabel="Save profile">
          <Text style={{ color: "#f5f5f7", fontSize: S.body, fontFamily: F.medium }}>Save</Text>
        </Pressable>
      ),
    });
  }, [navigation, firstName, lastName, username, bio]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <View style={styles.field}>
        <Text style={styles.label}>First Name</Text>
        <TextInput
          value={firstName}
          onChangeText={setFirstName}
          style={styles.input}
          placeholderTextColor="#52525b"
        />
      </View>
      <View style={styles.sep} />

      <View style={styles.field}>
        <Text style={styles.label}>Last Name</Text>
        <TextInput
          value={lastName}
          onChangeText={setLastName}
          style={styles.input}
          placeholderTextColor="#52525b"
        />
      </View>
      <View style={styles.sep} />

      <View style={styles.field}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          style={styles.input}
          placeholderTextColor="#52525b"
          autoCapitalize="none"
        />
      </View>
      <View style={styles.sep} />

      <View style={styles.field}>
        <Text style={styles.label}>Bio</Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          style={[styles.input, styles.bioInput]}
          placeholderTextColor="#52525b"
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
    backgroundColor: "#000000",
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
    color: "#8b8b93",
    fontSize: S.secondary,
    fontFamily: F.regular,
    width: 110,
  },
  input: {
    flex: 1,
    color: "#f5f5f7",
    fontSize: S.body,
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
    backgroundColor: "#2c2c2e",
  },
});
