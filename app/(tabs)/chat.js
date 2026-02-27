import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { Send, Loader, Download, ChevronDown, ChevronUp, RefreshCw, Trash2 } from 'lucide-react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://192.168.0.20:3000';

export default function ChatScreen() {
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

    const loadUserAndHistory = async () => {
        try {
            const userStr = await AsyncStorage.getItem('user');
            let currentUser = userStr ? JSON.parse(userStr) : null;

            // If no user or user has no ID, ensure we have a guest ID
            if (!currentUser || !currentUser.id) {
                let guestId = await AsyncStorage.getItem('guest_id');
                if (!guestId) {
                    guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    await AsyncStorage.setItem('guest_id', guestId);
                }

                // Preserve existing name if we have a user object but no ID
                const name = currentUser?.name || 'Friend';
                currentUser = { id: guestId, name: name };

                // Save this back to AsyncStorage so we persist the ID
                await AsyncStorage.setItem('user', JSON.stringify(currentUser));
            }
            setUser(currentUser);

            const savedHistory = await AsyncStorage.getItem('chatHistory');
            if (savedHistory) {
                const history = JSON.parse(savedHistory);

                // Add a welcome back message if the last message was a while ago
                const welcomeBackMessage = {
                    id: Date.now(),
                    sender: 'gracie',
                    text: `Welcome back, ${currentUser.name || 'Friend'}! I've missed our connection. Should we pick up where we left off?`,
                    timestamp: new Date().toISOString(),
                };

                const finalMessages = [...history, welcomeBackMessage];
                setMessages(finalMessages);
                setHasStarted(true);
            } else {
                const introMessage = {
                    id: Date.now(),
                    sender: 'gracie',
                    text: `Hi ${currentUser.name || 'Friend'}! I'm Gracie, your faithful therapy trained chat support. We can talk anytime, I'm still here even at 3am or when you're feeling lonely. I will never judge or make you feel guilt or shame and I promise to keep your secrets. Is that ok?`,
                    timestamp: new Date().toISOString(),
                };
                setMessages([introMessage]);
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

            // Re-load to get original intro message
            const userStr = await AsyncStorage.getItem('user');
            const currentUser = userStr ? JSON.parse(userStr) : { name: 'Friend' };

            const introMessage = {
                id: Date.now(),
                sender: 'gracie',
                text: `Hi ${currentUser.name || 'Friend'}! I'm Gracie, your faithful therapy trained chat support. We can talk anytime, I'm still here even at 3am or when you're feeling lonely. I will never judge or make you feel guilt or shame and I promise to keep your secrets. Is that ok?`,
                timestamp: new Date().toISOString(),
            };
            setMessages([introMessage]);
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        } catch (e) {
            console.error('Error clearing chat:', e);
        }
    };

    const handleSendMessage = async (text = inputMessage) => {
        if (!text.trim()) return;

        // If this is the starting point, maybe clear any old baggage first
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
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
            >
                <View className="flex-1 bg-gray-50">
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
                            title="Reset Session"
                        >
                            <RefreshCw size={18} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Reflection Prompts Section - Reverted to Vertical & Conditional */}
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

                    {/* Messages Container */}
                    <ScrollView
                        ref={scrollViewRef}
                        className="flex-1 px-4"
                        contentContainerStyle={{ paddingTop: 20, paddingBottom: 20 }}
                        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
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
                    </ScrollView>

                    {/* Input Area */}
                    <View className="bg-white px-4 py-3 border-t border-gray-100 flex-row items-center gap-3">
                        <TextInput
                            value={inputMessage}
                            onChangeText={setInputMessage}
                            placeholder="Type a message..."
                            className="flex-1 bg-gray-50 rounded-full px-5 py-2.5 font-questrial text-sm h-11"
                            multiline
                            maxHeight={100}
                        />
                        <TouchableOpacity
                            onPress={() => handleSendMessage()}
                            disabled={isLoading || !inputMessage.trim()}
                            className={`bg-[#A9ABAB] w-11 h-11 items-center justify-center rounded-full shadow-sm ${isLoading ? 'opacity-50' : ''}`}
                        >
                            <Send size={18} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
