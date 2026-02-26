import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Linking, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { MessageCircle, BookOpen, Brain, Shield, Phone, Mail, Lock, User, CheckCircle2, Info, Eye, EyeOff } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../src/services/api';

export default function HomeScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Auth Modals State
    const [loginModalVisible, setLoginModalVisible] = useState(false);
    const [signupModalVisible, setSignupModalVisible] = useState(false);

    // Login State
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showLoginPassword, setShowLoginPassword] = useState(false);

    // Signup State
    const [signupName, setSignupName] = useState('');
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPhone, setSignupPhone] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [showSignupPassword, setShowSignupPassword] = useState(false);
    const [legalConsent, setLegalConsent] = useState(false);
    const [phoneInfoModalVisible, setPhoneInfoModalVisible] = useState(false);
    const [phoneInfoAccepted, setPhoneInfoAccepted] = useState(false);

    const handleLogin = async () => {
        if (!loginEmail || !loginPassword) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        setLoading(true);
        try {
            const response = await authAPI.login(loginEmail, loginPassword);
            if (response.data.success) {
                await AsyncStorage.setItem('authToken', response.data.token);
                await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
                setLoginModalVisible(false);
                router.replace('/(tabs)/dashboard');
            } else {
                Alert.alert('Login Failed', response.data.error || 'Invalid credentials');
            }
        } catch (error) {
            console.error('Login error:', error);
            Alert.alert('Error', error.response?.data?.error || 'Could not connect to server');
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async () => {
        if (!signupName || !signupEmail || !signupPassword || !signupPhone) {
            Alert.alert('Error', 'Please fill in all fields, including your phone number');
            return;
        }
        if (!legalConsent) {
            Alert.alert('Error', 'You must agree to the Terms of Service and Privacy Policy');
            return;
        }
        if (!phoneInfoAccepted) {
            Alert.alert('Error', 'You must acknowledge the phone number collection policy');
            return;
        }

        setLoading(true);
        try {
            const response = await authAPI.signup({
                name: signupName,
                email: signupEmail,
                password: signupPassword,
                phoneNumber: signupPhone,
                legalConsent: legalConsent
            });
            if (response.data.success) {
                await AsyncStorage.setItem('authToken', response.data.token);
                await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
                setSignupModalVisible(false);
                router.replace('/(tabs)/dashboard');
            } else {
                Alert.alert('Signup Failed', response.data.error || 'Could not create account');
            }
        } catch (error) {
            console.error('Signup error:', error);
            Alert.alert('Error', error.response?.data?.error || 'Could not connect to server');
        } finally {
            setLoading(false);
        }
    };

    const features = [
        {
            icon: MessageCircle,
            title: 'Anytime Chat Support',
            description: 'Chat with Gracie 24/7 for personalised support, therapeutic guidance and Faithful connection.',
            bullets: [
                'Therapeutic conversations anytime',
                'Progress tracking and reflective insights',
                'Personalised coping strategies',
                'Track and analyse patterns in mood, triggers and locations'
            ],
            color: '#53ABB5',
            image: require('../assets/chat_transparent.png')
        },
        {
            icon: BookOpen,
            title: 'Smart Journaling',
            description: 'AI-powered journal analysis that reveals patterns and provides therapeutic prompts for deeper reflection.',
            bullets: [
                'Therapeutic reflective prompting',
                'Develops personal connection and support after each entry',
                'Unique follow up prompts, you\'re not invisible',
                'Guided writing, focused on your needs'
            ],
            color: '#F6CEA7',
            image: require('../assets/journal_transparent.png')
        },
        {
            icon: Brain,
            title: 'Intuition Training',
            description: 'Learn new skills and develop your intuition so you can recognise and trust your instincts before triggers get too overwhelming.',
            bullets: [
                'Daily mindfulness exercises',
                'Training to focus on physiological responses and warning signs',
                'Quizzes and puzzles to increase awareness',
                'Adaptive real-time notifications, distraction when you need it most'
            ],
            color: '#53ABB5',
            image: require('../assets/training_transparent.png')
        }
    ];

    return (
        <SafeAreaView className="flex-1 bg-[#E9ECEF]" edges={['top']}>
            <ScrollView className="flex-1 bg-white">
                {/* 1. Grey banner at top with Logo and Login/Sign Up buttons - Strict Web Match */}
                <View className="bg-[#E9ECEF] py-3 px-4 border-b border-gray-300">
                    <View className="flex-row justify-between items-start">
                        <Image
                            source={require('../assets/logo.png')}
                            className="h-20 w-20"
                            resizeMode="contain"
                        />
                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                onPress={() => setLoginModalVisible(true)}
                                className="px-6 py-2 bg-[#A9ABAB] rounded w-28 h-10 items-center justify-center"
                            >
                                <Text className="text-white text-xs font-biorhyme">Log In</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setSignupModalVisible(true)}
                                className="px-6 py-2 bg-[#A9ABAB] rounded w-26 h-10 items-center justify-center"
                            >
                                <Text className="text-white text-xs font-biorhyme">Sign Up</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* 2. Trust indicators - Strict Web Match */}
                <View className="bg-[#E9ECEF] py-2 px-4">
                    <View className="flex-row justify-center gap-3">
                        <View className="items-center gap-0.5">
                            <Text className="text-[#53ABB5] font-shadows text-sm">24/7</Text>
                            <Text className="text-gray-600 font-questrial text-[10px]">Always Available</Text>
                        </View>
                        <View className="items-center gap-0.5">
                            <Text className="text-[#53ABB5] font-shadows text-sm">Personalised</Text>
                            <Text className="text-gray-600 font-questrial text-[10px]">Just For You</Text>
                        </View>
                        <View className="items-center gap-0.5">
                            <Text className="text-[#53ABB5] font-shadows text-sm">Private</Text>
                            <Text className="text-gray-600 font-questrial text-[10px]">Your Safe Space</Text>
                        </View>
                    </View>
                </View>

                {/* 3. Heading section - Strict Web Match */}
                <View className="bg-[#53ABB5] py-6 px-4 items-center justify-center">
                    <Text className="text-6xl text-white font-shadows text-center mb-2">Gracie</Text>
                    <Text className="text-2xl text-white font-shadows text-center">Your #1 Recovery Companion</Text>
                </View>

                {/* 4. Faithful Connection section - Strict Web Match */}
                <View className="bg-white py-6 px-4 pb-2">
                    <Text className="text-2xl font-shadows text-[#53ABB5] text-center mb-2">Faithful Connection in recovery</Text>
                    <Text className="text-base text-gray-700 font-questrial text-center leading-relaxed">
                        Welcome to the Virtual Therapy Hub with Tailored tools, Interactive journaling and a Faithful guide that learns and adapts to personalise your recovery steps
                    </Text>
                </View>

                {/* Features Section - Strict Web Match */}
                <View className="px-4 pb-6 bg-white">
                    <Text className="text-center mb-6 text-gray-700 font-questrial text-base">
                        Designed to connect, encourage, empower and embrace, the version of you that thrives, not survives.
                    </Text>

                    <View className="gap-3 mb-6">
                        {features.map((feature, index) => (
                            <View key={index} className="bg-white rounded-lg p-4 shadow-lg">
                                <View
                                    className="w-10 h-10 rounded-full items-center justify-center mb-3"
                                    style={{ backgroundColor: `${feature.color}20` }}
                                >
                                    <feature.icon size={20} color={feature.color} />
                                </View>

                                {feature.image && (
                                    <Image
                                        source={feature.image}
                                        className="absolute top-2 right-2 w-28 h-28"
                                        resizeMode="contain"
                                    />
                                )}

                                <Text className="text-lg font-shadows mb-2" style={{ color: feature.color }}>
                                    {feature.title}
                                </Text>

                                <Text className="text-gray-700 font-questrial text-xs mb-3">
                                    {feature.description}
                                </Text>

                                <View className="gap-1.5">
                                    {feature.bullets.map((bullet, i) => (
                                        <View key={i} className="flex-row items-start gap-2">
                                            <Text style={{ color: feature.color }}>•</Text>
                                            <Text className="text-gray-600 font-questrial text-xs flex-1">{bullet}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Privacy Banner - Strict Web Match */}
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

                {/* Crisis Support Banner - Strict Web Match */}
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
            </ScrollView>

            {/* Login Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={loginModalVisible}
                onRequestClose={() => setLoginModalVisible(false)}
            >
                <View className="flex-1 justify-center items-center bg-black/50 p-4">
                    <View className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-3xl font-shadows text-[#53ABB5]">Log In</Text>
                            <TouchableOpacity onPress={() => setLoginModalVisible(false)}>
                                <Text className="text-gray-400 text-lg">✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View className="space-y-4">
                            <View className="bg-gray-50 rounded-2xl p-4 flex-row items-center border border-gray-100">
                                <Mail size={20} color="#53ABB5" />
                                <TextInput
                                    className="flex-1 ml-3 font-questrial text-base text-gray-800"
                                    placeholder="Email Address"
                                    value={loginEmail}
                                    onChangeText={setLoginEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View className="bg-gray-50 rounded-2xl p-4 flex-row items-center border border-gray-100 mt-4">
                                <Lock size={20} color="#53ABB5" />
                                <TextInput
                                    className="flex-1 ml-3 font-questrial text-base text-gray-800"
                                    placeholder="Password"
                                    value={loginPassword}
                                    onChangeText={setLoginPassword}
                                    secureTextEntry={!showLoginPassword}
                                />
                                <TouchableOpacity onPress={() => setShowLoginPassword(!showLoginPassword)}>
                                    {showLoginPassword ? (
                                        <EyeOff size={20} color="#53ABB5" />
                                    ) : (
                                        <Eye size={20} color="#53ABB5" />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleLogin}
                            disabled={loading}
                            className="bg-primary mt-8 py-4 rounded-full items-center shadow-md"
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-biorhyme text-lg">Continue to Gracie</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity className="mt-4 items-center">
                            <Text className="text-gray-500 font-questrial">Forgot Password?</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Signup Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={signupModalVisible}
                onRequestClose={() => setSignupModalVisible(false)}
            >
                <View className="flex-1 justify-center items-center bg-black/50 p-4">
                    <ScrollView className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl max-h-[90%]">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-3xl font-shadows text-[#53ABB5]">Create Account</Text>
                            <TouchableOpacity onPress={() => setSignupModalVisible(false)}>
                                <Text className="text-gray-400 text-lg">✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View className="space-y-4">
                            <View className="bg-gray-50 rounded-2xl p-4 flex-row items-center border border-gray-100">
                                <User size={20} color="#53ABB5" />
                                <TextInput
                                    className="flex-1 ml-3 font-questrial text-base text-gray-800"
                                    placeholder="Full Name"
                                    value={signupName}
                                    onChangeText={setSignupName}
                                />
                            </View>

                            <View className="bg-gray-50 rounded-2xl p-4 flex-row items-center border border-gray-100 mt-4">
                                <Mail size={20} color="#53ABB5" />
                                <TextInput
                                    className="flex-1 ml-3 font-questrial text-base text-gray-800"
                                    placeholder="Email Address"
                                    value={signupEmail}
                                    onChangeText={setSignupEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View className="bg-gray-50 rounded-2xl p-4 flex-row items-center border border-gray-100 mt-4">
                                <Phone size={20} color="#53ABB5" />
                                <TextInput
                                    className="flex-1 ml-3 font-questrial text-base text-gray-800"
                                    placeholder="Phone Number"
                                    value={signupPhone}
                                    onChangeText={setSignupPhone}
                                    keyboardType="phone-pad"
                                    onFocus={() => {
                                        if (!phoneInfoAccepted) {
                                            setPhoneInfoModalVisible(true);
                                        }
                                    }}
                                />
                                <TouchableOpacity onPress={() => setPhoneInfoModalVisible(true)}>
                                    <Info size={18} color="#53ABB5" />
                                </TouchableOpacity>
                            </View>

                            <View className="bg-gray-50 rounded-2xl p-4 flex-row items-center border border-gray-100 mt-4">
                                <Lock size={20} color="#53ABB5" />
                                <TextInput
                                    className="flex-1 ml-3 font-questrial text-base text-gray-800"
                                    placeholder="Create Password"
                                    value={signupPassword}
                                    onChangeText={setSignupPassword}
                                    secureTextEntry={!showSignupPassword}
                                />
                                <TouchableOpacity onPress={() => setShowSignupPassword(!showSignupPassword)}>
                                    {showSignupPassword ? (
                                        <EyeOff size={20} color="#53ABB5" />
                                    ) : (
                                        <Eye size={20} color="#53ABB5" />
                                    )}
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                onPress={() => setLegalConsent(!legalConsent)}
                                className="flex-row items-start gap-3 mt-6"
                            >
                                <View className={`w-6 h-6 rounded border-2 ${legalConsent ? 'bg-[#53ABB5] border-[#53ABB5]' : 'border-gray-200'} items-center justify-center`}>
                                    {legalConsent && <CheckCircle2 size={16} color="white" />}
                                </View>
                                <Text className="flex-1 text-sm text-gray-600 font-questrial leading-tight">
                                    I agree to the Terms of Service and Privacy Policy, including how Gracie handles my sensitive data.
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={handleSignup}
                            disabled={loading}
                            className="bg-primary mt-8 py-4 rounded-full items-center shadow-md mb-6"
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-biorhyme text-lg">Join Gracie</Text>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>

            {/* Phone Info Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={phoneInfoModalVisible}
                onRequestClose={() => {
                    if (phoneInfoAccepted) setPhoneInfoModalVisible(false);
                }}
            >
                <View className="flex-1 justify-center items-center bg-black/70 p-4">
                    <View className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl">
                        <Text className="text-2xl font-shadows text-[#53ABB5] mb-4">
                            Why We Collect Your Phone Number
                        </Text>

                        <ScrollView className="max-h-80 mb-6">
                            <Text className="text-gray-700 font-questrial mb-4 leading-relaxed">
                                Your safety is our top priority. We collect your phone number for the following important reasons:
                            </Text>

                            <View className="gap-3">
                                {[
                                    { title: 'Emergency Response:', desc: "If you're in immediate danger or need urgent support, we can contact you or your emergency contacts." },
                                    { title: 'Trigger Word Detection:', desc: "If you use a trigger word during chat that indicates distress or crisis, we can reach out to ensure you're safe." },
                                    { title: 'Account Security:', desc: "To verify your identity and protect your account." },
                                    { title: 'Crisis Intervention:', desc: "To provide timely support when our AI detects you may need immediate help." }
                                ].map((item, i) => (
                                    <View key={i} className="flex-row items-start gap-2">
                                        <Text className="text-[#53ABB5]">•</Text>
                                        <Text className="text-sm font-questrial text-gray-700 flex-1">
                                            <Text className="font-bold">{item.title}</Text> {item.desc}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            <Text className="text-xs text-gray-500 italic mt-4 font-questrial leading-relaxed">
                                Your phone number is stored securely and will never be shared with third parties or used for marketing purposes.
                            </Text>
                        </ScrollView>

                        <TouchableOpacity
                            onPress={() => setPhoneInfoAccepted(!phoneInfoAccepted)}
                            className="flex-row items-center gap-3 mb-6"
                        >
                            <View className={`w-6 h-6 rounded border-2 ${phoneInfoAccepted ? 'bg-[#53ABB5] border-[#53ABB5]' : 'border-gray-200'} items-center justify-center`}>
                                {phoneInfoAccepted && <CheckCircle2 size={16} color="white" />}
                            </View>
                            <Text className="flex-1 text-sm text-gray-700 font-questrial">
                                I understand and accept why my phone number is being collected. *
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                                if (phoneInfoAccepted) {
                                    setPhoneInfoModalVisible(false);
                                } else {
                                    Alert.alert('Notice', 'You must accept the phone number collection policy to continue.');
                                }
                            }}
                            className={`py-4 rounded-full items-center shadow-md ${phoneInfoAccepted ? 'bg-[#53ABB5]' : 'bg-gray-300'}`}
                        >
                            <Text className="text-white font-biorhyme text-lg">Continue</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView >
    );
}
