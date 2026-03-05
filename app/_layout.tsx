import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState, useCallback } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BookmarkProvider } from "@/contexts/BookmarkContext";
import { ZendeskProvider } from "@/contexts/ZendeskContext";
import { Colors } from "@/constants/colors";
import LoadingScreen from "@/components/LoadingScreen";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.primary,
        headerTitleStyle: { color: Colors.text, fontWeight: "600" as const },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="article/[id]"
        options={{
          title: "Article",
          presentation: "card",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [showLoading, setShowLoading] = useState<boolean>(true);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  const handleLoadingFinish = useCallback(() => {
    setShowLoading(false);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView>
        <ZendeskProvider>
          <BookmarkProvider>
            <RootLayoutNav />
            {showLoading && <LoadingScreen onFinish={handleLoadingFinish} />}
          </BookmarkProvider>
        </ZendeskProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
