import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Link } from 'expo-router';
import { Brain } from 'lucide-react-native';

const modules = [
    {
        id: 1,
        title: "Learning to Notice",
        purpose: "Before intuition can guide decisions, you need to notice what's happening internally without rushing to change it.",
        exercise: "3 Signals in 3 Minutes: Notice 3 thoughts, 3 emotions, 3 body sensations without judgment."
    },
    {
        id: 2,
        title: "Body Signals & Nervous System Cues",
        purpose: "Your body signals safety, stress, and alignment before your mind explains it.",
        exercise: "Map the Reaction: Identify body zones where you felt sensations and label them."
    },
    {
        id: 3,
        title: "Emotional Signals vs Emotional Takeover",
        purpose: "Emotions carry information — but they don't have to hijack your decisions.",
        exercise: "What's the Message? Choose one strong emotion and explore what it's trying to tell you."
    },
    {
        id: 4,
        title: "Fear, Shame & Guilt — How They Distort Choice",
        purpose: "Fear, shame, and guilt often masquerade as intuition and push urgency.",
        exercise: "Who's Driving This Choice? Identify all drivers behind a current decision."
    },
    {
        id: 5,
        title: "Patterns, Triggers & Repeating Loops",
        purpose: "Intuition is clearer when patterns are recognized early.",
        exercise: "Build the Loop: Map a recurring situation from trigger to behavior."
    },
    {
        id: 6,
        title: "Learning Your 'True Yes' and 'True No'",
        purpose: "Not every yes is alignment, and not every no is avoidance. This module helps you feel the difference.",
        exercise: "Yes/No Simulation: Rate your body's response to saying yes vs no."
    },
    {
        id: 7,
        title: "Decision-Making from Clarity (Not Urgency)",
        purpose: "Urgency clouds intuition. Clarity arrives when there's space.",
        exercise: "Pause & Choose: Practice pausing before making a decision."
    },
    {
        id: 8,
        title: "Trust, Integration & Self-Leadership",
        purpose: "Intuition works best when paired with self-trust, not self-criticism.",
        exercise: "Evidence Collector: Log moments where you listened to yourself effectively."
    }
];

export default function TrainingScreen() {
    return (
        <ScrollView className="flex-1 bg-white">
            {/* Header Banner */}
            <View className="bg-primary py-6 px-6 pt-12 relative overflow-hidden">
                <View className="flex-1 pr-20">
                    <Text className="text-xl text-white mb-1 font-shadows">Intuition Training</Text>
                    <Text className="text-white text-xs font-questrial opacity-90 leading-relaxed">
                        Training your self-awareness so decisions and actions come from clarity and strength, not habit, pressure, fear or guilt
                    </Text>
                </View>
                <Image
                    source={require('../../assets/training_transparent.png')}
                    className="absolute -right-4 -bottom-4 w-32 h-32 opacity-30"
                    resizeMode="contain"
                />
            </View>

            {/* Modules Grid (Single column on mobile) */}
            <View className="p-4 gap-6 pb-20">
                {modules.map((module) => (
                    <View key={module.id} className="bg-white rounded-lg p-6 shadow-md border border-gray-100">
                        <Text className="text-xl text-primary font-shadows mb-2">Module {module.id}</Text>
                        <Text className="text-lg text-gray-800 mb-3 font-questrial leading-tight">{module.title}</Text>

                        <View className="mb-4">
                            <Text className="text-sm text-gray-700 font-questrial">
                                <Text className="text-primary">Purpose: </Text>
                                {module.purpose}
                            </Text>
                        </View>

                        <View className="mb-6 bg-gray-50 p-4 rounded border border-gray-200">
                            <Text className="text-xs text-gray-700 font-questrial italic leading-relaxed">
                                {module.exercise}
                            </Text>
                        </View>

                        <Link href={`/training/${module.id}`} asChild>
                            <TouchableOpacity className="bg-[#53ABB5] py-4 rounded-sm items-center shadow-sm">
                                <Text className="text-white font-biorhyme text-sm">Start Training</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}
