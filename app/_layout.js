import { Stack, router } from "expo-router";
import { useFonts } from "expo-font";
import { ShadowsIntoLight_400Regular } from "@expo-google-fonts/shadows-into-light";
import { Questrial_400Regular } from "@expo-google-fonts/questrial";
import { BioRhyme_400Regular } from "@expo-google-fonts/biorhyme";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import "../global.css";

SplashScreen.preventAutoHideAsync();

// Show notifications when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://192.168.0.20:3000";

// Message prefilled into chat input based on notification action tapped
const ACTION_PREFILLS = {
    HEAVY: "I'm having a really tough time right now.",
    RESET_60S: "I need a quick reset.",
    CHECK_IN: "",
};

async function registerForPushNotifications() {
    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#53ABB5",
        });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== "granted") return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return null;

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
}

async function setupNotificationCategories() {
    // 24h inactivity nudge
    await Notifications.setNotificationCategoryAsync("DAILY_CHECKIN", [
        { identifier: "HEAVY", buttonTitle: "Heavy", options: { opensAppToForeground: true } },
        { identifier: "OKAY", buttonTitle: "Okay", options: { opensAppToForeground: false } },
        { identifier: "GOOD", buttonTitle: "Good", options: { opensAppToForeground: false } },
        { identifier: "NOT_TODAY", buttonTitle: "Not today", options: { opensAppToForeground: false } },
    ]);

    // Risk window nudge
    await Notifications.setNotificationCategoryAsync("RISK_WINDOW", [
        { identifier: "RESET_60S", buttonTitle: "60s Reset", options: { opensAppToForeground: true } },
        { identifier: "CHECK_IN", buttonTitle: "Check In", options: { opensAppToForeground: true } },
        { identifier: "SNOOZE_1H", buttonTitle: "Snooze 1h", options: { opensAppToForeground: true } },
        { identifier: "TURN_OFF", buttonTitle: "Turn off", options: { opensAppToForeground: true } },
    ]);
}

async function handleNotificationAction(actionIdentifier, notificationData, userId) {
    switch (actionIdentifier) {
        case "HEAVY":
        case "RESET_60S":
        case "CHECK_IN":
            router.push({
                pathname: "/(tabs)/chat",
                params: { prefillMessage: ACTION_PREFILLS[actionIdentifier] ?? "" },
            });
            break;

        case "SNOOZE_1H":
            if (userId) {
                await axios
                    .post(`${API_URL}/api/notifications/snooze`, { user_id: userId, hours: 1 })
                    .catch(() => {});
            }
            break;

        case "TURN_OFF": {
            const type = notificationData?.type === "RISK_WINDOW" ? "risk_window" : "inactivity";
            if (userId) {
                await axios
                    .post(`${API_URL}/api/notifications/disable`, { user_id: userId, type })
                    .catch(() => {});
            }
            break;
        }

        default:
            // Plain tap (no action button) — open chat
            if (notificationData?.type) {
                router.push({ pathname: "/(tabs)/chat", params: { prefillMessage: "" } });
            }
    }
}

export default function RootLayout() {
    const [loaded, error] = useFonts({
        ShadowsIntoLight: ShadowsIntoLight_400Regular,
        Questrial: Questrial_400Regular,
        BioRhyme: BioRhyme_400Regular,
    });

    const responseListener = useRef();

    useEffect(() => {
        const initApp = async () => {
            try {
                // Clear session for privacy - user must log in each time
                await AsyncStorage.multiRemove(["user", "authToken"]);

                // Register for push notifications and save token
                const token = await registerForPushNotifications();
                if (token) {
                    await AsyncStorage.setItem("pushToken", token);
                }

                // Set up notification action categories
                await setupNotificationCategories();
            } catch (e) {
                console.error("Init error:", e);
            }
        };

        initApp();

        // Handle notification action button taps
        responseListener.current = Notifications.addNotificationResponseReceivedListener(
            async (response) => {
                const { actionIdentifier, notification } = response;
                const data = notification?.request?.content?.data;
                const userStr = await AsyncStorage.getItem("user").catch(() => null);
                const userId = userStr ? JSON.parse(userStr)?.id : null;
                await handleNotificationAction(actionIdentifier, data, userId);
            }
        );

        return () => {
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }
        };
    }, []);

    useEffect(() => {
        if (loaded || error) {
            SplashScreen.hideAsync();
        }
    }, [loaded, error]);

    if (!loaded && !error) {
        return null;
    }

    return (
        <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
    );
}
