import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Timer, Play, CheckCircle, Info, Clock, Plus } from 'lucide-react-native';

// LayoutAnimation is handled automatically in the New Architecture for basic transitions

const emotionOptions = [
    'Calm', 'Anxious', 'Excited', 'Frustrated', 'Sad', 'Angry',
    'Content', 'Worried', 'Hopeful', 'Restless', 'Tired', 'Alert'
];

const moduleContent = {
    1: {
        title: "Learning to Notice",
        duration: "15-20 min",
        intro: "The goal is simple: sit and notice. We're not trying to change anything, just noticing what's already there.",
        deepDive: "Mindfulness isn't about clearing your mind; it's about shifting your relationship with what's in it. When we rush to 'fix' a feeling or 'stop' a thought, we actually reinforce its power. \n\nResearch on the nervous system shows that simply 'noticing and naming' a sensation (e.g., 'I notice a tightness in my chest') can lower amygdala activation. This is the first step in moving from reactive habit to intuitive choice.",
        instructions: ["Sit comfortably and close your eyes.", "Spend 5 minutes in a 'Noticing' meditation.", "Log your thoughts, feelings, and sensations without judgment."],
        timer: 300 // 5 mins
    },
    2: {
        title: "Body Signals & Cues",
        duration: "15-20 min",
        intro: "Your body speaks before your mind does. Let's learn to listen to the physical sensations of stress and safety.",
        deepDive: "Dr. Bessel van der Kolk (The Body Keeps the Score) teaches that trauma and stress are stored in the body. Triggers often start as a physiological 'ping'—a sudden heat, a knot in the stomach, or a shallow breath—seconds before we even realize we're stressed. \n\nBy mapping these sensations, you build an early-warning system. This allows your intuition to step in before the 'downstairs brain' takes over.",
        instructions: ["Perform a progressive body scan.", "Identify 'Hot Zones' where you store tension.", "Label the sensation specifically (pulsing, heavy, cold, sharp)."],
        timer: 300
    },
    5: {
        title: "Patterns & Triggers",
        duration: "20 min",
        intro: "Recovery is about spotting the 'if-then' patterns. If I feel X, then I want Y. Let's break the cycle.",
        deepDive: "Triggers are not just external events; they are internal interpretations. A trigger is a bridge between a current moment and a past pain. \n\nWhen we map a trigger, we move it from the dark of the 'unconscious' into the light of 'awareness'. We look for the Loop: Trigger -> Feeling -> Thought -> Habit. Our goal is to find the 'Choice Point' where intuition can offer a new path.",
        instructions: ["Identify a recurring trigger.", "Map the physical and mental response.", "Locate the 'Choice Point' for a different action."],
        timer: 420 // 7 mins
    },
    6: {
        title: "True Yes & True No",
        duration: "15-20 min",
        intro: "Honesty starts with yourself. Can you tell when your 'Yes' is actually a 'No' in disguise?",
        deepDive: "Intuition feels like a 'body lean'. A 'True Yes' often feels expansive, quiet, and grounded, even if it's difficult. A 'Faux Yes' (one born of people-pleasing or fear) often feels tight, urgent, or 'noisy' in the head. \n\nRecovery requires the courage to say a True No. Today we practice sensing that internal 'tilt' before you commit your energy to something.",
        instructions: ["Simulate a recent request.", "Notice the 'Initial Tilt' of your body.", "Practice the language of a True No."],
        timer: 300
    },
    // Adding fallbacks or placeholders for others
    3: { title: "Emotional Signals", duration: "20 min", intro: "Emotions are data, not directives.", deepDive: "Emotions are like weather patterns—they pass if we don't try to hold onto them.", instructions: ["Label a feeling.", "Find its location."], timer: 300 },
    4: { title: "Fear, Shame & Guilt", duration: "20 min", intro: "The 'Big Three' often drive relapse.", deepDive: "Shame dies when it is spoken in a safe space.", instructions: ["Speak the fear.", "Release the shame."], timer: 300 },
    7: { title: "Decision-Making", duration: "20 min", intro: "Intuition-led decisions feel different.", deepDive: "Clarity comes in the pause.", instructions: ["Practice the pause.", "Wait for the lean."], timer: 300 },
    8: { title: "Integration", duration: "25 min", intro: "Bringing it all together.", deepDive: "Self-leadership means trusting your internal anchor.", instructions: ["Reflect on progress.", "Set an intention."], timer: 300 }
};

