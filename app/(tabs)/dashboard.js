import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Share, Linking, Image, Modal, TextInput } from 'react-native';
import { MessageCircle, BookOpen, Brain, Sparkles, Info, Users, Copy } from 'lucide-react-native';
import { Link, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DashboardScreen() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [daysOfSobriety, setDaysOfSobriety] = useState(0);
    const [sobrietyStartDate, setSobrietyStartDate] = useState(null);
    const [currentFact, setCurrentFact] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [ideaModalVisible, setIdeaModalVisible] = useState(false);
    const [inputDate, setInputDate] = useState('');
    const [userIdea, setUserIdea] = useState('');

    const recoveryFacts = [
        'Recovery is a process, not an event. Most people require multiple attempts before achieving long-term sobriety.',
        'Physical exercise releases endorphins that can help reduce cravings and improve mood during recovery.',
        'Building a support network increases recovery success rates by up to 50%.',
        'Mindfulness and meditation practices can reduce relapse rates by helping manage triggers and stress.',
        'Sleep disturbances are common in early recovery. Establishing a consistent sleep routine supports healing.',
        'Proper nutrition helps repair the body and brain after substance use, improving mental clarity and energy.',
        'Journaling has been shown to improve emotional regulation and self-awareness in recovery.',
        'Approximately 75% of people in recovery report improved relationships with family and friends.',
        'The brain can heal and form new neural pathways even after years of substance use - a process called neuroplasticity.',
        'Gratitude practices have been linked to increased happiness and reduced depression in recovery.',
    ];

    const dailyVerse = '"I can do all things through Christ who strengthens me." - Philippians 4:13';

    useEffect(() => {
        loadData();
        setCurrentFact(recoveryFacts[Math.floor(Math.random() * recoveryFacts.length)]);
    }, []);

    const loadData = async () => {
        try {
            const userStr = await AsyncStorage.getItem('user');
            setUser(userStr ? JSON.parse(userStr) : { name: 'User' });

            const startDate = await AsyncStorage.getItem('sobrietyStartDate');
            if (startDate) {
                setSobrietyStartDate(startDate);
                calculateDays(startDate);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const calculateDays = (startDate) => {
        const start = new Date(startDate);
        const today = new Date();
        const diffTime = Math.abs(today - start);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        setDaysOfSobriety(diffDays);
    };

    const handleSetStartDate = () => {
        setInputDate('');
        setModalVisible(true);
    };

    const saveStartDate = async () => {
        // Parse DD-MM-YYYY
        const dateRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
        const match = inputDate.match(dateRegex);

        if (match) {
            const day = match[1];
            const month = match[2];
            const year = match[3];

            // Create YYYY-MM-DD string for parse/storage
            const isoDate = `${year}-${month}-${day}`;

            if (!isNaN(Date.parse(isoDate))) {
                await AsyncStorage.setItem('sobrietyStartDate', isoDate);
                setSobrietyStartDate(isoDate);
                calculateDays(isoDate);
                setModalVisible(false);
            } else {
                Alert.alert("Invalid Date", "Please enter a valid date");
            }
        } else {
            Alert.alert("Invalid Format", "Please use DD-MM-YYYY");
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: 'Join me on Gracie - Your recovery companion. Download the app today!',
            });
        } catch (error) {
            console.error(error.message);
        }
    };

    const handleLogout = async () => {
        try {
            await AsyncStorage.removeItem('user');
            // Add other cleanup keys if necessary
            router.replace('/');
        } catch (e) {
            console.error("Logout failed", e);
        }
    };

    const handleSendIdea = () => {
        if (!userIdea.trim()) {
            Alert.alert("Empty Idea", "Please share your idea before sending!");
            return;
        }

        const subject = "Gracie App Feedback - New Idea";
        const body = `Hi Rachael,\n\nI have an idea for the Gracie app:\n\n${userIdea}\n\nBest,\n${user?.name || 'A Gracie User'}`;
        const mailtoUrl = `mailto:rachael@anchoredbygrace.online?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        Linking.openURL(mailtoUrl).catch(() => {
            Alert.alert("Error", "Could not open mail app. Please email rachael@anchoredbygrace.online directly.");
        });

        setUserIdea('');
        setIdeaModalVisible(false);
    };

    return (
        <ScrollView className="flex-1 bg-[#E9ECEF] p-4">
            {/* Top Header - Logo and Logout */}
            {/* Web-Matched Header - Teal Branding */}
            <View className="bg-primary shadow-sm mb-6 pt-12 pb-4 -mx-4 -mt-4">
                <View className="flex-row justify-between items-center px-4">
                    <View className="flex-row items-center gap-3">
                        <Image
                            source={require('../../assets/logo.png')}
                            className="h-12 w-12"
                            resizeMode="contain"
                            style={{ tintColor: 'white' }}
                        />
                        <View>
                            <Text className="text-2xl text-white font-shadows">Gracie</Text>
                            <Text className="text-xs text-white/80 font-questrial">Your Recovery Support</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={handleLogout}
                        className="px-4 py-2 border border-white rounded-lg"
                    >
                        <Text className="text-white text-sm font-biorhyme">Logout</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Welcome Header */}
            <View className="mb-4">
                <Text className="text-3xl text-[#53ABB5] font-shadows mb-1">
                    Welcome {user?.name || 'User'}
                </Text>
                <Text className="text-sm text-gray-700 font-questrial leading-tight">
                    Let’s start with a chat, then I’ll help you with your Journal entry and guide you through todays training
                </Text>
            </View>

            {/* Bible Verse and Recovery Tracker Row - Strict Match */}
            <View className="flex-row justify-between items-start mb-4">
                {/* Bible Verse - LEFT - Elastic width */}
                <View className="flex-1 pt-1 mr-4">
                    <Text className="text-sm italic text-gray-600 font-questrial leading-relaxed">
                        {dailyVerse}
                    </Text>
                </View>

                {/* Recovery Tracker - RIGHT - Fixed width 100px */}
                <View className="bg-white rounded-lg shadow-sm p-2 items-center w-[100px]" style={{ elevation: 2 }}>
                    <View className="flex-col items-center mb-1">
                        <Sparkles size={12} color="#53ABB5" />
                        <Text className="text-[9px] text-[#53ABB5] font-shadows text-center leading-tight mt-1">Recovery Tracker</Text>
                    </View>
                    <View className="items-center mb-1">
                        <Text className="text-xl text-[#53ABB5] font-shadows mb-1">{daysOfSobriety}</Text>
                        <Text className="text-[9px] text-gray-600 font-questrial text-center leading-tight mb-1">Days of sobriety</Text>
                        {!sobrietyStartDate && (
                            <TouchableOpacity
                                onPress={handleSetStartDate}
                                className="bg-[#53ABB5] px-1 py-1 rounded w-full mt-1"
                            >
                                <Text className="text-white text-[9px] font-biorhyme text-center">Set Start Date</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            {/* Row 1: Chat, Journal, Training */}
            <View className="mb-4">
                {/* Chat Card */}
                <View className="bg-white p-4 rounded-lg shadow-sm mb-4 relative overflow-hidden" style={{ elevation: 2 }}>
                    <Image
                        source={require('../../assets/chat_transparent.png')}
                        className="absolute -top-4 -right-4 w-32 h-32 opacity-100"
                        resizeMode="contain"
                        style={{ tintColor: '#000000' }}
                    />
                    <View className="flex-row items-center mb-3">
                        <MessageCircle size={24} color="#53ABB5" />
                        <Text className="text-xl text-[#53ABB5] font-shadows ml-2">Chat with Gracie</Text>
                    </View>
                    <Text className="text-sm text-gray-700 font-questrial mb-4 leading-relaxed pr-20">
                        Chat anytime, always faithfully connected
                    </Text>
                    <Link href="/(tabs)/chat" asChild>
                        <TouchableOpacity className="bg-[#53ABB5] py-2 px-4 rounded transition-all w-full items-center">
                            <Text className="text-white font-biorhyme text-sm">How can I help?</Text>
                        </TouchableOpacity>
                    </Link>
                </View>

                {/* Journal Card */}
                <View className="bg-white p-4 rounded-lg shadow-sm mb-4 relative overflow-hidden" style={{ elevation: 2 }}>
                    <Image
                        source={require('../../assets/journal_transparent.png')}
                        className="absolute -top-4 -right-4 w-32 h-32 opacity-100"
                        resizeMode="contain"
                        style={{ tintColor: '#000000' }}
                    />
                    <View className="flex-row items-center mb-3">
                        <BookOpen size={24} color="#53ABB5" />
                        <Text className="text-xl text-[#53ABB5] font-shadows ml-2">Interactive Journal</Text>
                    </View>
                    <Text className="text-sm text-gray-700 font-questrial mb-4 leading-relaxed pr-20">
                        Your triumphs celebrated, your disappointments discussed, supporting your reflection and review
                    </Text>
                    <Link href="/(tabs)/journal" asChild>
                        <TouchableOpacity className="bg-[#53ABB5] py-2 px-4 rounded transition-all w-full items-center">
                            <Text className="text-white font-biorhyme text-sm">Update Journal</Text>
                        </TouchableOpacity>
                    </Link>
                </View>

                {/* Training Card */}
                <View className="bg-white p-4 rounded-lg shadow-sm relative overflow-hidden" style={{ elevation: 2 }}>
                    <Image
                        source={require('../../assets/training_transparent.png')}
                        className="absolute -top-4 -right-4 w-32 h-32 opacity-100"
                        resizeMode="contain"
                        style={{ tintColor: '#000000' }}
                    />
                    <View className="flex-row items-center mb-3">
                        <Brain size={24} color="#53ABB5" />
                        <Text className="text-xl text-[#53ABB5] font-shadows ml-2">Intuition Training</Text>
                    </View>
                    <Text className="text-sm text-gray-700 font-questrial mb-4 leading-relaxed pr-20">
                        Developing your Intuition with daily exercises to trust your gut and make positive choices
                    </Text>
                    <Link href="/(tabs)/training" asChild>
                        <TouchableOpacity className="bg-[#53ABB5] py-2 px-4 rounded transition-all w-full items-center">
                            <Text className="text-white font-biorhyme text-sm">Explore</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>

            {/* Row 2: Insights, What's New, Refer */}
            <View className="mb-4">
                {/* Weekly Insights */}
                <View className="bg-white p-4 rounded-lg shadow-sm mb-4" style={{ elevation: 2 }}>
                    <Text className="text-xl text-[#53ABB5] font-shadows mb-3">Weekly Insights</Text>
                    <View className="mb-3">
                        <View className="mb-3">
                            <Text className="text-gray-800 text-sm font-questrial">Progress Highlight</Text>
                            <Text className="text-xs text-gray-600 font-questrial">You've maintained consistency for 7 days. Learning consistency is self-discipline!</Text>
                        </View>
                        <View>
                            <Text className="text-gray-800 text-sm font-questrial">Area to Focus</Text>
                            <Text className="text-xs text-gray-600 font-questrial">Evening hours show increased stress. Consider adding relaxation exercises.</Text>
                        </View>
                    </View>
                </View>

                {/* What's New */}
                <View className="bg-white p-4 rounded-lg shadow-sm mb-4" style={{ elevation: 2 }}>
                    <View className="flex-row items-center mb-3">
                        <Sparkles size={24} color="#53ABB5" />
                        <Text className="text-xl text-[#53ABB5] font-shadows ml-2">What's New?</Text>
                    </View>
                    <View className="mb-3">
                        <Text className="text-xs text-gray-700 font-questrial leading-relaxed mb-2">• New intuition training modules added</Text>
                        <Text className="text-xs text-gray-700 font-questrial leading-relaxed mb-2">• Enhanced journal prompts with AI insights</Text>
                        <Text className="text-xs text-gray-700 font-questrial leading-relaxed">• Daily Bible verses in Recovery Tracker</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => setIdeaModalVisible(true)}
                        className="bg-[#53ABB5] py-2 px-4 rounded transition-all w-full items-center"
                    >
                        <Text className="text-white font-biorhyme text-sm">Share Your Idea</Text>
                    </TouchableOpacity>
                </View>

                {/* Refer a Friend */}
                <View className="bg-white p-4 rounded-lg shadow-sm" style={{ elevation: 2 }}>
                    <View className="flex-row items-center mb-3">
                        <Users size={24} color="#53ABB5" />
                        <Text className="text-xl text-[#53ABB5] font-shadows ml-2">Refer a Friend</Text>
                    </View>
                    <Text className="text-xs text-gray-700 font-questrial mb-3 leading-relaxed">
                        Help someone you care about start their recovery journey with Gracie.
                    </Text>
                    <View>
                        <TouchableOpacity
                            onPress={handleShare}
                            className="bg-[#53ABB5] py-2 px-4 rounded transition-all w-full items-center flex-row justify-center mb-2"
                        >
                            <Copy size={16} color="white" className="mr-2" />
                            <Text className="text-white font-biorhyme text-sm">Copy Link</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleShare}
                            className="bg-[#53ABB5] py-2 px-4 rounded transition-all w-full items-center"
                        >
                            <Text className="text-white font-biorhyme text-sm">Share via SMS</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Recovery Facts Section - Match Web Layout (Plain text, no box?) - Web has it centered without box */}
            <View className="items-center pb-20 py-3">
                <View className="flex-row items-center justify-center gap-2 mb-2">
                    <Info size={20} color="#53ABB5" />
                    <Text className="text-lg text-[#53ABB5] font-shadows">Recovery Facts & Myth Busters</Text>
                </View>
                <Text className="text-xs text-gray-700 text-center font-questrial px-4 mb-2 leading-relaxed max-w-3xl">
                    {currentFact}
                </Text>
                <TouchableOpacity onPress={() => Linking.openURL('https://www.anchoredbygrace.online')} className="bg-[#53ABB5] py-2 px-6 rounded transition-all hover:bg-[#F6CEA7]">
                    <Text className="text-white font-biorhyme text-xs">Learn More</Text>
                </TouchableOpacity>
            </View>

            {/* Set Start Date Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View className="flex-1 justify-center items-center bg-black/50">
                    <View className="bg-white m-5 p-6 rounded-lg shadow-lg w-[85%]">
                        <Text className="text-xl text-[#53ABB5] font-shadows mb-4 text-center">Set Start Date</Text>
                        <Text className="text-xs text-gray-500 font-questrial mb-2">Format: DD-MM-YYYY</Text>
                        <TextInput
                            className="border border-gray-300 rounded p-2 mb-6 font-questrial text-base text-gray-800"
                            placeholder="DD-MM-YYYY"
                            placeholderTextColor="#9CA3AF"
                            value={inputDate}
                            onChangeText={setInputDate}
                            maxLength={10}
                            keyboardType="numbers-and-punctuation"
                        />
                        <View className="flex-row justify-end gap-4">
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                className="px-4 py-2"
                            >
                                <Text className="text-gray-600 font-biorhyme">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={saveStartDate}
                                className="bg-[#53ABB5] px-6 py-2 rounded"
                            >
                                <Text className="text-white font-biorhyme">Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            {/* Share Your Idea Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={ideaModalVisible}
                onRequestClose={() => setIdeaModalVisible(false)}
            >
                <View className="flex-1 justify-center items-center bg-black/50">
                    <View className="bg-white m-5 p-6 rounded-3xl shadow-lg w-[90%] max-w-[400px]">
                        <View className="flex-row items-center mb-4">
                            <Sparkles size={24} color="#53ABB5" />
                            <Text className="text-2xl text-[#53ABB5] font-shadows ml-2">Share Your Idea</Text>
                        </View>

                        <Text className="text-sm text-gray-600 font-questrial mb-4 leading-relaxed">
                            Have a suggestion to make Gracie even better? We'd love to hear it!
                        </Text>

                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-2xl p-4 font-questrial text-base text-gray-800 h-40"
                            placeholder="Type your idea here..."
                            placeholderTextColor="#9CA3AF"
                            value={userIdea}
                            onChangeText={setUserIdea}
                            multiline
                            textAlignVertical="top"
                        />

                        <View className="flex-row justify-end gap-3 mt-6">
                            <TouchableOpacity
                                onPress={() => { setIdeaModalVisible(false); setUserIdea(''); }}
                                className="px-6 py-3"
                            >
                                <Text className="text-gray-500 font-biorhyme">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSendIdea}
                                className="bg-primary px-8 py-3 rounded-full shadow-sm"
                            >
                                <Text className="text-white font-biorhyme">Send Idea</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView >
    );
}
