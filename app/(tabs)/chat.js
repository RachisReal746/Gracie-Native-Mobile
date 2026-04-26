import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Linking } from 'react-native';
import { Send, RefreshCw, Shield, Phone } from 'lucide-react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://192.168.0.20:3000';

export default function ChatScreen() {
    const { prefillMessage } = useLocalSearchParams();

    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [hasStarted, setHasStarted] = useState(false);
    const scrollViewRef = useRef(null);

    const promptSets = [
        [
            "You could share something you're proud of accomplishing recently.",
            "It might help to name one thing that feels heavy today.",
            "You're welcome to share what brought you here in this moment."
        ],
        [
            "You might reflect on a moment this week that brought you peace.",
            "If words are hard, even a single sentence is enough.",
            "You could share what's been sitting in the background of your thoughts lately."
        ]
    ];

    const [currentPrompts] = useState(promptSets[Math.floor(Math.random() * promptSets.length)]);

    useEffect(() => {
        loadUserAndHistory();
    }, []);

    useEffect(() => {
        if (prefillMessage && prefillMessage.trim()) {
            setInputMessage(prefillMessage);
        }
    }, [prefillMessage]);

    const loadUserAndHistory = async () => {
        try {
            const userStr = await AsyncStorage.getItem('user');
            let currentUser = userStr ? JSON.parse(userStr) : null;

            if (!currentUser || !currentUser.id) {
                let guestId = await AsyncStorage.getItem('guest_id');
                if (!guestId) {
                    guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    await AsyncStorage.setItem('guest_id', guestId);
                }
                const name = currentUser?.name || 'Friend';
                currentUser = { id: guestId, name: name };
                await AsyncStorage.setItem('user', JSON.stringify(currentUser));
            }
            setUser(currentUser);

            const pushToken = await AsyncStorage.getItem('pushToken');
            if (pushToken && currentUser.id) {
                axios.post(`${API_URL}/api/notifications/register`, {
                    user_id: currentUser.id,
                    push_token: pushToken,
                }).catch(() => {});
            }

            await AsyncStorage.removeItem('chatHistory');

            const hasSeenIntro = await AsyncStorage.getItem('hasSeenGracieIntro');
            if (!hasSeenIntro) {
                const introMessage = {
                    id: Date.now(),
                    sender: 'gracie',
                    text: `Hi I'm Gracie, your faithful therapy trained chat support. We can talk anytime. I'm still here even at 3am or when you're feeling lonely. I will never judge or make you feel guilt or shame and I promise to keep your secrets. I'm looking forward to getting to know you.`,
                    timestamp: new Date().toISOString(),
                };
                setMessages([introMessage]);
                await AsyncStorage.setItem('hasSeenGracieIntro', 'true');
            } else {
                setMessages([]);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const clearChat = async () => {
        try {
            await AsyncStorage.removeItem('chatHistory');
            setMessages([]);
            setHasStarted(false);
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        } catch (e) {
            console.error('Error clearing chat:', e);
        }
    };

    const handleSendMessage = async (text = inputMessage) => {
        if (!text.trim()) return;

        if (!hasStarted && text === 'Let\'s begin') {
            await AsyncStorage.removeItem('chatHistory');
        }

        const userMessage = {
            id: Date.now(),
            sender: 'user',
            text: text,
            timestamp: new Date().toISOString(),
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInputMessage('');
        setIsLoading(true);
        setHasStarted(true);

        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);

        try {
            const token = await AsyncStorage.getItem('authToken');
            const response = await axios.post(`${API_URL}/api/chat/message`, {
                message: text,
                user_id: user?.id,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const gracieMessage = {
                id: Date.now() + 1,
                sender: 'gracie',
                text: response.data.response,
                timestamp: new Date().toISOString(),
            };

            const finalMessages = [...newMessages, gracieMessage];
            setMessages(finalMessages);
            await AsyncStorage.setItem('chatHistory', JSON.stringify(finalMessages));

            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage = {
                id: Date.now() + 1,
                sender: 'gracie',
                text: "I'm having trouble connecting right now. Please try again.",
                timestamp: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
                    {/* Chat Header */}
                    <View className="bg-primary py-4 px-5 shadow-sm flex-row justify-between items-center relative overflow-hidden">
                        <View className="flex-1">
                            <Text className="text-2xl text-white mb-0.5 font-shadows">Chat with Gracie</Text>
                            <Text className="text-white text-[10px] font-questrial opacity-80">
                                Faithful support, anytime you need to connect.
                            </Text>
                        </View>
                        <Image
                            source={require('../../assets/chat_transparent.png')}
                            className="absolute -right-2 -bottom-2 w-16 h-16 opacity-30"
                            resizeMode="contain"
                        />
                        <TouchableOpacity
                            onPress={clearChat}
                            className="bg-white/10 p-2 rounded-full z-10"
                        >
                            <RefreshCw size={18} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Reflection Prompts */}
                    {!hasStarted && (
                        <View className="bg-white py-4 px-5 border-b border-gray-100">
                            <Text className="text-sm mb-3 text-primary font-shadows">Need a starting point?</Text>
                            <View className="gap-2.5 mb-4">
                                {currentPrompts.map((prompt, index) => (
                                    <View key={index} className="flex-row">
                                        <View className="w-1 bg-primary/20 mr-3 rounded-full" />
                                        <Text className="flex-1 text-[11px] text-gray-600 font-questrial leading-relaxed">
                                            {prompt}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                            <TouchableOpacity
                                onPress={() => handleSendMessage('Let\'s begin')}
                                className="bg-[#A9ABAB]/10 py-2 px-6 self-start rounded-full border border-[#A9ABAB]/20"
                            >
                                <Text className="text-[#A9ABAB] font-biorhyme text-[11px]">Begin Chat</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Messages */}
                    <ScrollView
                        ref={scrollViewRef}
                        style={{ flex: 1 }}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20 }}
                        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                        keyboardShouldPersistTaps="handled"
                    >
                        {messages.map((message) => (
                            <View
                                key={message.id}
                                className={`mb-4 max-w-[85%] rounded-2xl p-4 shadow-sm ${message.sender === 'user'
                                    ? 'bg-primary self-end rounded-tr-none'
                                    : 'bg-white self-start rounded-tl-none border border-gray-100'
                                    }`}
                            >
                                <Text className={`font-questrial text-[13px] leading-relaxed ${message.sender === 'user' ? 'text-white' : 'text-gray-800'}`}>
                                    {message.text}
                                </Text>
                                <View className="flex-row justify-end mt-1 opacity-60">
                                    <Text className={`text-[9px] ${message.sender === 'user' ? 'text-white' : 'text-gray-400'}`}>
                                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            </View>
                        ))}

                        {isLoading && (
                            <View className="bg-white self-start rounded-2xl rounded-tl-none p-3 shadow-sm mb-4 flex-row items-center border border-gray-100">
                                <ActivityIndicator size="small" color="#53ABB5" />
                                <Text className="ml-2 text-gray-400 text-[10px] font-questrial">Gracie is typing...</Text>
                            </View>
                        )}

                        {/* Privacy Banner */}
                        <View style={{ backgroundColor: '#E9ECEF', paddingVertical: 16, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#d1d5db', marginTop: 16, marginHorizontal: -16 }}>
                            <View className="flex-row items-start gap-3">
                                <Shield size={24} color="#53ABB5" />
                                <View className="flex-1">
                                    <Text className="text-base text-[#53ABB5] mb-1 font-shadows">Your Privacy & Safety First</Text>
                                    <Text className="text-sm text-gray-700 font-questrial leading-relaxed">
                                        All conversations are private and encrypted. We follow Australian Privacy Principles. Your recovery journey is secure with us.
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Crisis Banner */}
                        <View style={{ backgroundColor: '#F6CEA7', paddingVertical: 16, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#F8D1AB', marginHorizontal: -16 }}>
                            <View className="flex-row items-center gap-3 mb-2">
                                <Phone size={24} color="#53ABB5" />
                                <Text className="text-base text-[#53ABB5] font-shadows">24/7 Crisis Support</Text>
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
                    </ScrollView>

                    {/* Input Area */}
                    <View style={{ backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TextInput
                            value={inputMessage}
                            onChangeText={setInputMessage}
                            placeholder="Type a message..."
                            style={{ flex: 1, backgroundColor: '#f9fafb', borderRadius: 999, paddingHorizontal: 20, paddingVertical: 10, fontSize: 14, maxHeight: 100 }}
                            multiline
                        />
                        <TouchableOpacity
                            onPress={() => handleSendMessage()}
                            disabled={isLoading || !inputMessage.trim()}
                            style={{ backgroundColor: '#A9ABAB', width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 999, opacity: isLoading ? 0.5 : 1 }}
                        >
                            <Send size={18} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}