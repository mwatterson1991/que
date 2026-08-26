import { useCallback } from "react";
import { useFocusEffect, useNavigation } from "expo-router";

// Home base is the alarms list — the drawer's index just forwards there.
// Chat lives at /chat. Uses the drawer's own navigate (router.replace
// does not switch drawer screens on expo-router v3).
export default function DrawerIndex() {
  const navigation = useNavigation();
  useFocusEffect(
    useCallback(() => {
      navigation.navigate("alarms" as never);
    }, [navigation]),
  );
  return null;
}
