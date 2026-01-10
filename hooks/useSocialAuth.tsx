import React from 'react';
import Toast from 'react-native-toast-message';

export default function useSocialAuth() {
    const showComingSoon = () => {
        Toast.show({ type: 'info', text1: 'Coming Soon!', text2: 'This feature is under development.' });
    };

    return {
        promptGoogle: showComingSoon,
        promptFacebook: showComingSoon,
        isGoogleLoading: false,
        isFacebookLoading: false,
        isPending: false,
    };
}