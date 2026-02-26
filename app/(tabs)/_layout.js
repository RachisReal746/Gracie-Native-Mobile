import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#53ABB5',
                tabBarInactiveTintColor: '#9CA3AF',
                headerShown: false,
                headerStyle: {
                    backgroundColor: '#53ABB5',
                },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: {
                    fontFamily: 'ShadowsIntoLight_400Regular',
                    fontSize: 24,
                },
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'grid' : 'grid-outline'} size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="chat"
                options={{
                    title: 'Chat',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="journal"
                options={{
                    title: 'Journal',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'book' : 'book-outline'} size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="training"
                options={{
                    title: 'Training',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'school' : 'school-outline'} size={24} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
