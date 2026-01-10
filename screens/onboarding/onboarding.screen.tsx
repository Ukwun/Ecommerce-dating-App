import { Dimensions, StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

export default function Onboardingscreen() {
        const handleGetStarted = () => {
            router.replace('/login');
        };
    return (
        <View style={[styles.container, { backgroundColor: '#f5f5f5' }]}> 
            <Image 
                source={require("../../assets/onboarding/onboarding.jpg")}
                style={styles.backgroundImage}
                resizeMode="cover"
            />
            {/* Overlay gradient for better text visibility */}
            <LinearGradient 
                colors={["transparent", "rgba(0,0,0,0.7)"]}
                style={[styles.overlay, { width: '100%', height: '100%', position: 'absolute', zIndex: 1 }]}
            />
            <View style={[styles.contentContainer, { zIndex: 2 }]}> 
                <Text style={styles.title}>Welcome to Marketplace</Text>
                <Text style={styles.subtitle}>
                    Buy and sell items with ease. Let's get started!
                </Text>
                <TouchableOpacity
                    style={[styles.button, { elevation: 3 }]}
                    onPress={handleGetStarted}
                >
                    <LinearGradient
                        colors={['#FF6B6B', '#4A66F0']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.buttonGradient, { width: '100%' }]}
                    >
                        <Text style={styles.buttonText}>Get Started</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    backgroundImage: {
        width,
        height,
        position: 'absolute',
        top: 0,
        left: 0,
        resizeMode: 'cover',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        height: height * 0.6,
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 50,
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 30,
        textAlign: 'center',
        opacity: 0.8,
    },
    subtitle: {
        fontSize: 16,
        color: '#FFFFFF',
        marginBottom: 30,
        textAlign: 'center',
        opacity: 0.8,
    },
    button: {
        width: '100%',
        marginTop: 20,
        borderRadius: 10,
        overflow: 'hidden',
    },
    buttonGradient: {
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },

});