export default function Module1Screen() {
    const { id } = useLocalSearchParams();
    const currentModule = moduleContent[id] || moduleContent[1];
    const router = useRouter();

    const [stage, setStage] = useState('setup'); // setup, deepDive, practice, analysis, insights
    const [timeRemaining, setTimeRemaining] = useState(300);
    const [timerActive, setTimerActive] = useState(false);

    // Module-specific exercise data
    const [triggerData, setTriggerData] = useState({ trigger: '', feeling: '', thought: '', choice: '' });
    const [intuitionData, setIntuitionData] = useState({ request: '', bodyResponse: '', intuitionSignal: '' });
    const [genericData, setGenericData] = useState({ sensations: '', mentalState: '', reflection: '' });
    const [bodyMap, setBodyMap] = useState({
        head: { active: false, sensation: '' },
        chest: { active: false, sensation: '' },
        stomach: { active: false, sensation: '' },
        arms: { active: false, sensation: '' },
        legs: { active: false, sensation: '' }
    });

    useEffect(() => {
        let interval = null;
        if (timerActive && timeRemaining > 0) {
            interval = setInterval(() => {
                setTimeRemaining((time) => time - 1);
            }, 1000);
        } else if (timeRemaining === 0 && timerActive) {
            setTimerActive(false);
            if (stage === 'deepDive') {
                Alert.alert("Deep Dive Complete", "You've completed the contemplation phase. Ready for practice?");
            } else if (stage === 'practice') {
                Alert.alert("Practice Complete", "Time is up. Let's analyze what you noticed.");
            }
        }
        return () => clearInterval(interval);
    }, [timerActive, timeRemaining, stage]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const startDeepDive = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setStage('deepDive');
        setTimeRemaining(300); // 5 mins for deep dive reflection/reading
        setTimerActive(true);
    };

    const startPractice = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setStage('practice');
        setTimeRemaining(currentModule.timer || 180);
        setTimerActive(true);
    };

    const renderSetup = () => (
        <View className="p-6">
            <View className="bg-primary/10 p-4 rounded-xl mb-6 flex-row items-center">
                <Timer size={20} color="#53ABB5" />
                <Text className="text-primary font-questrial ml-2">Total Time: {currentModule.duration}</Text>
            </View>

            <Text className="text-3xl font-shadows text-primary mb-4">Module {id}: {currentModule.title}</Text>

            <View className="space-y-4 mb-8">
                <Text className="text-gray-700 text-lg font-questrial leading-relaxed">
                    {currentModule.intro}
                </Text>

                <View className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                    <Text className="text-gray-800 mb-3 font-questrial text-lg">Practice Steps:</Text>
                    <View className="space-y-3">
                        {currentModule.instructions.map((step, i) => (
                            <View key={i} className="flex-row items-start mb-2">
                                <View className="bg-primary w-5 h-5 rounded-full items-center justify-center mr-3 mt-0.5">
                                    <Text className="text-white text-[10px] font-bold">{i + 1}</Text>
                                </View>
                                <Text className="text-gray-700 font-questrial flex-1">{step}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </View >

            <TouchableOpacity
                onPress={startDeepDive}
                className="bg-primary py-4 rounded-full flex-row justify-center items-center shadow-md active:opacity-70"
            >
                <Play size={20} color="white" className="mr-2" />
                <Text className="text-white font-biorhyme text-lg">Start Deep Dive</Text>
            </TouchableOpacity>
        </View>
    );

    const renderDeepDive = () => (
        <ScrollView className="p-6">
            <View className="flex-row items-center justify-between mb-8">
                <Text className="text-2xl font-shadows text-primary">Contemplation Phase</Text>
                <View className="flex-row items-center bg-primary/20 px-4 py-2 rounded-full">
                    <Clock size={18} color="#53ABB5" />
                    <Text className="text-primary font-bold ml-2">{formatTime(timeRemaining)}</Text>
                </View>
            </View>

            <View className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-8">
                <Info size={32} color="#53ABB5" className="mb-4" />
                <Text className="text-2xl font-shadows text-gray-800 mb-4">The Deep Dive</Text>
                <Text className="text-gray-700 font-questrial leading-relaxed text-lg mb-6">
                    {currentModule.deepDive}
                </Text>

                <View className="p-4 bg-primary/5 rounded-xl border-l-4 border-primary">
                    <Text className="text-gray-600 italic font-questrial">
                        "Notice the thoughts that arise as you read this. Don't chase them, just label them as 'thoughts' and return to the words."
                    </Text>
                </View>
            </View>

            <TouchableOpacity
                onPress={startPractice}
                className="bg-primary py-4 rounded-full items-center shadow-md mb-20"
            >
                <Text className="text-white font-biorhyme text-lg">Continue to Practice</Text>
            </TouchableOpacity>
        </ScrollView>
    );

    const renderPractice = () => {
        const isModule1or2 = id === '1' || id === '2';
        const isModule5 = id === '5';
        const isModule6 = id === '6';

        return (
            <View className="p-6">
                <View className="flex-row items-center justify-between mb-8">
                    <Text className="text-2xl font-shadows text-primary">Stage 2: Active Practice</Text>
                    <View className="flex-row items-center bg-primary px-4 py-2 rounded-full">
                        <Clock size={18} color="white" />
                        <Text className="text-white font-bold ml-2">{formatTime(timeRemaining)}</Text>
                    </View>
                </View>

                <ScrollView className="space-y-6 pb-20">
                    {/* Module 1 & 2: THE BODY RADAR */}
                    {isModule1or2 && (
                        <View className="items-center">
                            <Text className="text-gray-700 font-questrial mb-6 text-lg text-center font-bold">The Body Radar</Text>
                            <Text className="text-gray-500 font-questrial mb-8 text-center text-sm">Tap a region to map where you feel the sensation.</Text>

                            <View className="w-full max-w-[280px] bg-white rounded-3xl p-8 shadow-sm border border-gray-100 items-center">
                                <View className="gap-2 items-center w-full">
                                    <TouchableOpacity
                                        onPress={() => setBodyMap({ ...bodyMap, head: { ...bodyMap.head, active: !bodyMap.head.active } })}
                                        className={`w-16 h-16 rounded-full border-2 items-center justify-center ${bodyMap.head.active ? 'bg-primary border-primary shadow-lg' : 'bg-white border-gray-200'}`}
                                    >
                                        <Text className={`text-[10px] font-bold ${bodyMap.head.active ? 'text-white' : 'text-gray-400'}`}>HEAD</Text>
                                    </TouchableOpacity>
                                    <View className="w-1 h-4 bg-gray-100" />
                                    <View className="flex-row items-center gap-2">
                                        <TouchableOpacity
                                            onPress={() => setBodyMap({ ...bodyMap, arms: { ...bodyMap.arms, active: !bodyMap.arms.active } })}
                                            className={`w-12 h-24 rounded-full border-2 items-center justify-center ${bodyMap.arms.active ? 'bg-primary border-primary' : 'bg-white border-gray-200'}`}
                                        >
                                            <Text className={`text-[9px] font-bold -rotate-90 ${bodyMap.arms.active ? 'text-white' : 'text-gray-400'}`}>ARMS</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => setBodyMap({ ...bodyMap, chest: { ...bodyMap.chest, active: !bodyMap.chest.active } })}
                                            className={`w-28 h-28 rounded-2xl border-2 items-center justify-center ${bodyMap.chest.active ? 'bg-primary border-primary' : 'bg-white border-gray-200'}`}
                                        >
                                            <Text className={`text-[10px] font-bold ${bodyMap.chest.active ? 'text-white' : 'text-gray-400'}`}>CHEST</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => setBodyMap({ ...bodyMap, arms: { ...bodyMap.arms, active: !bodyMap.arms.active } })}
                                            className={`w-12 h-24 rounded-full border-2 items-center justify-center ${bodyMap.arms.active ? 'bg-primary border-primary' : 'bg-white border-gray-200'}`}
                                        >
                                            <Text className={`text-[9px] font-bold rotate-90 ${bodyMap.arms.active ? 'text-white' : 'text-gray-400'}`}>ARMS</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View className="w-1 h-2 bg-gray-100" />
                                    <TouchableOpacity
                                        onPress={() => setBodyMap({ ...bodyMap, stomach: { ...bodyMap.stomach, active: !bodyMap.stomach.active } })}
                                        className={`w-24 h-24 rounded-xl border-2 items-center justify-center ${bodyMap.stomach.active ? 'bg-primary border-primary' : 'bg-white border-gray-200'}`}
                                    >
                                        <Text className={`text-[10px] font-bold ${bodyMap.stomach.active ? 'text-white' : 'text-gray-400'}`}>CORE</Text>
                                    </TouchableOpacity>
                                    <View className="flex-row gap-4 mt-2">
                                        <TouchableOpacity
                                            onPress={() => setBodyMap({ ...bodyMap, legs: { ...bodyMap.legs, active: !bodyMap.legs.active } })}
                                            className={`w-12 h-32 rounded-full border-2 items-center justify-center ${bodyMap.legs.active ? 'bg-primary border-primary' : 'bg-white border-gray-200'}`}
                                        >
                                            <Text className={`text-[9px] font-bold -rotate-90 ${bodyMap.legs.active ? 'text-white' : 'text-gray-400'}`}>LEGS</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => setBodyMap({ ...bodyMap, legs: { ...bodyMap.legs, active: !bodyMap.legs.active } })}
                                            className={`w-12 h-32 rounded-full border-2 items-center justify-center ${bodyMap.legs.active ? 'bg-primary border-primary' : 'bg-white border-gray-200'}`}
                                        >
                                            <Text className={`text-[9px] font-bold rotate-90 ${bodyMap.legs.active ? 'text-white' : 'text-gray-400'}`}>LEGS</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>

                            <View className="w-full mt-8">
                                {Object.entries(bodyMap).filter(([_, v]) => v.active).map(([key, value]) => (
                                    <View key={key} className="bg-primary/5 p-4 rounded-2xl border border-primary/10 mb-3 flex-row items-center">
                                        <Text className="text-primary font-bold uppercase text-[10px] w-16">{key}</Text>
                                        <TextInput
                                            value={value.sensation}
                                            onChangeText={(text) => setBodyMap({ ...bodyMap, [key]: { ...bodyMap[key], sensation: text } })}
                                            placeholder={`Describe the feeling...`}
                                            className="flex-1 font-questrial text-sm"
                                        />
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Module 5: THE LOOP DECONSTRUCTOR */}
                    {isModule5 && (
                        <View className="space-y-6">
                            <Text className="text-gray-700 font-questrial mb-2 text-lg font-bold text-center">The Loop Deconstructor</Text>
                            <View className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                                <View className="flex-row items-center mb-4">
                                    <View className="w-8 h-8 rounded-full bg-red-100 items-center justify-center mr-3">
                                        <Text className="text-red-500 font-bold">1</Text>
                                    </View>
                                    <Text className="text-gray-800 font-bold">The Trigger</Text>
                                </View>
                                <TextInput
                                    value={triggerData.trigger}
                                    onChangeText={(text) => setTriggerData({ ...triggerData, trigger: text })}
                                    placeholder="What happened just before the urge?"
                                    className="bg-gray-50 p-4 rounded-xl font-questrial"
                                />
                            </View>

                            <View className="items-center py-2">
                                <Plus size={24} color="#53ABB5" />
                            </View>

                            <View className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                                <View className="flex-row items-center mb-4">
                                    <View className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center mr-3">
                                        <Text className="text-orange-500 font-bold">2</Text>
                                    </View>
                                    <Text className="text-gray-800 font-bold">The Brain-Body Ping</Text>
                                </View>
                                <TextInput
                                    value={triggerData.feeling}
                                    onChangeText={(text) => setTriggerData({ ...triggerData, feeling: text })}
                                    placeholder="What physical sensation hit you?"
                                    className="bg-gray-50 p-4 rounded-xl font-questrial"
                                />
                            </View>

                            <View className="items-center py-2">
                                <Plus size={24} color="#53ABB5" />
                            </View>

                            <View className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                                <View className="flex-row items-center mb-4">
                                    <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3">
                                        <Text className="text-blue-500 font-bold">3</Text>
                                    </View>
                                    <Text className="text-gray-800 font-bold">The Default Loop</Text>
                                </View>
                                <TextInput
                                    value={triggerData.thought}
                                    onChangeText={(text) => setTriggerData({ ...triggerData, thought: text })}
                                    placeholder="What is the old automatic thought?"
                                    className="bg-gray-50 p-4 rounded-xl font-questrial"
                                />
                            </View>
                        </View>
                    )}

                    {/* Module 6: THE SCENARIO LAB */}
                    {isModule6 && (
                        <View className="space-y-6">
                            <Text className="text-gray-700 font-questrial mb-2 text-lg font-bold text-center">The Scenario Lab</Text>
                            <View className="bg-white p-6 rounded-3xl shadow-sm border-2 border-primary/20">
                                <Text className="text-gray-500 text-xs font-bold mb-2 uppercase tracking-widest">Active Scenario</Text>
                                <Text className="text-gray-800 text-xl font-shadows mb-6">
                                    Someone asks you for a favor that you really don't want to do, but you feel guilty saying no.
                                </Text>

                                <Text className="text-gray-700 font-questrial mb-4 font-bold">Sense the 'Body Lean':</Text>
                                <View className="flex-row justify-between gap-2">
                                    {[
                                        { label: 'Tight/Noisy', val: 'Tight/Closed' },
                                        { label: 'Expansive/Quiet', val: 'Expansive/Open' }
                                    ].map((opt) => (
                                        <TouchableOpacity
                                            key={opt.val}
                                            onPress={() => setIntuitionData({ ...intuitionData, bodyResponse: opt.val })}
                                            className={`flex-1 p-4 rounded-2xl border-2 items-center ${intuitionData.bodyResponse === opt.val ? 'bg-primary border-primary' : 'bg-gray-50 border-gray-100'}`}
                                        >
                                            <Text className={`font-bold text-center ${intuitionData.bodyResponse === opt.val ? 'text-white' : 'text-gray-600'}`}>{opt.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View className="bg-primary/5 p-6 rounded-3xl border border-primary/10">
                                <Text className="text-primary font-bold mb-4">Gracie's Lab Note:</Text>
                                <Text className="text-gray-600 font-questrial italic">
                                    "A 'True No' often starts with a Tight/Noisy sensation in the solar plexus or throat. That's your integrity trying to speak."
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Generic logging for other modules */}
                    {!isModule1or2 && !isModule5 && !isModule6 && (
                        <View>
                            <View className="items-center py-10 bg-primary/5 rounded-3xl mb-6">
                                <Text className="text-4xl font-shadows text-primary mb-2">{formatTime(timeRemaining)}</Text>
                                <Text className="text-gray-500 font-questrial">Practice duration...</Text>
                            </View>
                            <View className="bg-gray-50 p-6 rounded-2xl border border-gray-200 mb-6">
                                <Text className="text-gray-800 font-questrial mb-2">Body Sensations:</Text>
                                <TextInput
                                    value={genericData.sensations}
                                    onChangeText={(text) => setGenericData({ ...genericData, sensations: text })}
                                    placeholder="e.g., heavy shoulders, cool air, stomach knot"
                                    className="bg-white border border-gray-200 rounded-xl px-4 py-3 font-questrial"
                                    multiline
                                />
                            </View>
                            <View className="bg-gray-50 p-6 rounded-2xl border border-gray-200 mb-6">
                                <Text className="text-gray-800 font-questrial mb-2">Mental State:</Text>
                                <TextInput
                                    value={genericData.mentalState}
                                    onChangeText={(text) => setGenericData({ ...genericData, mentalState: text })}
                                    placeholder="Busy, quiet, distracted, focused?"
                                    className="bg-white border border-gray-200 rounded-xl px-4 py-3 font-questrial"
                                />
                            </View>
                        </View>
                    )}

                    <TouchableOpacity
                        onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setStage('analysis'); }}
                        className="bg-primary py-4 rounded-full items-center shadow-md mb-10"
                    >
                        <Text className="text-white font-biorhyme text-lg">Continue to Analysis</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    };

    const renderAnalysis = () => {
        const isModule5 = id === '5';
        const isModule6 = id === '6';

        return (
            <ScrollView className="p-6">
                <Text className="text-2xl font-shadows text-primary mb-6">Stage 3: Deep Reflection</Text>

                {(id === '1' || id === '2') ? (
                    <View className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-8">
                        <Text className="text-xl font-shadows text-gray-800 mb-4">The Body Connection</Text>
                        <Text className="text-gray-700 font-questrial mb-6 leading-relaxed">
                            You mapped sensations in your <Text className="font-bold text-primary">{Object.entries(bodyMap).filter(([_, v]) => v.active).map(([k]) => k).join(', ')}</Text>.
                            What does this pattern tell you about where you hold your feelings?
                        </Text>
                        <TextInput
                            value={genericData.reflection}
                            onChangeText={(text) => setGenericData({ ...genericData, reflection: text })}
                            placeholder="I notice that I tend to feel tight in my..."
                            multiline
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-questrial h-32"
                            textAlignVertical="top"
                        />
                    </View>
                ) : isModule5 ? (
                    <View className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-8">
                        <Text className="text-xl font-shadows text-gray-800 mb-4">The Choice Point</Text>
                        <Text className="text-gray-700 font-questrial mb-6 leading-relaxed">
                            Given your trigger (<Text className="font-bold">{triggerData.trigger}</Text>) and the feeling in your body (<Text className="font-bold">{triggerData.feeling}</Text>), what is a different choice you can make next time?
                        </Text>
                        <TextInput
                            value={triggerData.choice}
                            onChangeText={(text) => setTriggerData({ ...triggerData, choice: text })}
                            placeholder="e.g., I will walk away, take 3 breaths, or call my sponsor."
                            multiline
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-questrial h-32"
                            textAlignVertical="top"
                        />
                    </View>
                ) : isModule6 ? (
                    <View className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-8">
                        <Text className="text-xl font-shadows text-gray-800 mb-4">Your 'True No'</Text>
                        <Text className="text-gray-700 font-questrial mb-6 leading-relaxed">
                            Since your body felt <Text className="font-bold">{intuitionData.bodyResponse}</Text>, practice writing out how you would say No with integrity.
                        </Text>
                        <TextInput
                            value={intuitionData.intuitionSignal}
                            onChangeText={(text) => setIntuitionData({ ...intuitionData, intuitionSignal: text })}
                            placeholder="e.g., 'Thank you for asking, but I don't have the capacity for this right now.'"
                            multiline
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-questrial h-32"
                            textAlignVertical="top"
                        />
                    </View>
                ) : (
                    <View className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-8">
                        <Text className="text-xl font-shadows text-gray-800 mb-4">Patterns Noticed</Text>
                        <TextInput
                            value={genericData.reflection}
                            onChangeText={(text) => setGenericData({ ...genericData, reflection: text })}
                            placeholder="What showed up in your body and mind? Any recurring loops?"
                            multiline
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-questrial h-48"
                            textAlignVertical="top"
                        />
                    </View>
                )}

                <TouchableOpacity
                    onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setStage('insights'); }}
                    className="bg-primary py-4 rounded-full items-center shadow-md mb-20"
                >
                    <Text className="text-white font-biorhyme text-lg">Generate Insights</Text>
                </TouchableOpacity>
            </ScrollView>
        );
    };

    const renderInsights = () => {
        const isModule5 = id === '5';
        const isModule6 = id === '6';

        return (
            <ScrollView className="p-6 pb-20">
                <View className="flex-row items-center mb-6">
                    <CheckCircle size={32} color="#53ABB5" />
                    <Text className="text-3xl font-shadows text-primary ml-3">Session Complete</Text>
                </View>

                <View className="bg-primary/10 p-6 rounded-2xl border-2 border-primary mb-6">
                    <Text className="text-gray-800 mb-2 font-shadows text-xl">Gracie's Summary</Text>
                    {(id === '1' || id === '2') ? (
                        <Text className="text-gray-700 font-questrial leading-relaxed">
                            Mapping your sensations in your {Object.entries(bodyMap).filter(([_, v]) => v.active).map(([k]) => k).join(' and ')} is a huge win. You are building 'Interoceptive Awareness'—the physical foundation of intuition.
                        </Text>
                    ) : isModule5 ? (
                        <Text className="text-gray-700 font-questrial leading-relaxed">
                            You've mapped your trigger loop for "{triggerData.trigger}". By identifying "{triggerData.feeling}" as an early signal, you've created space for your new Choice Point: "{triggerData.choice}". This is how you reclaim your power.
                        </Text>
                    ) : isModule6 ? (
                        <Text className="text-gray-700 font-questrial leading-relaxed">
                            In the scenario lab, you sensed a "{intuitionData.bodyResponse}" lean. Trusting that signal, even when it feels 'noisy', is how you build integrity. Your body is a compass—thank you for listening to it today.
                        </Text>
                    ) : (
                        <Text className="text-gray-700 font-questrial leading-relaxed">
                            You've completed your intuition practice. Every moment you spend 'noticing' builds the neurobiology of self-awareness. You are teaching your brain that it is safe to be present.
                        </Text>
                    )}
                </View>

                <View className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
                    <Text className="text-gray-800 mb-3 font-shadows text-lg text-primary">Next Steps</Text>
                    <Text className="text-gray-600 font-questrial text-sm leading-relaxed mb-4">
                        Consistency creates new neural pathways. I recommend reflecting on this session in your journal.
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.push('/(tabs)/journal')}
                        className="bg-[#A9ABAB] py-3 rounded-full items-center"
                    >
                        <Text className="text-white font-biorhyme text-sm">Reflect in Journal</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    onPress={() => router.replace('/(tabs)/training')}
                    className="bg-primary py-4 rounded-full items-center"
                >
                    <Text className="text-white font-biorhyme text-lg">Return to Training</Text>
                </TouchableOpacity>
            </ScrollView>
        );
    };

    return (
        <View className="flex-1 bg-white">
            <View className="flex-row items-center p-4 pt-12 bg-primary">
                <TouchableOpacity onPress={() => router.back()}>
                    <ChevronLeft size={24} color="white" />
                </TouchableOpacity>
                <Text className="flex-1 text-center font-shadows text-xl text-white">Module {id}</Text>
                <View className="w-6" />
            </View>
            <ScrollView className="flex-1">
                {stage === 'setup' && renderSetup()}
                {stage === 'deepDive' && renderDeepDive()}
                {stage === 'practice' && renderPractice()}
                {stage === 'analysis' && renderAnalysis()}
                {stage === 'insights' && renderInsights()}
            </ScrollView>
        </View>
    );
}
