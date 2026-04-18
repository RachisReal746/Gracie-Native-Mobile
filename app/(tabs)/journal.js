import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, Linking } from 'react-native';
import { Save, BookOpen, MessageCircle, Sparkles, Shield, Phone } from 'lucide-react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://192.168.0.20:3000';

export default function JournalScreen() {
    const [currentEntry, setCurrentEntry] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [entriesCount, setEntriesCount] = useState(0);
    const [previousSummary, setPreviousSummary] = useState('Start your first entry today.');
    const [user, setUser] = useState(null);
    const [latestInsight, setLatestInsight] = useState(null);
    const [reflectionPrompts, setReflectionPrompts] = useState([]);

    const allPrompts = [
        "What set me off today — even if it seems small or stupid?",
        "What moment stayed in my body longer than it should have?",
        "What did I want to say but didn't?",
        "What emotion showed up that I tried to push away?",
        "When did I feel dismissed, judged, or unseen?",
        "What did I replay in my head more than once today?",
        "What part of today made me feel unsafe, tense, or on edge?",
        "What boundary was crossed, ignored, or blurred?",
        "What am I pretending I'm 'fine' about?",
        "When did I listen to myself instead of overriding it?",
        "What felt real and honest instead of forced?",
        "Where did I show restraint, patience, or courage?"
    ];

    useEffect(() => {
        const initialize = async () => {
            const userData = await loadUser();
            await loadJournalData(userData?.id);
            const shuffled = [...allPrompts].sort(() => 0.5 - Math.random());
            setReflectionPrompts(shuffled.slice(0, 3));
        };
        initialize();
    }, []);

    const loadUser = async () => {
        try {
            const userStr = await AsyncStorage.getItem('user');
            let currentUser = userStr ? JSON.parse(userStr) : null;

            if (!currentUser || !currentUser.id) {
                let guestId = await AsyncStorage.getItem('guest_id');
                if (!guestId) {
                    guestId = 'guest_' + Date.now();
                    await AsyncStorage.setItem('guest_id', guestId);
                }
                currentUser = { id: guestId, name: 'Guest' };
                await AsyncStorage.setItem('user', JSON.stringify(currentUser));
            }
            setUser(currentUser);
            return currentUser;
        } catch (e) {
            console.error('Error loading user:', e);
            return null;
        }
    };

    const loadJournalData = async (userId = user?.id) => {
        if (!userId) return;

        try {
            let entries = [];
            // If guest, try to load from local storage first
            if (userId.startsWith('guest_')) {
                const localEntries = await AsyncStorage.getItem(`journal_entries_${userId}`);
                if (localEntries) {
                    entries = JSON.parse(localEntries);
                }
            }

            // Always try to fetch from API, merge or replace if needed
            // For now, if we have local entries and it's a guest, we primarily use those
            // but we still call the API to ensure the AI insight generation works
            try {
                const token = await AsyncStorage.getItem('authToken');
                const response = await axios.get(`${API_URL}/api/journal/entries/${userId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const apiEntries = response.data.entries || [];
                // Simple merge: if guest, local entries might be more complete
                if (userId.startsWith('guest_')) {
                    // Only add API entries that aren't already in local (by timestamp/content)
                    const existingContent = new Set(entries.map(e => e.content));
                    apiEntries.forEach(ae => {
                        if (!existingContent.has(ae.content)) {
                            entries.push(ae);
                        }
                    });
                    entries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                } else {
                    entries = apiEntries;
                }
            } catch (err) {
                console.log('API fetch failed, using local data if available');
            }

            setEntriesCount(entries.length);
            if (entries.length > 0) {
                setPreviousSummary(entries[0].content.substring(0, 100) + '...');
                // Load the latest insight if it exists
                if (entries[0].ai_insight) {
                    setLatestInsight(entries[0].ai_insight);
                }
            }
        } catch (e) {
            console.error('Load journal entries error:', e);
        }
    };

    const handleSaveEntry = async () => {
        if (!currentEntry.trim() || !user?.id) return;

        setIsLoading(true);
        setLatestInsight(null); // Reset for new entry

        try {
            const token = await AsyncStorage.getItem('authToken');
            const response = await axios.post(`${API_URL}/api/journal`, {
                content: currentEntry,
                user_id: user.id,
                mood: 3 // Default mood
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const savedEntry = response.data;

            // If guest, save to AsyncStorage as well
            if (user.id.startsWith('guest_')) {
                const localEntriesStr = await AsyncStorage.getItem(`journal_entries_${user.id}`);
                const localEntries = localEntriesStr ? JSON.parse(localEntriesStr) : [];
                localEntries.unshift(savedEntry);
                await AsyncStorage.setItem(`journal_entries_${user.id}`, JSON.stringify(localEntries));
            }

            if (savedEntry.ai_insight) {
                setLatestInsight(savedEntry.ai_insight);
            }

            Alert.alert("Success", "Entry saved successfully!");
            setCurrentEntry('');
            loadJournalData(user.id);
        } catch (error) {
            console.error('Journal save error:', error);
            Alert.alert("Error", "Could not save entry. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScrollView className="flex-1 bg-[#E9ECEF] p-4">
            {/* Header Banner */}
            <View className="bg-primary rounded-lg p-6 mb-6 shadow-sm mt-8 relative overflow-hidden">
                <View className="flex-1 pr-20">
                    <Text className="text-white text-2xl font-shadows mb-1">Interactive Smart Journal</Text>
                    <Text className="text-white text-sm font-questrial opacity-90">
                        This is your space to work through the tough stuff. Write freely, Gracie helps you notice what matters, without judgement.
                    </Text>
                </View>
                <Image
                    source={require('../../assets/journal_transparent.png')}
                    className="absolute -right-4 -bottom-4 w-32 h-32 opacity-30"
                    resizeMode="contain"
                />
            </View>

            {/* Prompts Section */}
            <View className="bg-white rounded-lg p-5 mb-6 shadow-sm border border-gray-100">
                <Text className="text-primary font-shadows text-lg mb-3">Reflection Prompts</Text>
                <View className="gap-2">
                    {reflectionPrompts.map((prompt, index) => (
                        <Text
                            key={index}
                            className="text-xs text-gray-700 font-questrial border-l-2 border-primary pl-3 leading-relaxed"
                        >
                            {prompt}
                        </Text>
                    ))}
                </View>
            </View>

            {/* Editor Section */}
            <View className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-100">
                <Text className="text-primary font-shadows text-2xl mb-4">Today's Entry</Text>
                <TextInput
                    value={currentEntry}
                    onChangeText={setCurrentEntry}
                    placeholder="Write what's true right now—no fixing, no filtering"
                    className="bg-white border border-gray-300 rounded-lg p-4 h-80 font-questrial text-sm"
                    multiline
                    textAlignVertical="top"
                />
                <TouchableOpacity
                    onPress={handleSaveEntry}
                    disabled={isLoading || !currentEntry.trim()}
                    className={`bg-[#A9ABAB] mt-6 py-4 rounded-sm flex-row justify-center items-center shadow-sm ${isLoading ? 'opacity-50' : ''}`}
                >
                    {isLoading ? <ActivityIndicator size="small" color="white" /> : (
                        <>
                            <Save size={20} color="white" />
                            <Text className="text-white font-biorhyme ml-2">Save Entry</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Latest Insight Section - Interactive Part */}
            {latestInsight && (
                <View className="bg-[#53ABB5]/10 rounded-lg p-6 mb-6 border border-[#53ABB5]/30">
                    <View className="flex-row items-center mb-3">
                        <Sparkles size={20} color="#53ABB5" />
                        <Text className="text-[#53ABB5] font-shadows text-xl ml-2">Gracie's Reflection</Text>
                    </View>
                    <Text className="text-gray-800 font-questrial leading-relaxed italic">
                        "{latestInsight}"
                    </Text>
                </View>
            )}

            {/* Journal Progress Section */}
            <View className="bg-white rounded-lg p-6 mb-10 shadow-sm border border-gray-100">
                <Text className="text-primary font-shadows text-2xl mb-4">Journal Progress</Text>
                <View className="mb-4">
                    <Text className="text-gray-800 font-questrial mb-1 text-sm">Summary of Previous Entry</Text>
                    <Text className="text-gray-600 text-[10px] font-questrial mt-1">{previousSummary}</Text>
                </View>
                <View>
                    <Text className="text-gray-800 font-questrial mb-1 text-sm">Total Entries</Text>
                    <Text className="text-4xl font-shadows text-primary">{entriesCount}</Text>
                </View>

                {/* Chat History Button Link */}
                <Link href="/(tabs)/chat" asChild>
                    <TouchableOpacity className="mt-6 border-2 border-[#A9ABAB] py-3 rounded-full flex-row justify-center items-center">
                        <MessageCircle size={20} color="#A9ABAB" />
                        <Text className="text-[#A9ABAB] font-biorhyme ml-2">View Chat History</Text>
                    </TouchableOpacity>
                </Link>
            </View>

            {/* Privacy Banner */}
            <View className="bg-[#E9ECEF] py-4 px-4 border-t border-gray-300">
                <View className="flex-row items-start gap-3 max-w-lg mx-auto">
                    <Shield size={24} color="#53ABB5" />
                    <View className="flex-1">
                        <Text className="text-base text-[#53ABB5] mb-1 font-shadows">
                            Your Privacy & Safety First
                        </Text>
                        <Text className="text-sm text-gray-700 font-questrial leading-relaxed">
                            All conversations are private and encrypted. We follow Australian Privacy Principles. Your recovery journey is secure with us.
                        </Text>
                    </View>
                </View>
            </View>

            {/* Crisis Support Banner */}
            <View className="bg-[#F6CEA7] py-4 px-4 border-t border-[#F8D1AB]">
                <View className="max-w-lg mx-auto">
                    <View className="flex-row items-center gap-3 mb-2">
                        <Phone size={24} color="#53ABB5" />
                        <Text className="text-base text-[#53ABB5] font-shadows">
                            24/7 Crisis Support
                        </Text>
                    </View>
                    <Text className="text-sm text-gray-700 mb-3 ml-9 font-questrial leading-relaxed">
                        If you're in immediate danger, please reach out to emergency services or crisis hotlines
                    </Text>
                    <View className="ml-9 flex-row flex-wrap items-center">
                        <Text className="text-gray-800 text-sm font-questrial">Emergency: </Text>
                        <TouchableOpacity onPress={() => Linking.openURL('tel:000')}>
                            <Text className="text-[#53ABB5] text-sm font-questrial">000</Text>
                        </TouchableOpacity>
                        <Text className="mx-2 text-gray-500">|</Text>
                        <Text className="text-gray-800 text-sm font-questrial">Lifeline: </Text>
                        <TouchableOpacity onPress={() => Linking.openURL('tel:131114')}>
                            <Text className="text-[#53ABB5] text-sm font-questrial">13 11 14</Text>
                        </TouchableOpacity>
                    </View>
                    <View className="ml-9 mt-1 flex-row items-center">
                        <Text className="text-gray-800 text-sm font-questrial">Beyond Blue: </Text>
                        <TouchableOpacity onPress={() => Linking.openURL('tel:1300224636')}>
                            <Text className="text-[#53ABB5] text-sm font-questrial">1300 22 4636</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <View className="h-20" />
        </ScrollView>
    );
}
