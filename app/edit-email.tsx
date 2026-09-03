import { useState } from "react";
import { View, TextInput, ScrollView, Alert, StyleSheet, type TextInputProps } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Screen, Section, Button, Txt } from "@/components/ui";
import { C, SP, TYPE } from "@/lib/tokens";

function Field({ label, ...input }: TextInputProps & { label: string }) {
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
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        style={[TYPE.body, styles.input]}
        {...input}
      />
    </View>
  );
}

export default function EditEmailScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [email, setEmail] = useState(user?.email || "");
  const [confirmEmail, setConfirmEmail] = useState("");

  const trimmed = email.trim();
  const canSave = trimmed.includes("@") && trimmed !== (user?.email || "");

  const save = async () => {
    if (confirmEmail && confirmEmail !== email) {
      Alert.alert("Mismatch", "The email addresses don't match.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ email });
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Verification sent", "Check your new email to confirm the change.");
      router.back();
    }
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: "Email",
          headerRight: () => (
            <Button
              tone="plain"
              title="Save"
              haptic={false}
              disabled={!canSave}
              onPress={save}
              accessibilityLabel="Save email"
              style={styles.save}
            />
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Section header="New Email" footer="We'll send a verification link to your new email address.">
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="Email" />
          <Field label="Confirm" value={confirmEmail} onChangeText={setConfirmEmail} placeholder="Re-enter email" />
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
});
