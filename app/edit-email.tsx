import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Alert, StyleSheet } from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { F, S } from "@/lib/fonts";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function EditEmailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();

  const [email, setEmail] = useState(user?.email || "");
  const [confirmEmail, setConfirmEmail] = useState("");

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

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={save} accessibilityRole="button" accessibilityLabel="Save email">
          <Text style={{ color: "#f5f5f7", fontSize: S.body, fontFamily: F.medium }}>Save</Text>
        </Pressable>
      ),
    });
  }, [navigation, email, confirmEmail]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          placeholderTextColor="#52525b"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <View style={styles.sep} />

      <View style={styles.field}>
        <Text style={styles.label}>Confirm</Text>
        <TextInput
          value={confirmEmail}
          onChangeText={setConfirmEmail}
          style={styles.input}
          placeholderTextColor="#52525b"
          placeholder="Re-enter email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <View style={styles.sep} />

      <Text style={styles.hint}>
        We'll send a verification link to your new email address.
      </Text>
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
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#2c2c2e",
  },
  hint: {
    color: "#52525b",
    fontSize: S.caption,
    fontFamily: F.regular,
    marginTop: 16,
    lineHeight: 20,
  },
});
