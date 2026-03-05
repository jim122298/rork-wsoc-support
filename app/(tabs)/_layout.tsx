import { Tabs } from 'expo-router';
import React from 'react';
import GlassDock from '@/components/GlassDock';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <GlassDock {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Support',
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Ask',
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Articles',
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: 'Saved',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'More',
        }}
      />
    </Tabs>
  );
}
