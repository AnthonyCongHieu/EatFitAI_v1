import React, { useState } from 'react';
import { StyleSheet } from 'react-native';

import Screen from '../../components/Screen';
import { VoiceSheet } from '../../components/voice/VoiceSheet';
import { useAppTheme } from '../../theme/ThemeProvider';

/**
 * VoiceScreen - Full screen wrapper for Voice input
 * Automatically shows VoiceSheet when tab is focused
 */
const VoiceScreen = ({ navigation }: any): JSX.Element => {
    const { theme } = useAppTheme();
    const [showSheet, setShowSheet] = useState(true);

    const handleClose = () => {
        setShowSheet(false);
        // Navigate back to Home when sheet closes
        setTimeout(() => {
            navigation.navigate('HomeTab');
        }, 300);
    };

    return (
        <Screen contentContainerStyle={styles.container}>
            <VoiceSheet visible={showSheet} onClose={handleClose} />
        </Screen>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default VoiceScreen;
