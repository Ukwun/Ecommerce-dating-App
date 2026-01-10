import OnboardingScreen from "../screens/onboarding/onboarding.screen";
import { Redirect } from "expo-router";
import React from "react";
import { useAuth } from "@/hooks/AuthContext";
import { View } from "react-native";

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <View />; // Or a loading spinner
  if (user) {
    return <Redirect href={"/(tabs)"} />;
  }

  return <OnboardingScreen />;
}
