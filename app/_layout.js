import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { ShadowsIntoLight_400Regular } from "@expo-google-fonts/shadows-into-light";
import { Questrial_400Regular } from "@expo-google-fonts/questrial";
import { BioRhyme_400Regular } from "@expo-google-fonts/biorhyme";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import "../global.css";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [loaded, error] = useFonts({
        ShadowsIntoLight: ShadowsIntoLight_400Regular,
        Questrial: Questrial_400Regular,
        BioRhyme: BioRhyme_400Regular,
    });

    useEffect(() => {
        const clearSession = async () => {
            try {
                // Clear session for privacy - user must log in each time
                await AsyncStorage.multiRemove(['user', 'authToken']);
                console.log("Session cleared for privacy");
            } catch (e) {
                console.error("Failed to clear session", e);
            }
        };

        clearSession();
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
