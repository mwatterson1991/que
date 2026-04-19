import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Alert, StyleSheet } from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { F } from "@/lib/fonts";
import { useColors } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function EditEmailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const c = useColors();
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
        <Pressable onPress={save}>
          <Text style={{ color: c.fg, fontSize: 17, fontFamily: F.medium }}>Save</Text>
        </Pressable>
      ),
    });
  }, [navigation, email, confirmEmail, c.fg]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.scroll}>
      <View style={styles.field}>
        <Text style={[styles.label, { color: c.fgDim }]}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          style={[styles.input, { color: c.fg }]}
          placeholderTextColor={c.fgFaint}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <View style={[styles.sep, { backgroundColor: c.panelHigh }]} />

      <View style={styles.field}>
        <Text style={[styles.label, { color: c.fgDim }]}>Confirm</Text>
        <TextInput
          value={confirmEmail}
          onChangeText={setConfirmEmail}
          style={[styles.input, { color: c.fg }]}
          placeholderTextColor={c.fgFaint}
          placeholder="Re-enter email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <View style={[styles.sep, { backgroundColor: c.panelHigh }]} />

      <Text style={[styles.hint, { color: c.fgFaint }]}>
        We'll send a verification link to your new email address.
      </Text>
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
  sep: {
    height: StyleSheet.hairlineWidth,
  },
  hint: {
    fontSize: 14,
    fontFamily: F.regular,
    marginTop: 16,
    lineHeight: 20,
  },
});
