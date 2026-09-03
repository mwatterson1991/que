import { Redirect } from "expo-router";

// Home base is the alarms tab. The auth gate in the root layout redirects
// away from here to welcome / onboarding when there is no session yet.
export default function Index() {
  return <Redirect href="/alarms" />;
}
