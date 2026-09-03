import { useState, useEffect } from "react";
import { View, TextInput, ScrollView, Alert, StyleSheet, type TextInputProps } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useProfile } from "@/lib/useSupabase";
import { Screen, Section, Button, Txt } from "@/components/ui";
import { C, SP, TYPE } from "@/lib/tokens";

// A label + text field pair, the way Contacts lays out an editable card.
function Field({ label, style, ...input }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Txt kind="body" tone="secondary" style={styles.fieldLabel}>
        {label}
      </Txt>
      <TextInput
        placeholderTextColor={C.labelTertiary}
        selectionColor={C.accent}
        accessibilityLabel={label}
        maxFontSizeMultiplier={1.6}
        style={[TYPE.body, styles.input, style]}
        {...input}
      />
    </View>
  );
}

export default function EditProfileScreen() {
  const router = useRouter();
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

  const dirty =
    firstName !== (profile?.first_name || "") ||
    lastName !== (profile?.last_name || "") ||
    username !== (profile?.username || "") ||
    bio !== (profile?.bio || "");

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

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: "Profile",
          headerRight: () => (
            <Button tone="plain" title="Save" haptic={false} disabled={!dirty} onPress={save} accessibilityLabel="Save profile" style={styles.save} />
          ),
        }}
      />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Section header="Name">
          <Field label="First" value={firstName} onChangeText={setFirstName} placeholder="First name" />
          <Field label="Last" value={lastName} onChangeText={setLastName} placeholder="Last name" />
        </Section>

        <Section header="Profile">
          <Field label="Username" value={username} onChangeText={setUsername} placeholder="Username" autoCapitalize="none" />
          <Field
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself..."
            multiline
            numberOfLines={3}
            style={styles.bio}
          />
        </Section>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: SP.xxxl,
  },
  save: {
    minHeight: 0,
    paddingHorizontal: 0,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: SP.row,
    paddingHorizontal: SP.lg,
    paddingVertical: SP.sm,
    backgroundColor: C.fill,
  },
  fieldLabel: {
    width: 96,
  },
  input: {
    flex: 1,
    color: C.label,
    paddingVertical: 0,
  },
  bio: {
    minHeight: 60,
    textAlignVertical: "top",
  },
});
