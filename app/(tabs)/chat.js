import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Modal } from 'react-native';
import { Send, Loader, Download, ChevronDown, ChevronUp, RefreshCw, Trash2, X } from 'lucide-react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://gracie-backend.onrender.com';

export default function ChatScreen() {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [hasStarted, setHasStarted] = useState(false);
    const [showWelcomePopup, setShowWelcomePopup] = useState(false);
    const [userConsented, setUserConsented] = useState(false);
    const [sessionId, setSessionId] = useState(null);
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

            // load existing local session id if present
            const storedSession = await AsyncStorage.getItem('chat_session_id');
            if (storedSession) setSessionId(storedSession);

            // Check if this is the first time accessing chat
            const chatWelcomeShown = await AsyncStorage.getItem('chatWelcomeShown');
            const savedHistory = await AsyncStorage.getItem('chatHistory');

            if (!chatWelcomeShown) {
                setShowWelcomePopup(true);
                await AsyncStorage.setItem('chatWelcomeShown', 'true');
                setMessages([]);
            } else if (savedHistory) {
                // Returning user with saved history
                const history = JSON.parse(savedHistory);
                setUserConsented(true);
                const welcomeBackMessage = {
                    id: Date.now(),
                    sender: 'gracie',
                    text: `Hi ${currentUser.name || 'Friend'}, welcome back, how can I help?`,
                    timestamp: new Date().toISOString(),
                };
                const finalMessages = [...history, welcomeBackMessage];
                setMessages(finalMessages);
                setHasStarted(true);
            } else if (chatWelcomeShown) {
                // Returning user with no saved history
                const welcomeBackMessage = {
                    id: Date.now(),
                    sender: 'gracie',
                    text: `Hi ${currentUser.name || 'Friend'}, welcome back, how can I help?`,
                    timestamp: new Date().toISOString(),
                };
                setMessages([welcomeBackMessage]);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const clearChat = async () => {
        try {
            await AsyncStorage.removeItem('chatHistory');
            await AsyncStorage.removeItem('chat_session_id');
            setSessionId(null);
            setMessages([]);
            setHasStarted(false);

            // Re-load to get welcome back message
            const userStr = await AsyncStorage.getItem('user');
            const currentUser = userStr ? JSON.parse(userStr) : { name: 'Friend' };

            const welcomeBackMessage = {
                id: Date.now(),
                sender: 'gracie',
                text: `Hi ${currentUser.name || 'Friend'}, welcome back, how can I help?`,
                timestamp: new Date().toISOString(),
            };
            setMessages([welcomeBackMessage]);
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        } catch (e) {
            console.error('Error clearing chat:', e);
        }
    };

    const generateSessionId = () => 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2,9);

    const beginChat = async () => {
        try {
            await AsyncStorage.removeItem('chatHistory');
            const newSession = generateSessionId();
            await AsyncStorage.setItem('chat_session_id', newSession);
            setSessionId(newSession);
            setMessages([]);
            setHasStarted(true);
            setShowWelcomePopup(false);
        } catch (e) {
            console.error('Error beginning chat:', e);
        }
    }

    const handleSendMessage = async (text = inputMessage) => {
        if (!text.trim()) return;

        // Ensure we have an active session id
        let activeSession = sessionId;
        if (!activeSession) {
            activeSession = generateSessionId();
            await AsyncStorage.setItem('chat_session_id', activeSession);
            setSessionId(activeSession);
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
            const payload = { message: text, user_id: user?.id, session_id: activeSession };
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            console.debug('Chat request:', { url: `${API_URL}/api/chat/message`, payload, headers });
            const response = await axios.post(`${API_URL}/api/chat/message`, payload, { headers });
            console.debug('Chat response:', { status: response.status, data: response.data });

            const gracieMessage = {
                id: Date.now() + 1,
                sender: 'gracie',
                text: response.data?.response || "Sorry, I couldn't generate a reply right now.",
                timestamp: new Date().toISOString(),
            };

            const finalMessages = [...newMessages, gracieMessage];
            setMessages(finalMessages);
            if (userConsented) {
                await AsyncStorage.setItem('chatHistory', JSON.stringify(finalMessages));
            }
        } catch (error) {
            console.error('Chat error:', error);
            if (error.response) {
                console.error('Axios response error:', {
                    status: error.response.status,
                    data: error.response.data,
                    headers: error.response.headers,
                });
            } else if (error.request) {
                console.error('No response received, request info:', error.request);
            } else {
                console.error('Error message:', error.message);
            }
            console.error('Axios config:', error.config);

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
            {/* Welcome Popup Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={showWelcomePopup}
                onRequestClose={() => setShowWelcomePopup(false)}
            >
                <View className="flex-1 justify-center items-center bg-black/50 p-4">
                    <View className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-xl font-shadows text-primary flex-1">Welcome!</Text>
                            <TouchableOpacity onPress={() => setShowWelcomePopup(false)}>
                                <X size={24} color="#53ABB5" />
                            </TouchableOpacity>
                        </View>
                        
                        <Text className="text-base font-questrial text-gray-800 leading-relaxed mb-6">
                            Hi <Text className="font-bold">{user?.name || 'Friend'}</Text>, I'm Gracie, your faithful therapy trained chat support. We can talk anytime, I'm still here even at 3am or when you're feeling lonely. I will never judge or make you feel guilt or shame and I promise to keep your secrets. Is that ok?
                        </Text>
                        
                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                onPress={() => {
                                    setUserConsented(false);
                                    setShowWelcomePopup(false);
                                }}
                                className="flex-1 py-3 rounded-full items-center border-2 border-primary"
                            >
                                <Text className="text-primary font-biorhyme text-base">No</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    setUserConsented(true);
                                    setShowWelcomePopup(false);
                                }}
                                className="flex-1 bg-primary py-3 rounded-full items-center"
                            >
                                <Text className="text-white font-biorhyme text-base">Yes</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

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
                                className="bg-[#53ABB5]/10 py-2 px-6 self-start rounded-full border border-[#53ABB5]/20"
                            >
                                <Text className="text-[#53ABB5] font-biorhyme text-[11px]">Begin Chat</Text>
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
                            className={`bg-[#53ABB5] w-11 h-11 items-center justify-center rounded-full shadow-sm ${isLoading ? 'opacity-50' : ''}`}
                        >
                            <Send size={18} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
